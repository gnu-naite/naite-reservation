// 실제 예약표 대신 메모리에서 표기 조합과 실패 문구를 검증합니다.
import { mkdir, writeFile } from 'node:fs/promises';
import { readChat, planChat } from '../beta/chat-parser.js';

const now = Date.parse('2026-10-09T12:00:00+09:00');
const output = new URL('./kakao-bridge/.local/', import.meta.url);
const rows = [];
const seen = new Set();
const message = text => ({ text, sender: '김동하', sentDate: '2026-10-09', sentTime: '11:03', complete: true });
function check(group, text, expected, { reservations, metadata = {} } = {}) {
    const identity = JSON.stringify({ text, expected, reservations, metadata });
    if (seen.has(identity)) return;
    seen.add(identity);
    const parsed = readChat({ ...message(text), ...metadata }, now);
    const result = reservations ? planChat(parsed, reservations, now) : parsed;
    const state = result.ignored ? 'ignored' : result.reason ? 'held' : result.action;
    const actual = { state, ...(result.data || {}), ...(result.target ? { target: result.target.id } : {}) };
    const passed = Object.entries(expected).every(([key, value]) => actual[key] === value);
    rows.push({ group, text, passed, expected, actual, reason: result.reason || (result.ignored ? '예약·취소 키워드 없음' : '') });
}
const dates = [
    ['10월 11일', '2026-10-11'], ['10/11', '2026-10-11'], ['10.11', '2026-10-11'],
    ['10/11일', '2026-10-11'], ['11일', '2026-10-11'], ['10/11 일요일', '2026-10-11'],
    ['10.11(일)', '2026-10-11'], ['2026년 10월 11일', '2026-10-11'], ['2026-10-11', '2026-10-11'],
    ['오늘', '2026-10-09'], ['금일', '2026-10-09'], ['내일', '2026-10-10'], ['모레', '2026-10-11']
];
const times = [
    ['12~14', '12:00', '14:00'], ['12~14시', '12:00', '14:00'], ['12시~14시', '12:00', '14:00'],
    ['12:00~14:00', '12:00', '14:00'], ['12～14', '12:00', '14:00'], ['12〜14', '12:00', '14:00'],
    ['12∼14', '12:00', '14:00'], ['12-14', '12:00', '14:00'], ['12–14', '12:00', '14:00'],
    ['12—14', '12:00', '14:00'], ['12시부터14시까지', '12:00', '14:00'],
    ['11~12', '11:00', '12:00'], ['오후7~8', '19:00', '20:00'], ['07~08', '07:00', '08:00'],
    ['19:30~20:45', '19:30', '20:45'], ['밤11~오전1', '23:00', '01:00'], ['23~00', '23:00', '00:00'],
    ['7~8', '07:00', '08:00'], ['7 8', '07:00', '08:00'], ['7시 8시', '07:00', '08:00'],
    ['11~13', '11:00', '13:00'], ['12~1', '12:00', '01:00'], ['12시부터2시', '12:00', '02:00'],
    ['19시반~20시반', '19:30', '20:30'], ['19시반20시반', '19:30', '20:30'],
    ['19시 30분~20시 30분', '19:30', '20:30'], ['19:3020:30', '19:30', '20:30']
];
const teams = ['하이라이트', '범람', '맨드라미', 'far away', 'far away from the home', 'Far Away', '새벽 별', 'team A'];
const keywords = ['합주', '추합', '추가합주', '추가 합주'];
for (const [dateText, date] of dates) for (const [time, startTime, endTime] of times) {
    for (const teamName of teams) for (const keyword of keywords) {
        check('정상 예약 표기 조합', `${dateText} ${time} ${teamName} ${keyword} 하겠습니다`,
            { state: 'create', date, startTime, endTime, teamName, purpose: '합주', userName: '김동하', isNextDay: endTime < startTime });
    }
    for (const instrument of ['기타', '드럼', '보컬']) {
        check('악기 레슨', `${dateText} ${time} ${instrument}레슨 하겠습니다`,
            { state: 'create', date, startTime, endTime, teamName: '레슨', purpose: '레슨', isNextDay: endTime < startTime });
    }
    for (const team of ['', 'far away']) {
        check('목적 없는 기타 예약', `${dateText} ${time} ${team}`,
            { state: 'create', date, startTime, endTime, teamName: team || '기타', purpose: '기타', userName: '김동하', isNextDay: endTime < startTime });
    }
    const reservation = { id: 'time-match', date, startTime, endTime, teamName: '다른 팀명', userName: '다른 사람', purpose: '레슨' };
    check('시간 기준 취소', `${dateText} ${time} 범람 합주 취소`, { state: 'cancel', target: 'time-match' }, { reservations: [reservation] });
}
for (const [dateText, date] of dates) for (const teamName of teams) {
    const reservation = { id: 'team-match', date, startTime: '16:00', endTime: '17:00', teamName, purpose: '합주' };
    for (const name of [teamName, teamName.toUpperCase(), teamName.replace(/ /g, '  '), teamName.normalize('NFD')]) {
        check('날짜·팀명 취소', `${dateText} ${name} 합주 취소`, { state: 'cancel', target: 'team-match' }, { reservations: [reservation] });
    }
}
const fullName = 'far away from the home';
for (const text of [
    `10/11 11~12 ${fullName} 합주`, `10/11 11~12 far away\nfrom the home 추합`,
    `10/11 11~12 far   away from the home 추가 합주`, `${fullName} 10/11 합주 11~12`,
    `10/11 ${fullName} 11~12 합주`, `10/11 11~12 팀명: ${fullName} 합주`
]) check('영어 팀명·어순·줄바꿈', text, { state: 'create', date: '2026-10-11', startTime: '11:00', endTime: '12:00', teamName: fullName });

