import { readChat, validateChat, koreanDate, CANCEL_WORDS } from './chat-parser.js?v=2';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { baseline: '시작 전에 보였던 대화 · 자동 처리 제외', pending: '처리 대기', prepared: '저장 재시도 대기', held: '확인 필요', done: '완료', ignored: '제외' };

export function initChatBridge({ getStore, canWrite }) {
    const card = document.getElementById('chatCard');
    const note = document.getElementById('chatStatus');
    const list = document.getElementById('chatEvents');
    const controls = document.getElementById('chatControls');
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!local && location.origin !== 'https://gnu-naite.github.io') return;
    const api = local ? '/api/chat/' : 'http://127.0.0.1:5173/api/chat/';
    const connectButton = document.getElementById('chatConnect');
    connectButton.classList.toggle('hidden', local);
    let token, busy = false, enabled = false, configured = false, events = [];
    const options = () => ({ nickname: document.getElementById('chatNickname').value,
        top: Number(document.getElementById('chatTop').value), bottom: Number(document.getElementById('chatBottom').value) });
    async function post(path, body) {
        const response = await fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chat-Token': token }, body: JSON.stringify(body), credentials: 'omit' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '로컬 처리기에 연결하지 못했습니다.');
        return result;
    }
    async function finish(event, status, message) {
        await post('finish', { id: event.id, status, note: message });
        event.status = event.plan && status !== 'done' ? 'prepared' : status;
        event.note = message;
    }
    async function apply(event, result) {
        if (!canWrite() || getStore()?.mode !== 'cloud') throw new Error('베타의 관리자 로그인 또는 카톡 닉네임 연결이 필요합니다.');
        const plan = event.plan || result;
        if (plan.reason) throw new Error(plan.reason);
        await post('prepare', { id: event.id, plan });
        event.plan = plan;
        event.status = 'prepared';
        const outcome = await getStore().applyChat(event.id, plan);
        await finish(event, 'done', outcome);
    }
    function render() {
        // 입력 중인 확인 폼은 폴링으로 덮어쓰지 않습니다.
        if (list.contains(document.activeElement)) return;
        list.innerHTML = events.filter(e => e.status !== 'ignored').slice(-30).reverse().map(event => {
            const m = event.message;
            const result = readChat(m);
            const cancelling = result.action === 'cancel' || (!result.action && CANCEL_WORDS.test(m.text));
            const r = result.data || { date: m.sentDate || koreanDate(), userName: m.sender || '', purpose: /레슨/.test(m.text) ? '레슨' : /합주|추합/.test(m.text) ? '합주' : '기타' };
            const field = (label, name, type, value) => `<label class="field">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${name === 'date' ? 'required' : ''} ${name === 'teamName' ? 'maxlength="30"' : name === 'userName' ? 'maxlength="20"' : ''}></label>`;
            const pending = ['pending', 'held'].includes(event.status);
            return `<li data-chat-id="${event.id}"><div><strong>${escape(m.sender || '닉네임 확인 필요')}</strong> · ${escape(m.sentDate || `기본 날짜 ${koreanDate()}`)} ${escape(m.sentTime)}</div>
                <p class="chat-text">${escape(m.text)}</p><p>${labels[event.status]}${event.status === 'baseline' ? '' : ` — ${escape(event.note || result.reason || '')}`}</p>
                ${event.status === 'prepared' ? '<button type="button" class="secondary-btn" data-chat-action="retry">같은 작업 재시도</button>' : ''}
                ${pending ? `<details><summary>내용 확인 후 처리</summary><form class="chat-review">
                <label class="field">작업<select name="action"><option value="create" ${cancelling ? '' : 'selected'}>예약 추가</option><option value="cancel" ${cancelling ? 'selected' : ''}>예약 취소</option></select></label>
                ${field('예약 날짜', 'date', 'date', r.date)}${field('팀명', 'teamName', 'text', r.teamName)}${field('카톡 닉네임', 'userName', 'text', r.userName)}
                ${field('시작 (24시간제)', 'startTime', 'time', r.startTime)}${field('종료 (24시간제)', 'endTime', 'time', r.endTime)}
                <label class="field">사용 목적<select name="purpose"><option value="합주">합주</option><option value="레슨" ${r.purpose === '레슨' ? 'selected' : ''}>레슨</option><option value="기타" ${r.purpose === '기타' ? 'selected' : ''}>기타</option></select></label>
                <p>유형: 한 번만. 오전·오후가 없으면 24시간제로 읽고, 반은 30분입니다. 취소는 시간이 있으면 팀명 오타와 관계없이 날짜·시간으로 찾고, 없으면 날짜·팀명으로 한 건만 찾습니다. 새 예약은 겹치면 반려하고, 목적이 없으면 기타로 등록합니다. 수정은 예약 화면에서 직접 처리하세요.</p>
                <button class="primary-btn" type="submit">확인 후 처리</button></form></details>
                <button type="button" class="secondary-btn" data-chat-action="ignore">이 메시지 제외</button>` : ''}</li>`;
        }).join('') || '<li>인식 결과가 여기에 표시됩니다. 시작할 때 기존 대화는 건너뜁니다.</li>';
    }
    async function poll() {
        if (busy) return;
        busy = true;
        try {
            const response = await fetch(api + 'status', { credentials: 'omit' });
            if (!response.ok) throw new Error('로컬 OCR 처리기를 먼저 실행해 주세요.');
            const status = await response.json();
            token = status.token;
            controls.classList.remove('hidden');
            if (!configured) {
                for (const [id, value] of [['chatNickname', status.nickname], ['chatTop', status.top], ['chatBottom', status.bottom]]) document.getElementById(id).value = value;
                configured = true;
            }
            note.textContent = `${status.room} · ${status.note}${canWrite() ? '' : ' · 저장하려면 관리자 로그인 또는 카톡 닉네임 연결이 필요합니다.'}`;
            events = status.events;
            enabled = status.running;
            const startButton = controls.querySelector('[data-chat-control="start"]');
            startButton.disabled = status.running;
            startButton.textContent = status.running ? '자동 처리 중' : '새 메시지 자동 처리 시작';
            if (status.running && canWrite() && getStore()?.mode === 'cloud') {
                for (const event of events.filter(e => e.status === 'pending')) {
                    if (!enabled) break;
                    const result = readChat(event.message);
                    if (result.ignored) await finish(event, 'ignored', '예약 메시지 아님');
                    else if (result.reason) await finish(event, 'held', result.reason);
                    else {
                        try {
                            // 취소 대상을 서버의 최신 예약표에서 찾습니다.
                            const plan = await getStore().planChat(result);
                            if (!enabled) break;
                            if (plan.reason) await finish(event, 'held', plan.reason);
                            else await apply(event, plan);
                        } catch (error) {
                            await finish(event, 'held', error.message);
                        }
                    }
                }
            }
            const preview = document.getElementById('chatPreview');
            if (preview.closest('details').open) await showPreview();
            render();
            return true;
        } catch (error) {
            note.textContent = local ? error.message : '이 PC의 OCR 처리기를 실행하고 브라우저의 로컬 네트워크 접근을 허용해 주세요. 연결을 다시 시도할 수 있습니다.';
        } finally { busy = false; }
    }
    controls.addEventListener('click', async event => {
        const action = event.target.closest('[data-chat-control]')?.dataset.chatControl;
        if (!action) return;
        if (action === 'stop') {
            enabled = false;
            try { await post('control', { action }); note.textContent = '중지됨 — 이미 저장을 시작한 한 건은 완료될 수 있습니다.'; }
            catch (error) { note.textContent = error.message; }
            return;
        }
        if (busy) return;
        busy = true;
        try { await post('control', { action, ...options() }); }
        catch (error) { note.textContent = error.message; return; }
        finally { busy = false; }
        await poll();
    });
    async function showPreview() {
        const response = await fetch(api + 'preview', { credentials: 'omit' });
        if (!response.ok) return;
        const preview = document.getElementById('chatPreview');
        const previous = preview.src;
        preview.src = URL.createObjectURL(await response.blob());
        if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
    }
    card.querySelector('.chat-preview').addEventListener('toggle', async event => {
        if (event.target.open) {
            try { await showPreview(); } catch (error) { note.textContent = error.message; }
        }
    });
    list.addEventListener('click', async click => {
        const button = click.target.closest('[data-chat-action]');
        if (!button || busy) return;
        const event = events.find(e => e.id === button.closest('[data-chat-id]').dataset.chatId);
        busy = true;
        try {
            if (button.dataset.chatAction === 'ignore') await finish(event, 'ignored', '사용자가 제외함');
            else await apply(event, event.plan);
        } catch (error) { await finish(event, 'held', error.message); }
        finally { busy = false; }
        await poll();
    });
    list.addEventListener('submit', async submit => {
        submit.preventDefault();
        if (busy) return;
        const event = events.find(e => e.id === submit.target.closest('[data-chat-id]').dataset.chatId);
        const fields = Object.fromEntries(new FormData(submit.target));
        const { action, ...data } = fields;
        if (!data.startTime && !data.endTime) { delete data.startTime; delete data.endTime; }
        if (data.purpose === '레슨' && action === 'create') data.teamName = '레슨';
        busy = true;
        try {
            const checked = validateChat({ action, data });
            if (checked.reason) throw new Error(checked.reason);
            const plan = await getStore().planChat(checked);
            if (plan.reason) throw new Error(plan.reason);
            await apply(event, plan);
        } catch (error) { await finish(event, 'held', error.message); }
        finally { busy = false; }
        await poll();
    });
    let polling = false;
    async function connect() {
        const connected = await poll();
        if (!polling && (local || connected)) { setInterval(poll, 3000); polling = true; }
    }
    connectButton.addEventListener('click', connect);
    if (local) connect();
}
