import assert from 'node:assert/strict';
import { initChatBridge } from '../beta/chat-bridge.js';

// 실제 브리지의 공유 페이지 연결·요청 주소·권한 대기를 가짜 DOM과 HTTP로 확인합니다.
function setup(origin, writable = false, fail = false) {
    const calls = [], timers = [], handlers = new Map(), hidden = new Set(['chatControls']);
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, { value: '', src: '', textContent: '', innerHTML: '',
            classList: { toggle: (_, hide) => hide ? hidden.add(id) : hidden.delete(id), remove: () => hidden.delete(id) },
            addEventListener: (event, fn) => handlers.set(`${id}:${event}`, fn),
            contains: () => false, closest: () => ({ open: false }),
            querySelector: selector => element(selector) });
        return elements.get(id);
    }
    globalThis.location = { origin, hostname: new URL(origin).hostname };
    globalThis.document = { getElementById: element, activeElement: null };
    globalThis.setInterval = fn => timers.push(fn);
    const event = { id: 'cancel-alias', status: 'pending', message: { text: '내일 범람 안해요', sender: '김동하', complete: true } };
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        if (fail) throw new TypeError('Failed to fetch');
        return { ok: true, json: async () => ({ token: 'test-token', room: 'asdf', note: '읽기 완료',
            running: true, nickname: '김동하', top: 78, bottom: 150, events: [event] }) };
    };
    let writes = 0;
    initChatBridge({ canWrite: () => writable, getStore: () => ({ mode: 'cloud',
        planChat: async result => { assert.equal(result.action, 'cancel'); return { action: 'cancel', target: { id: 'target' } }; },
        applyChat: async () => { writes++; return '취소 완료'; } }) });
    return { calls, timers, handlers, hidden, element, get writes() { return writes; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
let app = setup('https://gnu-naite.github.io');
assert.equal(app.calls.length, 0); // 다른 기기에서는 접속만으로 로컬 네트워크 권한을 요청하지 않습니다.
assert.equal(app.hidden.has('chatConnect'), false);
await app.handlers.get('chatConnect:click')();
assert.equal(app.calls[0].url, 'http://127.0.0.1:5173/api/chat/status');
assert.equal(app.hidden.has('chatControls'), false);
assert.equal(app.writes, 0);
assert.match(app.element('chatStatus').textContent, /관리자 로그인 또는 카톡/);
assert.match(app.element('chatEvents').innerHTML, /value="cancel" selected/);
await app.handlers.get('chatConnect:click')();
assert.equal(app.timers.length, 1);
app = setup('https://gnu-naite.github.io', true);
await app.handlers.get('chatConnect:click')();
assert.equal(app.writes, 1);
assert.deepEqual(app.calls.map(c => c.url), ['status', 'prepare', 'finish'].map(path => 'http://127.0.0.1:5173/api/chat/' + path));
assert.equal(app.calls[1].options.headers['X-Chat-Token'], 'test-token');
assert.equal(app.calls[2].options.credentials, 'omit');
app = setup('https://gnu-naite.github.io', false, true);
await app.handlers.get('chatConnect:click')();
assert.equal(app.timers.length, 0);
assert.equal(app.hidden.has('chatControls'), true);
assert.match(app.element('chatStatus').textContent, /로컬 네트워크 접근/);
assert.equal(app.element('chatConnect').disabled, false);
app = setup('https://gnu-naite.github.io');
let rejectConnection;
globalThis.fetch = () => new Promise((_, reject) => { rejectConnection = reject; });
const connecting = app.handlers.get('chatConnect:click')();
assert.equal(app.element('chatConnect').disabled, true);
assert.match(app.element('chatStatus').textContent, /연결 중/);
rejectConnection(new TypeError('접근 거부'));
await connecting;
assert.equal(app.element('chatConnect').disabled, false);
app = setup('http://localhost:5173');
await flush();
assert.equal(app.calls[0].url, '/api/chat/status');
assert.equal(app.hidden.has('chatConnect'), true);
assert.equal(app.timers.length, 1);
app = setup('https://evil.example');
await flush();
assert.equal(app.calls.length, 0);
assert.equal(app.timers.length, 0);
console.log('로컬·GitHub 공유 페이지 OCR 연결과 권한 검증 통과');