const reservations = [
    { id: 'overflow', date: '2026-10-11', startTime: '16:00', endTime: '17:00', teamName: '범람', purpose: '합주' },
    { id: 'english', date: '2026-10-11', startTime: '11:00', endTime: '12:00', teamName: 'far away', purpose: '합주' },
    { id: 'mandrake', date: '2026-10-11', startTime: '12:00', endTime: '14:00', teamName: '맨드라미', purpose: '합주' }
];
const held = [
    ['시간 오류', '10/11 25~26 범람 합주'],
    ['시간 오류', '10/11 19:60~20:00 범람 합주'], ['시간 오류', '10/11 12~12 범람 합주'],
    ['시간 오류', '10/11 23~24 범람 합주'], ['시간 표기 미지원', '10/11 19시에서20시 범람 합주'],
    ['수량은 시간 아님', '10/11 12~14명 레슨 취소'], ['수량은 시간 아님', '10/11 12~14 명 레슨 취소'],
    ['날짜 오류', '10/11 토요일 12~14 범람 합주'], ['날짜 오류', '2/30 12~14 범람 합주'],
    ['날짜 오류', '13/11 12~14 범람 합주'], ['날짜 오류', '10.110 12~14 범람 합주'],
    ['날짜 표기 미지원', '10 / 11 12~14 범람 합주'], ['날짜 표기 미지원', '10-11 12~14 범람 합주'],
    ['시간 없는 새 예약', '10/11 범람 합주'], ['날짜 누락', '12~14 범람 합주'],
    ['동시에 여러 예약', '10/11 12~14 범람 합주 10/12 16~17 맨드라미 합주'],
    ['동시에 여러 시간', '10/11 12~14, 16~17 범람 합주'],
    ['시간 없는 취소 팀명 누락', '10/11 합주 취소'], ['시간 없는 취소 팀명 누락', '10/11 레슨 취소'],
    ['불완전 취소 시간', '10/11 범람 합주 19시 취소'], ['불완전 취소 시간', '10/11 범람 합주 19~ 취소'],
    ['질문', '10/11 12~14 범람 합주 가능한가요?'], ['질문', '10/11 범람 합주 취소할까요?'],
    ['부정', '10/11 범람 합주 취소하지 않습니다'], ['부정', '10/11 범람 합주 취소 안 합니다'],
    ['부정', '10/11 범람 합주 취소가 아니에요'], ['수정은 화면에서', '10/11 범람 합주 시간 변경'],
    ['수정은 화면에서', '10/11 16~17 범람 합주를 17~18로 수정']
];
for (const [group, text] of held) check(group, text, { state: 'held' }, { reservations });
check('예약 키워드 없는 기타', '10/11 11~12 far away', { state: 'create', teamName: 'far away', purpose: '기타' });
check('팀명 없는 기타', '10/11 7 8', { state: 'create', teamName: '기타', purpose: '기타', startTime: '07:00', endTime: '08:00' });
check('기타 동일 구간 반려', '10/11 11~12', { state: 'held' }, { reservations });
check('기타 일부 겹침 반려', '10/11 10~12', { state: 'held' }, { reservations });
check('기타 일부 겹침 반려', '10/11 13~15', { state: 'held' }, { reservations });
check('기타 빈 구간 추가', '10/11 14~16', { state: 'create', purpose: '기타' }, { reservations });
check('잘린 OCR', '10/11 12~14 범람 합주', { state: 'held' }, { metadata: { complete: false } });
check('작성자 누락', '10/11 12~14 범람 합주', { state: 'held' }, { metadata: { sender: '' } });
check('OCR 날짜 오류', '10/11 12~14 범람 합주', { state: 'held' }, { metadata: { sentDate: '확인불가' } });
check('예약 시간 겹침', '10/11 11~12 far away 추합', { state: 'held' }, { reservations });
check('여러 팀 취소 미지원', '10/11 맨드라미, far away, 합주 취소', { state: 'held' }, { reservations });
check('팀명 오타', '10/11 faw away 합주 취소', { state: 'held' }, { reservations });
for (const name of ['faw away', 'far aawy from the home', '없는 팀']) {
    check('시간 일치 팀명 오타 취소', `10/11 11~12 ${name} 합주 취소`, { state: 'cancel', target: 'english' }, { reservations });
}
check('취소 날짜 불일치', '10/12 범람 합주 취소', { state: 'held' }, { reservations });
check('취소 시간 불일치', '10/11 16~18 범람 합주 취소', { state: 'held' }, { reservations });
check('같은 팀 여러 예약', '10/11 범람 합주 취소', { state: 'held' },
    { reservations: [...reservations, { ...reservations[0], id: 'second', startTime: '19:00', endTime: '20:00' }] });
