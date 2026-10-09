// OCR은 글자만 읽고, 예약 날짜·시간·취소 범위는 여기서 검증합니다.
const DAY = 86_400_000;
const hold = reason => ({ reason });
const pad = n => String(n).padStart(2, '0');
export const koreanDate = (now = Date.now()) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
export function validDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
        Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
}
const shiftDate = (s, days) => new Date(Date.parse(s) + days * DAY).toISOString().slice(0, 10);
export const reservationStart = r => Date.parse(`${r.date}T${r.startTime}:00+09:00`);
export const reservationEnd = r => Date.parse(`${r.date}T${r.endTime}:00+09:00`) + (r.isNextDay ? DAY : 0);

export function readChat(message, now = Date.now()) {
    const text = String(message.text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!/(합주|추합|레슨|취소|수정|변경|\[예약\]|예약\s*(?:하|신청))/.test(text) && !/\d{1,2}\s*(?:시|:|[~～〜∼–—-]|\s+\d{1,2})/.test(text)) return { ignored: true };
    if (message.complete !== true) return hold('말풍선·닉네임·날짜가 잘렸거나 OCR이 불확실합니다.');
    if (message.sentDate && !validDate(message.sentDate)) return hold('메시지를 보낸 날짜를 확인해 주세요.');
    if (/[?？]|(?:할|될|일|있을)까|가능|나요|건가요|어때|해도\s*돼|연기|말고|아니라|아닙니다|아니에요|안\s*(?:취소|변경|수정)|(?:취소|변경|수정).*(?:않|아님|아니|안|없)|하지\s*(?:마|말)|못\s*(?:합니다|해요|해|할)|안\s*(?:함|해(?:\s|$)|했)|없.*않/.test(text)) return hold('질문·부정·금지 표현은 직접 확인해 주세요.');
    if (/변경|수정/.test(text)) return hold('수정은 예약 화면에서 해당 시간의 예약을 선택해 직접 처리해 주세요.');
    const purposes = [...text.matchAll(/추가\s*합주|추합|합주|레슨/g)];
    if (purposes.length > 1) return hold('메시지 한 개에 예약 내용이 여러 개 있습니다.');
    const purpose = purposes[0]?.[0] === '레슨' ? '레슨' : purposes.length ? '합주' : '기타';
    const cancel = /취소|없습니다|없어요|없음|안\s*(?:합니다|해요|할|하겠)|하지\s*않/.test(text);
    const action = cancel ? 'cancel' : 'create';
    let rest = text;
    const dates = [...text.matchAll(/(?<!\d)(?:(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일|(\d{4})-(\d{2})-(\d{2})|(?:(\d{4})년\s*)?(\d{1,2})[/.](\d{1,2})(?:일(?!요일))?|(\d{1,2})일|오늘|금일|내일|모레)(?!\d)/g)];
    if (dates.length !== 1) return hold('예약 날짜가 없거나 여러 개입니다.');
    const d = dates[0];
    if (/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(text) && !d[4]) return hold('명시한 연도는 2027년 10월 11일 또는 2027-10-11 형식으로 확인해 주세요.');
    if (/\d{4}\s*년/.test(text) && !d[1] && !d[7]) return hold('명시한 연도와 예약 날짜를 함께 확인해 주세요.');
    const today = koreanDate(now);
    const [year, month] = today.split('-').map(Number);
    let date;
    if (/오늘|금일|내일|모레/.test(d[0])) date = shiftDate(today, /모레/.test(d[0]) ? 2 : /내일/.test(d[0]) ? 1 : 0);
    else if (d[4]) date = `${d[4]}-${d[5]}-${d[6]}`;
    else date = `${d[1] || d[7] || year}-${pad(d[2] || d[8] || month)}-${pad(d[3] || d[9] || d[10])}`;
    if (!validDate(date)) return hold('존재하지 않는 날짜입니다.');
    rest = rest.replace(d[0], ' ');
    const weekday = /^\s*\(?([일월화수목금토])(?:요일)?\)?(?=\s|\d|$)/.exec(text.slice(d.index + d[0].length));
    if (weekday) {
        if ('일월화수목금토'[new Date(date).getUTCDay()] !== weekday[1]) return hold('날짜와 요일이 맞지 않습니다.');
        rest = rest.replace(weekday[0], ' ');
    }

    // 오전·오후가 없으면 24시간제로 읽습니다. 시각을 붙여 쓸 때는 시·분·반 또는 : 표기가 필요합니다.
    const clock = '(오전|오후|아침|저녁|밤)?\\s*(\\d{1,2})(?::(\\d{2})|시(?:\\s*(?:(반)|(\\d{1,2})분))?)?';
    const separator = '(?:\\s*(?:~|～|〜|∼|[-–—]|부터)\\s*|\\s+|(?<=시|분|반|:\\d{2}))';
    const ranges = [...rest.matchAll(new RegExp(`(?<!\\d)${clock}${separator}${clock}(?!\\d|:)(?:\\s*까지)?`, 'g'))];
    const teamFrom = value => value.split(purposes[0]?.[0] || (action === 'cancel' ? '취소' : '\u0000'))[0]
        .replace(/^\s*(?:예약|\[예약\]|팀명\s*:)\s*/, '').replace(/예약\s*$/, '')
        .replace(/^[\s/:,-]+|[\s/:,-]+$/g, '').replace(/[은는]\s*$/, '').replace(/\s+/g, ' ').trim();
    const namedTeam = teamFrom(rest.replace(ranges[0]?.[0] || '\u0000', ' '));
    const data = { date, teamName: purpose === '레슨' ? '레슨' : namedTeam || (action === 'create' ? '기타' : ''), userName: typeof message.sender === 'string' ? message.sender.trim() : '', purpose };
    if (action === 'cancel' && !ranges.length) {
        if (/\d/.test(rest.replace(namedTeam, ''))) return hold('취소 시간 표기가 불완전합니다. 시작·종료 시간을 확인해 주세요.');
        return validateChat({ action, data: { ...data, teamName: namedTeam } });
    }
    if (ranges.length !== 1) return hold('시작·종료 시간 한 구간을 확인해 주세요.');
    const r = ranges[0];
    const tail = rest.slice(r.index + r[0].length);
    if (/^(?:시|분|반|:|\d)/.test(tail) || /^\s+\d+분/.test(tail)) return hold('시간 표기가 불완전합니다. 분까지 확인해 주세요.');
    if (!/시|:/.test(r[0]) && /^(?:명|인|개|회|곡|만원|원)|^\s+(?:명|인|개|회|곡|만원|원)(?=\s|$|[이가은는을를]|으로|만|씩|분)/.test(tail)) return hold('수량 표기를 시간으로 처리하지 않습니다. 시간을 확인해 주세요.');
    const convert = (marker, hour, minute) => {
        let h = Number(hour), m = Number(minute || 0);
        if (h > 23 || m > 59 || (marker && (h < 1 || h > 12))) return null;
        if (marker) h = h % 12 + (/오후|저녁|밤/.test(marker) ? 12 : 0);
        return `${pad(h)}:${pad(m)}`;
    };
    const startTime = convert(r[1], r[2], r[4] ? '30' : r[3] || r[5]);
    const endTime = convert(r[6] || r[1], r[7], r[9] ? '30' : r[8] || r[10]);
    if (startTime === null || endTime === null) return hold('시간 범위가 올바르지 않습니다.');
    // 팀명 뒤의 단위 없는 숫자 구간은 숫자 팀명일 수 있어 시간 취소로 추측하지 않습니다.
    const possibleTeamName = teamFrom(rest);
    if (action === 'cancel' && !/시|:/.test(r[0]) && teamFrom(rest.slice(0, r.index)) && possibleTeamName.includes(r[0].trim())) data.possibleTeamName = possibleTeamName;
    const result = { action, data: { ...data, startTime, endTime, isNextDay: endTime < startTime } };
    return validateChat(result);
}

export function validateChat(result) {
    const r = result.data;
    if (!['create', 'cancel'].includes(result.action) || !r || !validDate(r.date)) return hold('날짜와 작업을 확인해 주세요.');
    const byTeam = result.action === 'cancel' && r.startTime == null && r.endTime == null;
    if (result.action === 'create' || byTeam) {
        if (typeof r.teamName !== 'string' || !r.teamName.trim() || r.teamName.length > 30 || /[\n<>]/.test(r.teamName)) return hold('팀명을 확인해 주세요.');
    }
    if (result.action === 'create') {
        if (typeof r.userName !== 'string' || !r.userName.trim() || r.userName.length > 20) return hold('예약자 닉네임을 확인해 주세요.');
        if (!['합주', '레슨', '기타'].includes(r.purpose) || (r.purpose === '레슨' && r.teamName !== '레슨')) return hold('사용 목적을 확인해 주세요.');
    }
    if (byTeam) return result;
    const timeOK = t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    if (!timeOK(r.startTime) || !timeOK(r.endTime) || r.startTime === r.endTime) return hold('서로 다른 시작·종료 시간이 필요합니다.');
    r.isNextDay = r.endTime < r.startTime;
    return result;
}

export function planChat(result, reservations, now = Date.now()) {
    if (result.ignored || result.reason) return result;
    const checked = validateChat(result);
    if (checked.reason) return checked;
    const r = checked.data;
    if (checked.action === 'cancel') {
        const teamKey = name => typeof name === 'string' ? name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
        const namedCandidates = r.possibleTeamName ? reservations.filter(x => x.date === r.date && teamKey(x.teamName) === teamKey(r.possibleTeamName)) : [];
        if (r.possibleTeamName) {
            if (namedCandidates.length !== 1) return hold('팀명 속 숫자와 시간이 모호합니다. 날짜 뒤에 시간을 쓰거나 시·분을 표시해 주세요.');
            return { action: 'cancel', target: namedCandidates[0] };
        }
        const byTeam = r.startTime == null && r.endTime == null;
        const candidates = reservations.filter(x => x.date === r.date && (byTeam
            ? teamKey(x.teamName) === teamKey(r.teamName)
            : x.startTime === r.startTime && x.endTime === r.endTime));
        if (candidates.length !== 1) return hold(`대상이 ${candidates.length}건입니다. ${byTeam ? '날짜·팀명 또는 취소할 시간' : '날짜·시작·종료 시간'}을 확인해 주세요.`);
        return { action: 'cancel', target: candidates[0] };
    }
    if (reservationStart(r) + 30 * 60_000 <= now) return hold('지난 시간의 새 예약은 추가하지 않습니다.');
    if (hasConflict(r, reservations)) return hold('이미 예약된 시간과 겹칩니다.');
    return { action: 'create', data: r };
}

export const hasConflict = (r, list) => list.some(x => reservationStart(r) < reservationEnd(x) && reservationEnd(r) > reservationStart(x));

// 재시도 중 누군가 수정한 예약은 삭제하지 않습니다.
export function unchangedReservation(actual, expected) {
    return ['date', 'startTime', 'endTime', 'isNextDay', 'teamName', 'userName', 'purpose', 'ownerUid', 'createdAt', 'seriesId']
        .every(k => (actual[k] ?? null) === (expected[k] ?? null));
}
