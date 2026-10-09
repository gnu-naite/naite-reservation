import assert from 'node:assert/strict';
import { readChat, planChat, validDate, koreanDate, unchangedReservation } from '../beta/chat-parser.js';
const now = Date.parse('2026-10-09T12:00:00+09:00');
const message = text => ({ text, sender: '정현우', sentDate: '2026-10-09', sentTime: '11:03', complete: true });
const parse = text => readChat(message(text), now);
for (const time of ['16-17시', '16시 ~ 17시', '16시부터 17시까지', '16:00~17:00', '16~17']) {
    const r = parse(`14일 수 ${time} 하이라이트 합주임당`);
    assert.deepEqual(r.data, { date: '2026-10-14', teamName: '하이라이트', userName: '정현우', purpose: '합주', startTime: '16:00', endTime: '17:00', isNextDay: false });
}
for (const [time, expected] of [['오후 7~8시', '19:00'], ['오후 7~8', '19:00'], ['저녁 7시부터 8시까지', '19:00'], ['오전 7~8시', '07:00'], ['07:00~08:00', '07:00'], ['19시 30분~20시', '19:30'], ['12~13시', '12:00'], ['12시~14시', '12:00'], ['12:00~14:00', '12:00'], ['오전12~01시', '00:00'], ['7~8시', '07:00'], ['7~8', '07:00'], ['7 8', '07:00'], ['7시부터8시까지', '07:00'], ['7:00~8:00', '07:00'], ['12~1', '12:00'], ['7~14', '07:00']]) {
    assert.equal(parse(`14일 ${time} 하이라이트 합주`).data.startTime, expected);
}
for (const time of ['19시~25시', '19:60~20:00', '오후19~20시', '19~19시', '12~12', '119~20', '19~201']) {
    assert.ok(parse(`14일 ${time} 하이라이트 합주`).reason);
}
for (const date of ['10월 10일 토요일', '10/10 토요일', '10.10 토', '10.10(토)', '10/10일', '10.10일 토']) {
    for (const keyword of ['합주', '추합', '추가합주', '추가 합주']) {
        assert.deepEqual(parse(`${date} 12~14 하이라이트 ${keyword} 하겠습니다`).data, {
            date: '2026-10-10', teamName: '하이라이트', userName: '정현우', purpose: '합주', startTime: '12:00', endTime: '14:00', isNextDay: false
        });
    }
}
assert.equal(parse('10.10 토 14~12 하이라이트 추합').data.endTime, '12:00');
assert.ok(parse('10.10 일 12~14 하이라이트 추합').reason);
assert.ok(parse('10/10일요일 12~14 하이라이트 추합').reason);
assert.ok(parse('13.10 12~14 하이라이트 합주').reason);
assert.ok(parse('10.32 12~14 하이라이트 합주').reason);
for (const date of ['10.100', '110.10', '10/100', '110/10']) {
    assert.ok(parse(`${date} 12~14 레슨 취소`).reason);
}
for (const time of ['12~14명', '12~14명이', '12~14 명', '12~14인', '12~14개', '12~14회', '12~14만원']) {
    assert.ok(parse(`금일 ${time} 레슨 취소`).reason);
}
assert.equal(parse('10.10 토 12~14 인피니티 합주').data.teamName, '인피니티');
assert.equal(parse('2027년 10.10 12~14 레슨 하겠습니다').data.date, '2027-10-10');
assert.equal(parse('2027년 10/10 12~14 레슨 하겠습니다').data.date, '2027-10-10');
assert.ok(parse('2027년 금일 12~14 레슨 취소').reason);
assert.equal(parse('금일 16~17시 돈록밴합주 없습니다').data.date, '2026-10-09');
assert.equal(readChat({ ...message('금일 20~21시 기타레슨 하겠습니다'), sentDate: '' }, now).data.date, '2026-10-09');
assert.equal(readChat({ ...message('14일 16~17시 하이라이트 합주'), sentDate: '' }, now).data.date, '2026-10-14');
assert.ok(readChat({ ...message('금일 하이라이트 합주 없습니다'), sentDate: '잘못된 날짜' }, now).reason);
assert.equal(readChat({ ...message('금일 16~17시 돈록밴합주 없습니다'), sentDate: '2026-10-08' }, now).data.date, '2026-10-09');
const newYear = Date.parse('2026-12-31T15:00:00Z');
assert.equal(readChat(message('금일 16~17시 하이라이트 합주 없습니다'), newYear).data.date, '2027-01-01');
assert.equal(readChat(message('14일 16~17시 하이라이트 합주'), newYear).data.date, '2027-01-14');
assert.equal(readChat(message('2월 3일 16~17시 하이라이트 합주'), newYear).data.date, '2027-02-03');
assert.equal(readChat(message('2.3 12~14 하이라이트 추합'), newYear).data.date, '2027-02-03');
assert.equal(readChat(message('2028년 2월 3일 16~17시 하이라이트 합주'), newYear).data.date, '2028-02-03');
assert.equal(parse('내일 16~17시 레슨 하겠습니다').data.teamName, '레슨');
assert.equal(parse('금일 20~21시 기타레슨 취소입니다').data.teamName, '레슨');
assert.equal(parse('금일 20~21시 레슨 취소').data.teamName, '레슨');
assert.equal(parse('금일 16~17시 하이라이트 예약 취소').data.teamName, '하이라이트');
assert.equal(parse('금일 기타레슨 취소').data.teamName, '기타');
assert.equal(parse('금일 돈록밴합주 없습니다').data.teamName, '돈록밴');
assert.ok(parse('금일 레슨 취소').reason);
assert.ok(parse('금일 취소').reason);
for (const partial of ['19시', '19:', '19~', '19~100', '19']) {
    assert.ok(parse(`10/11 범람 합주 ${partial} 취소`).reason);
}
const english = parse('10/11 11~12 far away from the home 합주');
assert.deepEqual(english.data, { date: '2026-10-11', teamName: 'far away from the home', userName: '정현우', purpose: '합주', startTime: '11:00', endTime: '12:00', isNextDay: false });
assert.equal(planChat(english, [], now).action, 'create');
assert.equal(parse('10/11 11~12 far away\nfrom the home 합주').data.teamName, 'far away from the home');
const englishReservation = { id: 'english', ...english.data };
assert.equal(planChat(parse('10/11 Far  Away from the home 합주 취소'), [englishReservation], now).target.id, 'english');
const overflowing = { id: 'overflow', ...parse('10/11 16~17 범람 합주').data };
const byTeamCancel = parse('10/11 범람 합주 취소');
assert.equal(planChat(byTeamCancel, [overflowing, englishReservation], now).target.id, 'overflow');
assert.equal(planChat(parse('10/11 범람 취소'), [overflowing], now).target.id, 'overflow');
assert.ok(planChat(byTeamCancel, [], now).reason);
assert.ok(planChat(byTeamCancel, [{ ...overflowing, date: '2026-10-12' }], now).reason);
assert.ok(planChat(byTeamCancel, [{ ...overflowing, teamName: '범람팀' }], now).reason);
assert.ok(planChat(byTeamCancel, [overflowing, { ...overflowing, id: 'another', startTime: '19:00', endTime: '20:00' }], now).reason);
assert.equal(parse('10/11 7~8 far away from the home 합주').data.startTime, '07:00');
for (const time of ['19시반~20시반', '19시 반부터20시 반까지', '19시반20시반', '19:3020:30', '19시 30분~20시 30분']) {
    const r = parse(`10/11 ${time}`);
    assert.deepEqual(r.data, { date: '2026-10-11', teamName: '기타', userName: '정현우', purpose: '기타', startTime: '19:30', endTime: '20:30', isNextDay: false });
}
assert.equal(parse('10/11 7 8').data.purpose, '기타');
assert.equal(parse('10/11 7 8 far away').data.teamName, 'far away');
assert.equal(parse('10/11 7 8 far away').data.purpose, '기타');
assert.equal(planChat(parse('10/11 11~12 faw away 취소'), [englishReservation], now).target.id, 'english');
assert.ok(planChat(parse('10/11 11~13 faw away 취소'), [englishReservation], now).reason);
assert.ok(planChat(parse('10/11 11~12'), [englishReservation], now).reason);
assert.ok(planChat(parse('10/11 11:30~12:30'), [englishReservation], now).reason);
assert.equal(planChat(parse('10/11 12~13'), [englishReservation], now).action, 'create');
assert.match(parse('금일 19~20시 예약을 20~21시로 변경').reason, /예약 화면/);
assert.equal(parse('[예약] 2026-10-12 / 19:00~21:00 / 나이테팀').data.teamName, '나이테팀');
assert.equal(parse('모레 23시~00시 하이라이트 합주').data.isNextDay, true);
assert.ok(parse('14일 목 16~17시 하이라이트 합주').reason);
assert.ok(parse('31일 16~17시 하이라이트 합주').data);
assert.ok(readChat(message('31일 16~17시 하이라이트 합주'), Date.parse('2026-11-09T12:00:00+09:00')).reason);
assert.ok(readChat({ ...message('14일 16~17시 하이라이트 합주'), sender: '' }).reason);
assert.ok(readChat({ ...message('14일 16~17시 하이라이트 합주'), complete: false }).reason);
assert.ok(parse('14일 16~17시 하이라이트 합주 가능한가요?').reason);
assert.ok(parse('오늘 19~20시 하이라이트 합주 취소하지 않습니다').reason);
assert.ok(parse('오늘 하이라이트 합주 없는 건가요').reason);
assert.ok(parse('14일 16~17시 하이라이트 합주 15일 18~19시 레슨').reason);
assert.ok(parse('하이라이트 합주 없습니다').reason);
assert.equal(validDate('2026-02-30'), false);
assert.equal(koreanDate(Date.parse('2026-10-08T15:05:00Z')), '2026-10-09');
const reservation = { id: 'one', ...parse('오늘 16~17시 하이라이트 합주').data };
const cancel = parse('금일 16~17시 취소');
assert.equal(planChat(cancel, [reservation], now).target.id, 'one');
const shorthandReservation = { id: 'shorthand', ...parse('10/10 토요일 12~14 하이라이트 추합').data };
assert.equal(planChat(parse('10.10 토 12~14 추합 취소'), [shorthandReservation], now).target.id, 'shorthand');
assert.equal(planChat(parse('10.10 토 12~14 하이라이트 추가합주'), [], now).action, 'create');
assert.equal(planChat(cancel, [reservation, { ...reservation, id: 'two', startTime: '19:00', endTime: '20:00' }], now).target.id, 'one');
assert.equal(planChat(cancel, [{ ...reservation, userName: '다른사람', teamName: '기타', purpose: '레슨' }], now).target.id, 'one');
assert.ok(planChat(cancel, [reservation, { ...reservation, id: 'duplicate' }], now).reason);
assert.ok(planChat(cancel, [{ ...reservation, date: '2026-10-10' }], now).reason);
assert.ok(planChat(cancel, [{ ...reservation, endTime: '18:00' }], now).reason);
assert.equal(readChat({ ...message('금일 16~17시 취소'), sender: '', sentDate: '' }, now).action, 'cancel');
assert.ok(planChat(cancel, [], now).reason);
assert.ok(planChat(parse('오늘 16~17시 하이라이트 합주'), [reservation], now).reason);
assert.ok(planChat(parse('금일 10~11시 하이라이트 합주'), [], now).reason);
assert.ok(planChat(parse('오늘 00시~01시 하이라이트 합주'), [{ ...reservation, date: '2026-10-08', startTime: '23:00', endTime: '02:00', isNextDay: true }], now).reason);
assert.equal(planChat(parse('내일 16~17시 하이라이트 합주'), [], now).action, 'create');
const lesson = { id: 'lesson', ...parse('금일 20~21시 기타레슨 하겠습니다').data };
const cancelLesson = parse('금일 20~21시 취소');
assert.equal(planChat(cancelLesson, [lesson], now).target.id, 'lesson');
const legacyLesson = { ...lesson, id: 'legacy-lesson', teamName: '기타', startTime: '19:00', endTime: '20:00' };
assert.equal(planChat(parse('금일 19~20시 취소'), [legacyLesson], now).target.id, 'legacy-lesson');
assert.equal(planChat(cancelLesson, [lesson, legacyLesson], now).target.id, 'lesson');
assert.equal(planChat(parse('금일 20~21시 기타레슨 취소'), [lesson, legacyLesson], now).target.id, 'lesson');
assert.equal(unchangedReservation(reservation, { ...reservation, teamName: '다른팀' }), false);
console.log('채팅 날짜·시간·취소 검증 통과');