check('같은 시간 여러 예약', '10/11 16~17 취소', { state: 'held' },
    { reservations: [...reservations, { ...reservations[0], id: 'duplicate' }] });
check('지난 새 예약', '금일 00~01 범람 합주', { state: 'held' }, { reservations: [] });

// 문법상 실행하면 안 되는 표현: 결과가 다르면 잠재적 오작동으로 보고합니다.
for (const text of [
    '10/11 범람 합주 안 취소합니다', '10/11 범람 합주 취소하지 마세요',
    '10/11 범람 합주 취소하지 마', '10/11 범람 합주 취소는 안 해요',
    '10/11 16~17 범람 합주 못합니다', '10/11 16~17 범람 합주 취소 예정일까요',
    '2027/10/11 12~14 레슨 하겠습니다', '2027.10.11 12~14 레슨 하겠습니다'
]) check('오작동 탐색', text, { state: 'held' });

for (const ending of [
    '취소 아님', '취소할 생각 없습니다', '취소할 필요 없습니다', '취소할 일 없습니다', '취소는 없어요',
    '취소하지 말아주세요', '취소할까', '취소해야 할까', '취소해도 돼', '취소해도 될까요',
    '안 함', '안 해', '안 했어요', '못해요', '예약하지 마세요', '예약하지 말아주세요',
    '예약 안 했습니다', '할까', '할 수 있을까요', '될까요', '어때', '예약해도 돼'
]) check('질문·부정·금지 어미 탐색', `10/11 16~17 범람 합주 ${ending}`, { state: 'held' });
for (const time of ['16~17명으로', '16~17명만', '16~17명씩', '16~17인분', '16~17시30', '16~17시 300분']) {
    check('수량·미완성 분 탐색', `10/11 ${time} 범람 합주 취소`, { state: 'held' });
}
check('명시 연도 탐색', '2027-10/11 16~17 레슨 하겠습니다', { state: 'held' });
check('시간 없는 부정 탐색', '10/11 범람 합주 취소할 생각 없습니다', { state: 'held' }, { reservations });
check('시간 없는 질문 탐색', '10/11 far away from the home 합주 취소할까', { state: 'held' },
    { reservations: [{ ...reservations[1], teamName: fullName }] });
for (const teamName of ['THE 16-17', 'Blink-182', 'The 1975']) {
    const name = teamName === 'The 1975' ? 'The   1975' : teamName;
    check('숫자·하이픈 팀명 취소', `10/11 ${name} 합주 취소`, { state: 'cancel', target: 'numbered-band' },
        { reservations: [...reservations, { id: 'numbered-band', date: '2026-10-11', startTime: '18:00', endTime: '19:00', teamName }] });
}
check('숫자 팀명 미일치 보호', '10/11 THE 16-17 합주 취소', { state: 'held' }, { reservations });
check('문장 앞 시간 우선', '10/11 16~17 범람 합주 취소', { state: 'cancel', target: 'overflow' },
    { reservations: [...reservations, { id: 'numeric-prefix', date: '2026-10-11', startTime: '18:00', endTime: '19:00', teamName: '16~17 범람' }] });
check('팀명 뒤 명시 시각 취소', '10/11 faw away 11시~12시 합주 취소', { state: 'cancel', target: 'english' }, { reservations });
check('팀명 뒤 숫자 시각 보류', '10/11 faw away 11~12 합주 취소', { state: 'held' }, { reservations });

const mismatches = rows.filter(row => !row.passed);
const summary = {
    total: rows.length, matchedExpected: rows.length - mismatches.length, mismatches: mismatches.length,
    actions: Object.fromEntries(['create', 'cancel', 'held', 'ignored'].map(state => [state, rows.filter(row => row.actual.state === state).length])),
    groups: Object.fromEntries([...new Set(rows.map(row => row.group))].map(group => [group, rows.filter(row => row.group === group).length]))
};
await mkdir(output, { recursive: true });
await writeFile(new URL('chat-variants-results.json', output), JSON.stringify({ summary, mismatches, rows }, null, 2));
const examples = rows.filter(row => !row.passed || ['held', 'ignored'].includes(row.actual.state));
await writeFile(new URL('chat-variants-report.txt', output), [
    '나이테 카톡 예약 문구 테스트 — 기준: 한국 시간 2026-10-09 12:00',
    '이 테스트는 OCR 이후 파서·예약 선택을 메모리에서 시험합니다. 실제 Firestore에는 쓰지 않습니다.',
    JSON.stringify(summary, null, 2), '', '보류·제외·기대와 다른 결과:',
    ...examples.map((row, i) => `${i + 1}. [${row.group}] ${row.text.replace(/\n/g, ' / ')}\n   기대: ${JSON.stringify(row.expected)}\n   실제: ${JSON.stringify(row.actual)}\n   이유: ${row.reason || '예약/취소로 해석됨'}${row.passed ? '' : ' — 기대와 다름'}`)
].join('\n'));
console.log(JSON.stringify({ ...summary, mismatchExamples: mismatches.slice(0, 5).map(({ text, actual, reason }) => ({ text, actual, reason })) }, null, 2));
if (mismatches.length) process.exitCode = 1;
