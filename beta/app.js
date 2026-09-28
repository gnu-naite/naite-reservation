/* ============================================================
   나이테 동아리방 예약 — 메인 로직
   ============================================================ */

import { createStore, randomToken } from './store.js?v=6';
import { CLUB, DEFAULT_REPEAT_UNTIL, MAX_OCCURRENCES, ADMIN_UIDS, KAKAO_JS_KEY } from './config.js';

/* ---------- i18n 사전 ---------- */
const I18N = {
    ko: {
        "doc.title": `${CLUB.nameKo} 동아리방 예약`,
        "app.title": `${CLUB.nameKo} 동아리방 예약`,
        "app.subtitle": "공유 예약 캘린더",
        "app.reserveBtn": "예약하기",
        "banner.local": "임시 저장 모드입니다. 예약이 이 기기에만 저장되고 다른 사람과 공유되지 않습니다. (config.js 설정 필요)",

        "main.upcomingTitle": "오늘 일정",
        "main.loading": "불러오는 중...",
        "main.noUpcoming": "오늘은 예약이 없습니다.",
        "main.today": "오늘",
        "main.noSchedule": "이 날은 예약이 없습니다.",

        "day.sun": "일", "day.mon": "월", "day.tue": "화", "day.wed": "수",
        "day.thu": "목", "day.fri": "금", "day.sat": "토",

        "modal.newResTitle": "새로운 예약",
        "modal.editResTitle": "예약 수정",
        "modal.labelDate": "이용 날짜",
        "modal.labelFirstDate": "첫 예약 날짜",
        "modal.labelStart": "시작 시간",
        "modal.labelEnd": "종료 시간",
        "modal.nextDayHint": "자정을 넘겨 익일까지 이어지는 예약입니다.",
        "modal.labelType": "예약 유형",
        "modal.typeOnce": "한 번만",
        "modal.typeWeekly": "고정 (매주)",
        "modal.labelRepeatUntil": "반복 종료일",
        "modal.repeatSummary": "{until}까지 매주 {weekday}요일 · 총 {count}회 예약됩니다.",
        "modal.repeatInvalid": "반복 종료일은 첫 예약 날짜보다 뒤여야 합니다.",
        "modal.editScopeSeries": "고정 예약 중 이 회차({date})만 수정됩니다.",
        "modal.editToOnce": "한 번 예약으로 바뀌고, 아직 남은 고정 예약 {count}회는 취소됩니다.",
        "modal.labelTeam": "팀명",
        "modal.phTeam": "예: 밴드팀",
        "modal.labelPurpose": "사용 목적",
        "modal.optEnsemble": "🎸 합주",
        "modal.optClass": "📚 레슨",
        "modal.optMeeting": "🗓️ 정기회의",
        "modal.optEtc": "✨ 기타",
        "modal.btnCancel": "취소",
        "modal.btnSubmit": "예약 완료",
        "modal.btnEdit": "수정 완료",

        "theme.title": "테마 설정",
        "theme.default": "기본",
        "theme.forest": "포레스트",
        "theme.ocean": "오션",
        "theme.sunset": "선셋",
        "theme.mono": "모노",
        "theme.dark": "다크",

        "confirm.title": "예약 취소",
        "confirm.body": "[{team}] 팀의 예약을 정말 취소할까요? 되돌릴 수 없습니다.",
        "confirm.no": "아니오",
        "confirm.yes": "취소하기",

        "series.title": "고정 예약 취소",
        "series.message": "[{team}] 팀의 고정 예약입니다. 어디까지 취소할까요?",
        "series.onlyTitle": "이번 주만 취소",
        "series.onlyDesc": "{date} 하루만 취소하고 나머지 주는 그대로 둡니다.",
        "series.allTitle": "전체 취소",
        "series.allDesc": "남은 회차를 포함해 {count}회를 모두 취소합니다.",
        "series.keep": "닫기",
        "series.confirmAll": "[{team}] 고정 예약 {count}회를 모두 취소할까요? 되돌릴 수 없습니다.",

        "status.ongoing": "진행중",
        "status.done": "종료",
        "status.nextDay": "익일",
        "status.repeat": "매주 {weekday}",
        "btn.edit": "수정",
        "btn.delete": "예약 취소",
        "btn.saving": "저장 중...",

        "unit.people": "명",
        "msg.saved": "예약이 등록되었습니다.",
        "msg.savedSeries": "고정 예약 {count}회가 등록되었습니다.",
        "msg.updated": "예약이 수정되었습니다.",
        "msg.deleted": "예약이 취소되었습니다.",
        "msg.deletedSeries": "고정 예약 {count}회가 모두 취소되었습니다.",
        "confirm.skipTitle": "일부 주차 중복",
        "confirm.skip": "{skipped}회차({dates})는 이미 다른 예약이 있습니다.\n\n해당 주를 건너뛰고 나머지 {count}회만 예약할까요?",
        "confirm.skipYes": "건너뛰고 예약",
        "err.sameTime": "시작 시간과 종료 시간이 같을 수 없습니다.",
        "err.overlap": "해당 시간에 이미 예약이 있습니다. 다른 시간을 선택해주세요.",
        "err.allOverlap": "선택한 기간의 모든 주차에 이미 예약이 있습니다. 시간을 바꿔주세요.",
        "err.repeatRange": "반복 종료일은 첫 예약 날짜보다 뒤여야 합니다.",
        "err.tooMany": "반복 횟수가 너무 많습니다. 종료일을 앞당겨주세요. (최대 {max}회)",
        "err.permissionNew": "서버가 예약 저장을 거부했습니다. 관리자에게 알려주세요. (보안 규칙 설정 확인 필요)",
        "main.bookDay": "이 날 예약",
        "main.mine": "내 예약 {count}건",
        "status.fromPrev": "전날부터",
        "err.past": "이미 지난 시간은 예약할 수 없습니다.",
        "kakao.connect": "카톡 닉네임 연결",
        "kakao.linked": "카톡 닉네임 '{nick}'(으)로 연결했습니다.",
        "kakao.fail": "카톡 닉네임 연결에 실패했습니다.",
        "kakao.askTitle": "카카오톡 닉네임 연동",
        "kakao.ask": "예약하거나 수정·취소하려면 카카오톡 닉네임 연동이 필요합니다. (처음 한 번만)\n\n예약자 이름 대신 닉네임이 기록되고, 누가 수정·취소했는지 관리자가 확인하는 용도로만 쓰입니다. 지금 연동할까요?",
        "kakao.askYes": "카카오톡 연동",
        "kakao.later": "나중에 하단의 [카톡 닉네임 연결]을 눌러 연동할 수 있습니다. 연동 전에는 예약·수정·취소가 막혀 있습니다.",
        "lock.needKakao": "카톡 닉네임을 연동하면 예약하고 수정·취소할 수 있습니다. (하단 [카톡 닉네임 연결])",
        "err.permission": "권한이 없습니다. 하단 [카톡 닉네임 연결]로 카카오톡 연동을 먼저 해주세요.",
        "log.admin": "관리자",
        "log.clear": "이 날 기록 삭제",
        "log.clearTitle": "기록 삭제",
        "log.clearConfirm": "{day} 기록 {n}건을 모두 삭제할까요? 다른 날짜의 기록은 그대로 남습니다. 되돌릴 수 없습니다.",
        "log.clearYes": "삭제",
        "log.cleared": "{day} 기록을 삭제했습니다.",
        "log.clearFail": "기록을 삭제하지 못했습니다.",
        "log.prevDay": "이전 날",
        "log.nextDay": "다음 날",
        "log.title": "최근 수정·취소",
        "log.empty": "아직 기록이 없습니다.",
        "log.delete": "취소",
        "log.update": "수정",
        "log.one": "[{team}] {slot} 예약 취소",
        "log.edit": "[{team}] {slot}(으)로 수정",
        "log.seriesAll": "[{team}] 고정 예약 전체 취소 ({n}회)",
        "log.toOnce": "[{team}] {slot} 한 번 예약으로 변경 · 남은 {n}회 취소",
        "confirm.toOnceTitle": "한 번 예약으로 변경",
        "confirm.toOnce": "이 회차만 남기고, 아직 남은 고정 예약 {count}회를 취소할까요? 되돌릴 수 없습니다.",
        "confirm.toOnceYes": "변경하기",

        "admin.badge": "관리자",
        "admin.login": "관리자 로그인",
        "admin.logout": "로그아웃",
        "admin.copy": "UID 복사",
        "admin.copied": "UID를 복사했습니다.",
        "admin.loginTitle": "관리자 로그인",
        "admin.loginConfirm": "관리자 전용 기능입니다.\n구글 계정으로 로그인하면 관리자로 등록된 계정만 모든 예약을 수정·삭제할 수 있습니다.",
        "admin.loginYes": "구글로 로그인",
        "admin.signedIn": "관리자로 로그인되어 있습니다. 모든 예약을 수정·삭제할 수 있습니다.",
        "admin.notRegistered": "{email} 계정은 아직 관리자로 등록되지 않았습니다. 아래 UID를 등록해주세요.",
        "admin.loggedOut": "로그아웃했습니다.",
        "admin.popupBlocked": "로그인 팝업이 차단되었습니다. 팝업을 허용하거나 Chrome·Safari에서 열어주세요.",
        "admin.inApp": "카카오톡 등 앱 내 브라우저에서는 구글 로그인이 막혀 있습니다. Chrome·Safari에서 열어주세요.",
        "admin.domain": "이 주소가 Firebase에 승인되지 않았습니다. (Authentication > 설정 > 승인된 도메인)",
        "admin.notEnabled": "Firebase에서 로그인 기능이 아직 켜져 있지 않습니다. (Authentication > 로그인 방법에서 익명·Google 사용 설정)",
        "admin.loginFail": "로그인에 실패했습니다. ({code})",
        "err.save": "예약 저장에 실패했습니다. 네트워크 연결을 확인해주세요.",
        "err.delete": "예약 취소에 실패했습니다. 네트워크 연결을 확인해주세요.",
        "err.load": "예약 정보를 불러오지 못했습니다.",

        "footer.line1": `© 2026. 경상국립대학교 중앙동아리 '${CLUB.nameKo}' 동아리방 예약 시스템`,
        "footer.line2": "무단 수정 및 재배포를 금지합니다."
    },
    en: {
        "doc.title": `${CLUB.nameEn} Club Room Reservation`,
        "app.title": `${CLUB.nameEn} Club Room`,
        "app.subtitle": "Shared booking calendar",
        "app.reserveBtn": "Reserve",
        "banner.local": "Temporary mode: reservations are saved on this device only and are not shared. (config.js needs setup)",

        "main.upcomingTitle": "Today's Schedule",
        "main.loading": "Loading...",
        "main.noUpcoming": "Nothing booked today.",
        "main.today": "Today",
        "main.noSchedule": "No reservations on this day.",

        "day.sun": "Sun", "day.mon": "Mon", "day.tue": "Tue", "day.wed": "Wed",
        "day.thu": "Thu", "day.fri": "Fri", "day.sat": "Sat",

        "modal.newResTitle": "New Reservation",
        "modal.editResTitle": "Edit Reservation",
        "modal.labelDate": "Date",
        "modal.labelFirstDate": "First date",
        "modal.labelStart": "Start time",
        "modal.labelEnd": "End time",
        "modal.nextDayHint": "This booking runs past midnight into the next day.",
        "modal.labelType": "Booking type",
        "modal.typeOnce": "One-off",
        "modal.typeWeekly": "Weekly",
        "modal.labelRepeatUntil": "Repeat until",
        "modal.repeatSummary": "Every {weekday} until {until} · {count} bookings total.",
        "modal.repeatInvalid": "The end date must be after the first date.",
        "modal.editScopeSeries": "Only this occurrence ({date}) of the weekly booking will change.",
        "modal.editToOnce": "This becomes a one-off, and the {count} remaining weekly bookings are cancelled.",
        "modal.labelTeam": "Team name",
        "modal.phTeam": "e.g. Rock Band",
        "modal.labelPurpose": "Purpose",
        "modal.optEnsemble": "🎸 Ensemble",
        "modal.optClass": "📚 Lesson",
        "modal.optMeeting": "🗓️ Meeting",
        "modal.optEtc": "✨ Other",
        "modal.btnCancel": "Cancel",
        "modal.btnSubmit": "Book",
        "modal.btnEdit": "Update",

        "theme.title": "Theme",
        "theme.default": "Default",
        "theme.forest": "Forest",
        "theme.ocean": "Ocean",
        "theme.sunset": "Sunset",
        "theme.mono": "Mono",
        "theme.dark": "Dark",

        "confirm.title": "Cancel reservation",
        "confirm.body": "Really cancel the booking for [{team}]? This cannot be undone.",
        "confirm.no": "Keep it",
        "confirm.yes": "Cancel it",

        "series.title": "Cancel weekly booking",
        "series.message": "[{team}] is a weekly booking. How much should be cancelled?",
        "series.onlyTitle": "This week only",
        "series.onlyDesc": "Cancels {date} only and keeps the other weeks.",
        "series.allTitle": "Cancel all",
        "series.allDesc": "Cancels all {count} occurrences, including upcoming ones.",
        "series.keep": "Close",
        "series.confirmAll": "Cancel all {count} occurrences of [{team}]? This cannot be undone.",

        "status.ongoing": "Ongoing",
        "status.done": "Done",
        "status.nextDay": "next day",
        "status.repeat": "Every {weekday}",
        "btn.edit": "Edit",
        "btn.delete": "Cancel",
        "btn.saving": "Saving...",

        "unit.people": "",
        "msg.saved": "Reservation created.",
        "msg.savedSeries": "{count} weekly bookings created.",
        "msg.updated": "Reservation updated.",
        "msg.deleted": "Reservation cancelled.",
        "msg.deletedSeries": "All {count} weekly bookings cancelled.",
        "confirm.skipTitle": "Some weeks conflict",
        "confirm.skip": "{skipped} week(s) ({dates}) are already booked.\n\nSkip those and book the remaining {count}?",
        "confirm.skipYes": "Skip and book",
        "err.sameTime": "Start and end time cannot be the same.",
        "err.overlap": "That time slot is already booked. Please pick another.",
        "err.allOverlap": "Every week in that range is already booked. Please pick another time.",
        "err.repeatRange": "The end date must be after the first date.",
        "err.tooMany": "Too many repeats. Please pick an earlier end date. (max {max})",
        "err.permissionNew": "The server refused to save this booking. Please tell an admin. (security rules need checking)",
        "main.bookDay": "Book this day",
        "main.mine": "My bookings: {count}",
        "status.fromPrev": "from prev. day",
        "err.past": "You can't book a time that has already passed.",
        "kakao.connect": "Link KakaoTalk nickname",
        "kakao.linked": "Linked KakaoTalk nickname '{nick}'.",
        "kakao.fail": "Couldn't link your KakaoTalk nickname.",
        "kakao.askTitle": "Link KakaoTalk",
        "kakao.ask": "To book, edit or cancel, link your KakaoTalk nickname (one time only).\n\nYour nickname is recorded instead of a name, and admins use it to see who edited or cancelled. Link now?",
        "kakao.askYes": "Link KakaoTalk",
        "kakao.later": "You can link later with [Link KakaoTalk nickname] at the bottom. Until then you can't book, edit or cancel.",
        "lock.needKakao": "Link your KakaoTalk nickname to book, edit or cancel. ([Link KakaoTalk nickname] at the bottom)",
        "err.permission": "Permission denied. Link your KakaoTalk nickname at the bottom first.",
        "log.admin": "Admin",
        "log.clear": "Delete this day's log",
        "log.clearTitle": "Delete log",
        "log.clearConfirm": "Delete all {n} records from {day}? Other days are kept. This cannot be undone.",
        "log.clearYes": "Delete",
        "log.cleared": "Deleted the log for {day}.",
        "log.clearFail": "Couldn't delete the log.",
        "log.prevDay": "Previous day",
        "log.nextDay": "Next day",
        "log.title": "Recent edits & cancellations",
        "log.empty": "No records yet.",
        "log.delete": "Cancelled",
        "log.update": "Edited",
        "log.one": "[{team}] {slot} cancelled",
        "log.edit": "[{team}] changed to {slot}",
        "log.seriesAll": "[{team}] whole weekly booking cancelled ({n})",
        "log.toOnce": "[{team}] {slot} made one-off · {n} remaining cancelled",
        "confirm.toOnceTitle": "Change to one-off",
        "confirm.toOnce": "Keep only this occurrence and cancel the {count} remaining weekly bookings? This cannot be undone.",
        "confirm.toOnceYes": "Change",

        "admin.badge": "Admin",
        "admin.login": "Admin sign-in",
        "admin.logout": "Sign out",
        "admin.copy": "Copy UID",
        "admin.copied": "UID copied.",
        "admin.loginTitle": "Admin sign-in",
        "admin.loginConfirm": "This is for admins only.\nOnly Google accounts registered as admins can edit or delete every booking.",
        "admin.loginYes": "Sign in with Google",
        "admin.signedIn": "Signed in as admin. You can edit and delete every booking.",
        "admin.notRegistered": "{email} is not registered as an admin yet. Register the UID below.",
        "admin.loggedOut": "Signed out.",
        "admin.popupBlocked": "The sign-in popup was blocked. Allow popups or open in Chrome/Safari.",
        "admin.inApp": "Google sign-in is blocked in in-app browsers (e.g. KakaoTalk). Open in Chrome/Safari.",
        "admin.domain": "This domain is not authorized in Firebase. (Authentication > Settings > Authorized domains)",
        "admin.notEnabled": "Sign-in is not enabled in Firebase yet. (Authentication > Sign-in method: enable Anonymous and Google)",
        "admin.loginFail": "Sign-in failed. ({code})",
        "err.save": "Failed to save. Please check your connection.",
        "err.delete": "Failed to cancel. Please check your connection.",
        "err.load": "Could not load reservations.",

        "footer.line1": `© 2026. Gyeongsang National University Club '${CLUB.nameEn}' Room Reservation System`,
        "footer.line2": "Unauthorized modification and redistribution are prohibited."
    }
};

const LS_LANG = 'naite_lang';
const LS_THEME = 'naite_theme';
const LS_KAKAO_ASKED = 'naite_kakao_asked';   // 첫 방문 카톡 연동 안내를 이미 띄웠는지
const LS_KAKAO_STATE = 'naite_kakao_state';
const THEMES = ['default', 'forest', 'ocean', 'sunset', 'mono', 'dark'];

/* ---------- 상태 ---------- */
let lang = localStorage.getItem(LS_LANG) === 'en' ? 'en' : 'ko';
let viewMonth = new Date();       // 캘린더가 보여주는 달
let selectedDate = new Date();    // 선택된 날짜
let reservations = [];            // 전체 예약 목록
let editingId = null;             // 수정 중인 예약 id
let resType = 'once';             // 'once' 한 번만 | 'weekly' 고정(매주)
let store = null;
let currentUser = null;           // Firebase 사용자 (익명 또는 구글)
let authUnavailable = false;      // 인증을 쓸 수 없는 상태 (콘솔에서 미설정 등)
let myProfile;                    // 이 기기의 { kakaoNick, name } (undefined: 아직 모름, null: 없음)
let users = new Map();            // 관리자용: uid → { kakaoNick, name }
let logs = [];                    // 관리자용: 수정·취소 기록 (최신순)
let logDay = null;                // 관리자용: 기록 카드에서 보고 있는 날짜 'YYYY-MM-DD' (null 이면 가장 최근)
let unwatchUsers = null;
let resolveUserReady;
const userReady = new Promise(r => (resolveUserReady = r));   // 익명 로그인까지 끝났을 때

/** 관리자 여부 — 구글 로그인 + ADMIN_UIDS 에 등록된 계정 */
function isAdmin() {
    return !!currentUser && !currentUser.isAnonymous && ADMIN_UIDS.includes(currentUser.uid);
}

/**
 * 이 예약을 수정/삭제할 수 있는지 (화면 표시용).
 * 실제 차단은 Firestore 보안 규칙이 서버에서 합니다.
 */
function canEdit(r) {
    if (!store || store.mode === 'local') return true;
    if (authUnavailable) return true;   // 인증 미설정 상태에선 서버 규칙에 판단을 맡김
    return isAdmin() || kakaoLinked();   // 베타: 카톡 닉네임을 연동한 사람은 누구나 모든 예약을
}

/** 이 기기가 카톡 닉네임을 연동했는지 */
const kakaoLinked = () => !!myProfile?.kakaoNick;

/** 고정 예약을 한 번 예약으로 바꿀 때 함께 취소될 회차 (아직 시작 안 한 나머지) */
function seriesLeftovers(res) {
    const now = Date.now();
    return reservations.filter(r =>
        r.seriesId === res.seriesId && r.id !== res.id && startTs(r) > now && canEdit(r)
    );
}

/* ---------- DOM ---------- */
const $ = id => document.getElementById(id);

const el = {
    banner: $('localModeBanner'),
    calendarGrid: $('calendarGrid'),
    monthTitle: $('currentMonthYear'),
    prevMonth: $('prevMonth'),
    nextMonth: $('nextMonth'),
    todayBtn: $('todayBtn'),
    dateTitle: $('selectedDateTitle'),
    dayCount: $('dayCountBadge'),
    occupancyBar: $('occupancyBar'),
    resList: $('reservationsList'),
    upcoming: $('upcomingList'),
    mineChip: $('mineChip'),
    dayReserveBtn: $('dayReserveBtn'),
    kakaoLinkBtn: $('kakaoLinkBtn'),
    logCard: $('logCard'),
    logList: $('logList'),
    logDayLabel: $('logDayLabel'),
    logPrev: $('logPrev'),
    logNext: $('logNext'),
    logClearBtn: $('logClearBtn'),

    resModal: $('reservationModal'),
    modalTitle: $('modalTitle'),
    form: $('reservationForm'),
    date: $('resDate'),
    dateLabel: $('resDateLabel'),
    start: $('startTime'),
    end: $('endTime'),
    nextDayHint: $('nextDayHint'),

    resTypeGroup: $('resTypeGroup'),
    repeatUntilField: $('repeatUntilField'),
    repeatUntil: $('repeatUntil'),
    repeatSummary: $('repeatSummary'),
    editScopeHint: $('editScopeHint'),
    editScopeText: $('editScopeText'),

    seriesModal: $('seriesModal'),
    seriesMessage: $('seriesMessage'),
    seriesOnlyBtn: $('seriesOnlyBtn'),
    seriesOnlyDesc: $('seriesOnlyDesc'),
    seriesAllBtn: $('seriesAllBtn'),
    seriesAllDesc: $('seriesAllDesc'),
    seriesCancelBtn: $('seriesCancelBtn'),
    seriesCloseBtn: $('seriesCloseBtn'),
    submitBtn: $('submitResBtn'),
    quickBtn: $('quickReserveBtn'),
    closeModalBtn: $('closeModalBtn'),
    cancelBtn: $('cancelBtn'),

    themeBtn: $('themeSettingsBtn'),
    themeModal: $('themeModal'),
    closeThemeBtn: $('closeThemeModalBtn'),

    confirmModal: $('confirmModal'),
    confirmMessage: $('confirmMessage'),
    confirmYes: $('confirmYesBtn'),
    confirmNo: $('confirmNoBtn'),

    langBtn: $('langToggleBtn'),
    langLabel: $('langLabel'),
    toastArea: $('toastArea'),

    adminBadge: $('adminBadge'),
    adminLoginBtn: $('adminLoginBtn'),
    adminInfo: $('adminInfo'),
    adminInfoText: $('adminInfoText'),
    adminUidRow: $('adminUidRow'),
    adminUid: $('adminUid'),
    copyUidBtn: $('copyUidBtn'),
    adminLogoutBtn: $('adminLogoutBtn')
};

/* ---------- 유틸 ---------- */
function t(key, params = {}) {
    let s = I18N[lang][key] ?? key;
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
    return s;
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → Date (로컬 자정) */
function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** 날짜+시각을 타임스탬프로. isNextDay 면 하루 더합니다. */
function ts(dateStr, timeStr, isNextDay = false) {
    if (!dateStr || !timeStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const date = new Date(y, m - 1, d, hh, mm);
    if (isNextDay) date.setDate(date.getDate() + 1);
    return date.getTime();
}

/** 예약 하나의 시작/종료 타임스탬프 */
const startTs = r => ts(r.date, r.startTime, false);
const endTs = r => ts(r.date, r.endTime, !!r.isNextDay);

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    node.innerHTML = `<i class="fa-solid ${icon}"></i><span></span>`;
    node.querySelector('span').textContent = message;
    el.toastArea.appendChild(node);
    setTimeout(() => {
        node.classList.add('leaving');
        setTimeout(() => node.remove(), 220);
    }, 2600);
}

/** 커스텀 확인 다이얼로그 (window.confirm 대체) */
function askConfirm(message, opts = {}) {
    return new Promise(resolve => {
        el.confirmMessage.textContent = message;
        $('confirmTitle').textContent = opts.title || t('confirm.title');
        el.confirmYes.textContent = opts.yes || t('confirm.yes');
        el.confirmYes.className = opts.primary ? 'primary-btn' : 'danger-btn';
        el.confirmNo.textContent = opts.no || t('confirm.no');
        openOverlay(el.confirmModal);

        const done = answer => {
            closeOverlay(el.confirmModal);
            el.confirmYes.removeEventListener('click', onYes);
            el.confirmNo.removeEventListener('click', onNo);
            el.confirmModal.removeEventListener('click', onBackdrop);
            resolve(answer);
        };
        const onYes = () => done(true);
        const onNo = () => done(false);
        const onBackdrop = e => { if (e.target === el.confirmModal) done(false); };

        el.confirmYes.addEventListener('click', onYes);
        el.confirmNo.addEventListener('click', onNo);
        el.confirmModal.addEventListener('click', onBackdrop);
    });
}

function openOverlay(node) {
    node.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeOverlay(node) {
    node.classList.add('hidden');
    if (document.querySelectorAll('.overlay:not(.hidden)').length === 0) {
        document.body.style.overflow = '';
    }
}

/* ---------- 언어 ---------- */
function applyLanguage() {
    document.documentElement.lang = lang;
    document.title = t('doc.title');
    el.langLabel.textContent = lang === 'ko' ? 'EN' : 'KO';

    document.querySelectorAll('[data-i18n]').forEach(node => {
        const key = node.getAttribute('data-i18n');
        if (I18N[lang][key] !== undefined) node.textContent = I18N[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
        const key = node.getAttribute('data-i18n-placeholder');
        if (I18N[lang][key] !== undefined) node.placeholder = I18N[lang][key];
    });
}

function monthLabel(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    if (lang === 'en') {
        const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${names[m]} ${y}`;
    }
    return `${y}년 ${m + 1}월`;
}

function weekdayLabel(date) {
    const keys = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
    return t(keys[date.getDay()]);
}

function dayLabel(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return lang === 'en' ? `${m}/${d} (${weekdayLabel(date)})` : `${m}월 ${d}일 (${weekdayLabel(date)})`;
}

/* ---------- 렌더링 ---------- */
function renderAll() {
    renderCalendar();
    renderDay();
    renderToday();
}

function renderCalendar() {
    el.monthTitle.textContent = monthLabel(viewMonth);
    el.calendarGrid.innerHTML = '';

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // 날짜별 예약 건수 집계
    const counts = reservations.reduce((acc, r) => {
        acc[r.date] = (acc[r.date] || 0) + 1;
        return acc;
    }, {});

    for (let i = 0; i < firstWeekday; i++) {
        const blank = document.createElement('div');
        blank.className = 'day-cell empty';
        el.calendarGrid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = fmtDate(date);
        const count = counts[key] || 0;

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (date.getDay() === 0) cell.classList.add('is-sun');
        if (date.getDay() === 6) cell.classList.add('is-sat');
        if (isSameDay(date, today)) cell.classList.add('is-today');
        if (isSameDay(date, selectedDate)) cell.classList.add('active');
        if (count > 0) cell.title = lang === 'en' ? `${count} reservation(s)` : `예약 ${count}건`;

        const num = document.createElement('div');
        num.className = 'day-number';
        num.textContent = day;
        cell.appendChild(num);

        const dots = document.createElement('div');
        dots.className = 'res-dots';
        for (let i = 0; i < Math.min(count, 3); i++) dots.appendChild(document.createElement('span'));
        cell.appendChild(dots);

        cell.addEventListener('click', () => {
            selectedDate = date;
            renderCalendar();
            renderDay();
        });

        el.calendarGrid.appendChild(cell);
    }
}

function renderDay() {
    el.dateTitle.textContent = dayLabel(selectedDate);

    const key = fmtDate(selectedDate);
    const prevKey = fmtDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1));
    const now = Date.now();
    // 전날 밤에 시작해 자정을 넘긴 예약도 이 날 목록에 보여줍니다.
    const list = reservations
        .filter(r => r.date === key || (r.date === prevKey && r.isNextDay))
        .sort((a, b) => startTs(a) - startTs(b));

    el.dayCount.textContent = list.length;
    renderOccupancy(key, now);

    if (list.length === 0) {
        el.resList.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-calendar-xmark"></i>
                <p>${escapeHtml(t('main.noSchedule'))}</p>
            </div>`;
        return;
    }

    el.resList.innerHTML = '';
    let anyLocked = false;
    list.forEach(r => {
        const ongoing = startTs(r) <= now && endTs(r) > now;
        const editable = canEdit(r);
        anyLocked ||= !editable;

        // 예약자(베타는 카톡 닉네임)·인원수는 있을 때만 (베타 새 예약엔 인원수가 없음)
        const meta = [
            r.userName && escapeHtml(r.userName),
            r.peopleCount && `${escapeHtml(r.peopleCount)}${escapeHtml(t('unit.people'))}`,
            escapeHtml(r.purpose)
        ].filter(Boolean);
        if (r.seriesId) {
            meta.push(`<i class="fa-solid fa-repeat"></i> ${escapeHtml(t('status.repeat', { weekday: weekdayLabel(parseDate(r.date)) }))}`);
        }
        if (isAdmin()) {
            // 관리자에게만: 마지막으로 추가·수정한 기기의 카톡 닉네임 / 예약자 이름
            meta.push(`<i class="fa-solid fa-user-pen"></i> ${escapeHtml(userLabel(r.editedBy || r.ownerUid))}`);
        }

        const item = document.createElement('div');
        item.className = `res-item${ongoing ? ' is-ongoing' : ''}`;
        item.innerHTML = `
            <div class="res-main">
                <div class="res-time">
                    ${escapeHtml(r.startTime)} – ${escapeHtml(r.endTime)}
                    ${r.isNextDay ? `<span class="tag">${escapeHtml(t(r.date === key ? 'status.nextDay' : 'status.fromPrev'))}</span>` : ''}
                    ${ongoing ? `<span class="status-pill">${escapeHtml(t('status.ongoing'))}</span>` : ''}
                </div>
                <div class="res-team">${escapeHtml(r.teamName)}</div>
                <div class="res-meta">${meta.join('<span class="sep">·</span>')}</div>
            </div>
            ${editable ? `
            <div class="res-actions">
                <button class="edit-btn" type="button"><i class="fa-solid fa-pen"></i>${escapeHtml(t('btn.edit'))}</button>
                <button class="delete-btn" type="button"><i class="fa-regular fa-trash-can"></i>${escapeHtml(t('btn.delete'))}</button>
            </div>` : myProfile === undefined ? '' : `
            <i class="fa-solid fa-lock res-lock" role="img" title="${escapeHtml(t('lock.needKakao'))}" aria-label="${escapeHtml(t('lock.needKakao'))}"></i>`}`;

        item.querySelector('.edit-btn')?.addEventListener('click', () => openEdit(r));
        item.querySelector('.delete-btn')?.addEventListener('click', () => handleDelete(r));
        el.resList.appendChild(item);
    });

    // 잠긴 예약이 있을 때만, 목록 아래에 한 번만 안내
    if (anyLocked && myProfile !== undefined) {   // 연동 여부를 알기 전엔 안내하지 않음
        const note = document.createElement('p');
        note.className = 'res-note';
        note.innerHTML = `<i class="fa-solid fa-lock"></i><span></span>`;
        note.querySelector('span').textContent = t('lock.needKakao');
        el.resList.appendChild(note);
    }
}

/** 선택한 날짜의 24시간 점유 막대 (전날에서 넘어온 예약도 포함) */
function renderOccupancy(dateKey, now) {
    const dayStart = parseDate(dateKey).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    el.occupancyBar.innerHTML = '';

    reservations.forEach(r => {
        const s = Math.max(startTs(r), dayStart);
        const e = Math.min(endTs(r), dayEnd);
        if (e <= s) return;

        const block = document.createElement('div');
        const ongoing = startTs(r) <= now && endTs(r) > now;
        block.className = `occ-block${ongoing ? ' is-ongoing' : ''}`;
        block.style.left = `${((s - dayStart) / (dayEnd - dayStart)) * 100}%`;
        block.style.width = `${((e - s) / (dayEnd - dayStart)) * 100}%`;
        block.title = `${r.teamName} ${r.startTime}–${r.endTime}`;
        el.occupancyBar.appendChild(block);
    });
}

/**
 * 상단 요약 패널 — 오늘 하루의 일정만 보여줍니다.
 * 앞으로의 예약을 전부 늘어놓으면 목록이 길어져 한눈에 안 들어오므로,
 * 이미 끝난 예약까지 포함해 '오늘' 것만 시간순으로 추립니다.
 */
function renderToday() {
    renderMine();
    const now = Date.now();
    const todayKey = fmtDate(new Date());
    const today = reservations
        .filter(r => r.date === todayKey)
        .sort((a, b) => startTs(a) - startTs(b));

    if (today.length === 0) {
        el.upcoming.innerHTML = `<div class="placeholder">${escapeHtml(t('main.noUpcoming'))}</div>`;
        return;
    }

    el.upcoming.innerHTML = '';
    today.forEach(r => {
        const ongoing = startTs(r) <= now && endTs(r) > now;
        const done = endTs(r) <= now;
        // 한 줄짜리 행 — 휴대폰에서도 첫 화면을 다 차지하지 않게
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `today-row${ongoing ? ' is-ongoing' : ''}${done ? ' is-done' : ''}`;
        row.innerHTML = `
            <span class="tr-time">${escapeHtml(r.startTime)}–${escapeHtml(r.endTime)}</span>
            <span class="tr-team">${escapeHtml(r.teamName)}</span>
            ${ongoing ? `<span class="status-pill">${escapeHtml(t('status.ongoing'))}</span>` : ''}`;

        // 누르면 오늘 날짜로 이동 (다른 달을 보고 있었다면 돌아옵니다)
        row.addEventListener('click', () => {
            selectedDate = parseDate(r.date);
            viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            renderAll();
        });

        el.upcoming.appendChild(row);
    });
}

/** 이 기기에서 만든 앞으로의 예약 */
function myUpcoming() {
    if (!store || store.mode !== 'cloud' || !currentUser) return [];
    const now = Date.now();
    return reservations.filter(r => endTs(r) > now && r.ownerUid === currentUser.uid).sort((a, b) => startTs(a) - startTs(b));
}

/** '내 예약 N건' 칩 — 누르면 가장 가까운 내 예약 날짜로 이동 */
function renderMine() {
    const mine = myUpcoming();
    el.mineChip.classList.toggle('hidden', mine.length === 0);
    el.mineChip.textContent = t('main.mine', { count: mine.length });
}

function userLabel(uid) {
    if (ADMIN_UIDS.includes(uid)) return t('log.admin');   // 관리자는 카톡 연동과 상관없이 '관리자'
    const u = users.get(uid);
    return [u?.kakaoNick, u?.name].filter(Boolean).join(' / ') || (uid ? uid.slice(0, 6) : '?');
}

/* ---------- 고정(매주 반복) 예약 ---------- */

/**
 * 첫 날짜부터 종료일까지 같은 요일로 7일 간격 날짜 목록을 만듭니다.
 * 종료일 당일도 포함합니다.
 */
function occurrenceDates(firstDateStr, untilDateStr) {
    const dates = [];
    if (!firstDateStr || !untilDateStr) return dates;

    const until = parseDate(untilDateStr).getTime();
    const cursor = parseDate(firstDateStr);

    while (cursor.getTime() <= until && dates.length < MAX_OCCURRENCES + 1) {
        dates.push(fmtDate(cursor));
        cursor.setDate(cursor.getDate() + 7);
    }
    return dates;
}

/** 수정 중인 예약 (없으면 null) */
function editingRes() {
    return editingId ? reservations.find(r => r.id === editingId) ?? null : null;
}

/**
 * 예약 유형(한 번만/고정) 전환.
 * 수정 중일 때:
 *   한 번만 → 고정   이 예약을 첫 회차로 새 고정 예약을 만듦 (반복 종료일 표시)
 *   고정 → 고정      이 회차만 수정
 *   고정 → 한 번만   이 회차만 남기고 남은 회차 취소
 */
function setResType(type) {
    resType = type === 'weekly' ? 'weekly' : 'once';

    el.resTypeGroup.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.type === resType);
    });

    const editing = editingRes();
    const makingSeries = resType === 'weekly' && !editing?.seriesId;
    el.repeatUntilField.classList.toggle('hidden', !makingSeries);
    el.dateLabel.textContent = t(makingSeries ? 'modal.labelFirstDate' : 'modal.labelDate');

    if (makingSeries && !el.repeatUntil.value) {
        el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;
    }

    if (editing?.seriesId) {
        el.editScopeText.textContent = resType === 'weekly'
            ? t('modal.editScopeSeries', { date: dayLabel(parseDate(editing.date)) })
            : t('modal.editToOnce', { count: seriesLeftovers(editing).length });
        el.editScopeHint.classList.remove('hidden');
    } else {
        el.editScopeHint.classList.add('hidden');
    }
    updateRepeatSummary();
}

/** "11월 20일까지 매주 월요일 · 총 9회" 안내 갱신 */
function updateRepeatSummary() {
    if (el.repeatUntilField.classList.contains('hidden')) return;

    const first = el.date.value;
    const until = el.repeatUntil.value;
    if (!first || !until) {
        el.repeatSummary.textContent = '';
        return;
    }

    if (parseDate(until).getTime() < parseDate(first).getTime()) {
        el.repeatSummary.textContent = t('modal.repeatInvalid');
        el.repeatSummary.classList.add('warn');
        return;
    }

    const dates = occurrenceDates(first, until);
    el.repeatSummary.classList.toggle('warn', dates.length > MAX_OCCURRENCES);
    el.repeatSummary.textContent = t('modal.repeatSummary', {
        until: dayLabel(parseDate(until)).replace(/\s*\(.+\)$/, ''),
        weekday: weekdayLabel(parseDate(first)),
        count: dates.length
    });
}

/* ---------- 시간 선택 ---------- */
function buildTimeOptions() {
    const times = [];
    for (let h = 0; h < 24; h++) {
        times.push(`${String(h).padStart(2, '0')}:00`);
        times.push(`${String(h).padStart(2, '0')}:30`);
    }
    times.forEach(time => el.start.add(new Option(time, time)));
    times.slice(1).forEach(time => el.end.add(new Option(time, time)));
    el.end.add(new Option('24:00', '24:00'));

    el.start.value = '18:00';
    el.end.value = '20:00';
}

/** 종료시각이 익일로 넘어가는지 판정 */
function isEndNextDay(start, end) {
    return end !== '24:00' && end < start;
}

/**
 * 겹침 검사에서 뺄 예약 — 수정 중인 예약 본인,
 * 그리고 고정 → 한 번 전환이면 같은 저장에서 취소될 나머지 회차
 */
function overlapIgnoreIds() {
    const ids = new Set(editingId ? [editingId] : []);
    const editing = editingRes();
    if (editing?.seriesId && resType === 'once') seriesLeftovers(editing).forEach(r => ids.add(r.id));
    return ids;
}

/** 이미 예약된 시간대를 선택할 수 없도록 옵션을 비활성화합니다. */
function refreshTimeOptions() {
    const dateStr = el.date.value;
    if (!dateStr) return;

    const ignoreIds = overlapIgnoreIds();
    const others = reservations
        .filter(r => !ignoreIds.has(r.id))
        .map(r => ({ s: startTs(r), e: endTs(r) }));

    // 1) 시작 시간: 다른 예약 구간 안이거나, 새 예약인데 이미 끝난 30분 칸이면 선택 불가
    const pastCut = editingId ? -Infinity : Date.now() - 30 * 60 * 1000;
    Array.from(el.start.options).forEach(opt => {
        const point = ts(dateStr, opt.value, false);
        opt.disabled = point <= pastCut || others.some(o => point >= o.s && point < o.e);
    });
    if (el.start.selectedOptions[0]?.disabled) {
        const first = Array.from(el.start.options).find(o => !o.disabled);
        if (first) el.start.value = first.value;
    }

    // 2) 종료 시간: 시작 이후 ~ 다음 예약 시작 전까지, 최대 24시간
    const start = el.start.value;
    const sTs = ts(dateStr, start, false);
    const nextBooking = others.filter(o => o.s >= sTs).sort((a, b) => a.s - b.s)[0];
    const maxEnd = Math.min(sTs + 24 * 60 * 60 * 1000, nextBooking ? nextBooking.s : Infinity);

    Array.from(el.end.options).forEach(opt => {
        const eTs = ts(dateStr, opt.value, isEndNextDay(start, opt.value));
        opt.disabled = eTs <= sTs || eTs > maxEnd;
    });
    if (el.end.selectedOptions[0]?.disabled) {
        const first = Array.from(el.end.options).find(o => !o.disabled);
        if (first) el.end.value = first.value;
    }

    el.nextDayHint.classList.toggle('hidden', !isEndNextDay(start, el.end.value));
}

/**
 * 새 예약의 기본 시간: 18:00(오늘이면 지금 이후 30분 단위) 이후 첫 빈 시간부터 최대 2시간.
 * 그 뒤로 빈 시간이 없으면 그날 첫 빈 시간으로.
 */
function pickDefaultTimes() {
    const dateStr = el.date.value;
    if (!dateStr) return;
    let from = ts(dateStr, '18:00');
    if (dateStr === fmtDate(new Date())) from = Math.max(from, Math.ceil(Date.now() / 1800000) * 1800000);

    refreshTimeOptions();
    const starts = Array.from(el.start.options).filter(o => !o.disabled);
    const start = starts.find(o => ts(dateStr, o.value) >= from) ?? starts[0];
    if (!start) return;
    el.start.value = start.value;
    refreshTimeOptions();

    const sTs = ts(dateStr, start.value);
    const endTsOf = o => ts(dateStr, o.value, isEndNextDay(start.value, o.value));
    const ends = Array.from(el.end.options).filter(o => !o.disabled && endTsOf(o) <= sTs + 2 * 60 * 60 * 1000);
    const end = ends.sort((a, b) => endTsOf(b) - endTsOf(a))[0];
    if (end) el.end.value = end.value;
    el.nextDayHint.classList.toggle('hidden', !isEndNextDay(el.start.value, el.end.value));
}

/* ---------- 모달 ---------- */
function openCreate(date) {
    // 베타: 예약도 카톡 닉네임을 연동해야 할 수 있습니다 (예약자 이름 대신 닉네임이 기록됨)
    if (store?.mode === 'cloud' && myProfile === undefined && !isAdmin()) {
        toast(t('main.loading'));   // 연동 여부를 아직 모름 — 잠시 뒤 다시
        return;
    }
    if (store?.mode === 'cloud' && !canEdit()) {
        askKakao();
        return;
    }
    editingId = null;
    el.form.reset();
    el.date.value = fmtDate(date);
    el.date.min = fmtDate(new Date());
    el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;
    setResType('once');

    el.modalTitle.textContent = t('modal.newResTitle');
    el.submitBtn.textContent = t('modal.btnSubmit');
    pickDefaultTimes();
    openOverlay(el.resModal);
}

function openEdit(res) {
    editingId = res.id;
    el.date.value = res.date;
    el.date.min = '';
    $('teamName').value = res.teamName;
    $('purpose').value = res.purpose;
    el.repeatUntil.value = res.repeatUntil || DEFAULT_REPEAT_UNTIL;
    setResType(res.seriesId ? 'weekly' : 'once');

    refreshTimeOptions();
    el.start.value = res.startTime;
    refreshTimeOptions();
    el.end.value = res.endTime;
    el.nextDayHint.classList.toggle('hidden', !res.isNextDay);

    el.modalTitle.textContent = t('modal.editResTitle');
    el.submitBtn.textContent = t('modal.btnEdit');
    openOverlay(el.resModal);
}

function closeReservationModal() {
    closeOverlay(el.resModal);
    el.form.reset();
    editingId = null;
    el.nextDayHint.classList.add('hidden');
    Array.from(el.start.options).forEach(o => (o.disabled = false));
    Array.from(el.end.options).forEach(o => (o.disabled = false));
    el.start.value = '18:00';
    el.end.value = '20:00';
    el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;
    setResType('once');
}

/* ---------- 등록 / 수정 / 삭제 ---------- */
async function handleSubmit(event) {
    event.preventDefault();

    const date = el.date.value;
    const startTime = el.start.value;
    const endTime = el.end.value;

    if (startTime === endTime) {
        toast(t('err.sameTime'), 'error');
        return;
    }

    const isNextDay = isEndNextDay(startTime, endTime);

    if (!editingId && ts(date, startTime) + 30 * 60 * 1000 <= Date.now()) {
        toast(t('err.past'), 'error');
        pickDefaultTimes();
        return;
    }

    const base = {
        startTime,
        endTime,
        isNextDay,
        teamName: $('teamName').value.trim(),
        purpose: $('purpose').value
    };

    const editing = editingRes();
    if (editingId && !editing) {
        // 수정하는 사이 다른 기기에서 지워진 경우
        closeReservationModal();
        return;
    }
    // 새 예약의 예약자는 카톡 닉네임(관리자는 '관리자')으로 자동 기록. 수정할 때는 원래 예약자 그대로
    if (!editing) {
        const booker = isAdmin() ? '관리자' : myProfile?.kakaoNick?.slice(0, 20);
        if (booker) base.userName = booker;
    }

    const leftovers = editing?.seriesId && resType === 'once' ? seriesLeftovers(editing) : [];
    const ignoreIds = overlapIgnoreIds();

    /** 해당 날짜에 이 시간대가 비어 있는지 */
    const isFree = dateStr => {
        const s = ts(dateStr, startTime, false);
        const e = ts(dateStr, endTime, isNextDay);
        return !reservations.some(r => !ignoreIds.has(r.id) && s < endTs(r) && e > startTs(r));
    };

    // ----- 저장할 내용 만들기 (store.write 한 번으로 저장) -----
    let ops;
    let doneMsg;

    if (resType === 'weekly' && !editing?.seriesId) {
        // 새 고정 예약, 또는 한 번 예약 → 고정 예약 전환
        const until = el.repeatUntil.value;
        if (!until || parseDate(until).getTime() < parseDate(date).getTime()) {
            toast(t('err.repeatRange'), 'error');
            return;
        }

        const allDates = occurrenceDates(date, until);
        if (allDates.length > MAX_OCCURRENCES) {
            toast(t('err.tooMany', { max: MAX_OCCURRENCES }), 'error');
            return;
        }

        // 전환할 때 첫 회차는 지금 이 예약 자체라 건너뛸 수 없습니다.
        if (editing && !isFree(date)) {
            toast(t('err.overlap'), 'error');
            refreshTimeOptions();
            return;
        }

        const free = allDates.filter(isFree);
        const taken = allDates.filter(d => !isFree(d));

        if (free.length === 0) {
            toast(t('err.allOverlap'), 'error');
            return;
        }

        // 일부 주차만 겹치면 건너뛸지 물어봅니다 (시험기간에 이미 다른 예약이 있는 경우 등)
        if (taken.length > 0) {
            const shown = taken.slice(0, 4).map(d => dayLabel(parseDate(d)).replace(/\s*\(.+\)$/, ''));
            if (taken.length > 4) shown.push('…');
            const ok = await askConfirm(
                t('confirm.skip', { skipped: taken.length, dates: shown.join(', '), count: free.length }),
                { title: t('confirm.skipTitle'), yes: t('confirm.skipYes') }
            );
            if (!ok) return;
        }

        const seriesId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const payloads = free.map(d => ({ ...base, date: d, seriesId, repeatUntil: until }));
        doneMsg = t('msg.savedSeries', { count: payloads.length });

        if (editing) {
            // 이 예약을 첫 회차로 두고 나머지 회차를 같은 공유 링크로 묶어 추가합니다.
            const [first, ...rest] = payloads;
            ops = { update: [[editing.id, first]], add: rest };
        } else {
            ops = { add: payloads };
        }
    } else {
        if (!isFree(date)) {
            toast(t('err.overlap'), 'error');
            refreshTimeOptions();
            return;
        }

        if (!editing) {
            ops = { add: [{ ...base, date }] };
            doneMsg = t('msg.saved');
        } else if (editing.seriesId && resType === 'once') {
            // 고정 → 한 번: 이 회차만 남기고 아직 시작 안 한 회차는 취소합니다.
            if (leftovers.length > 0) {
                const ok = await askConfirm(t('confirm.toOnce', { count: leftovers.length }), {
                    title: t('confirm.toOnceTitle'),
                    yes: t('confirm.toOnceYes'),
                    no: t('modal.btnCancel')
                });
                if (!ok) return;
            }
            ops = {
                update: [[editing.id, { ...base, date, seriesId: undefined, repeatUntil: undefined }]],
                remove: leftovers.map(r => r.id)
            };
            doneMsg = t('msg.updated');
        } else {
            // 고정 예약이라도 수정은 이 회차 하나만 반영합니다.
            ops = { update: [[editing.id, { ...base, date }]] };
            doneMsg = t('msg.updated');
        }
    }

    // ----- 저장 -----
    const originalLabel = el.submitBtn.textContent;
    el.submitBtn.disabled = true;
    el.submitBtn.textContent = t('btn.saving');

    try {
        await store.write(ops);
        toast(doneMsg, 'success');

        selectedDate = parseDate(date);
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        closeReservationModal();
        renderAll();
    } catch (err) {
        console.error(err);
        // 새 예약은 누구나 할 수 있으니, 거부되면 "링크를 받으라"가 아니라 설정 문제로 안내합니다.
        const denied = editing ? 'err.permission' : 'err.permissionNew';
        toast(t(err?.code === 'permission-denied' ? denied : 'err.save'), 'error');
    } finally {
        el.submitBtn.disabled = false;
        el.submitBtn.textContent = originalLabel;
    }
}

async function handleDelete(res) {
    // 고정 예약이면 "이번 주만 / 전체" 중에서 고르게 합니다.
    if (res.seriesId) {
        openSeriesDelete(res);
        return;
    }

    const ok = await askConfirm(t('confirm.body', { team: res.teamName }));
    if (!ok) return;
    await removeOne(res.id);
}

async function removeOne(id) {
    try {
        await store.write({ remove: [id] });
        toast(t('msg.deleted'), 'success');
    } catch (err) {
        console.error(err);
        toast(t(err?.code === 'permission-denied' ? 'err.permission' : 'err.delete'), 'error');
    }
}

/** 고정 예약 취소 범위 선택 다이얼로그 */
function openSeriesDelete(res) {
    const siblings = reservations.filter(r => r.seriesId === res.seriesId && canEdit(r));
    const dateText = dayLabel(parseDate(res.date));

    el.seriesMessage.textContent = t('series.message', { team: res.teamName });
    el.seriesOnlyDesc.textContent = t('series.onlyDesc', { date: dateText });
    el.seriesAllDesc.textContent = t('series.allDesc', { count: siblings.length });

    const close = () => {
        closeOverlay(el.seriesModal);
        el.seriesOnlyBtn.removeEventListener('click', onOnly);
        el.seriesAllBtn.removeEventListener('click', onAll);
        el.seriesCancelBtn.removeEventListener('click', close);
        el.seriesCloseBtn.removeEventListener('click', close);
        el.seriesModal.removeEventListener('click', onBackdrop);
    };
    const onBackdrop = e => { if (e.target === el.seriesModal) close(); };

    const onOnly = async () => {
        close();
        await removeOne(res.id);
    };

    const onAll = async () => {
        close();
        const ok = await askConfirm(
            t('series.confirmAll', { team: res.teamName, count: siblings.length })
        );
        if (!ok) return;
        try {
            await store.write({ remove: siblings.map(r => r.id) });
            toast(t('msg.deletedSeries', { count: siblings.length }), 'success');
        } catch (err) {
            console.error(err);
            toast(t(err?.code === 'permission-denied' ? 'err.permission' : 'err.delete'), 'error');
        }
    };

    el.seriesOnlyBtn.addEventListener('click', onOnly);
    el.seriesAllBtn.addEventListener('click', onAll);
    el.seriesCancelBtn.addEventListener('click', close);
    el.seriesCloseBtn.addEventListener('click', close);
    el.seriesModal.addEventListener('click', onBackdrop);

    openOverlay(el.seriesModal);
}

/* 카카오 JavaScript SDK — 카톡 닉네임 연동(카카오 로그인)에 씁니다. */
const KAKAO_SDK = {
    src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js',
    integrity: 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy'
};
let kakaoLoading = null;

function loadKakao() {
    if (!KAKAO_JS_KEY) return Promise.resolve(false);
    kakaoLoading ??= new Promise(resolve => {
        const s = document.createElement('script');
        s.src = KAKAO_SDK.src;
        s.integrity = KAKAO_SDK.integrity;
        s.crossOrigin = 'anonymous';
        s.onload = () => {
            try {
                if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
                resolve(true);
            } catch (err) {
                console.error('[kakao] 초기화 실패:', err);
                resolve(false);
            }
        };
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
    return kakaoLoading;
}

/* ---------- 카톡 닉네임 ----------
   처음 이 페이지를 열면(PC 포함) 카톡 닉네임 연동을 한 번 안내합니다. 연동하면 이 기기(uid)에 닉네임이 붙고,
   베타 예약을 수정·취소할 수 있게 됩니다. 관리자가 누가 고쳤는지 보는 용도.
   안내에서 [취소]하면 다시 묻지 않고, 하단 [카톡 닉네임 연결]로 언제든 연동할 수 있습니다.
   ponytail: 서버가 없어 닉네임은 기기가 스스로 저장하는 값(위조 가능) — 검증이 필요해지면 Firebase OIDC(카카오) 연결 */

const kakaoRedirectUri = () => `${location.origin}${location.pathname}`;   // 콘솔에 등록한 주소와 같아야 함

/** 배포 주소(https)에서만 — 로컬 개발 주소는 카카오 콘솔에 등록돼 있지 않습니다. */
function kakaoLinkable() {
    return location.protocol === 'https:' && !!KAKAO_JS_KEY && store?.mode === 'cloud' && !authUnavailable;
}

function updateKakaoBtn() {
    el.kakaoLinkBtn.classList.toggle('hidden', !kakaoLinkable() || myProfile === undefined || kakaoLinked());
}

/** 첫 방문 안내 — 기기마다 한 번만 (관리자·이미 연동한 기기는 묻지 않음) */
async function askKakaoOnce() {
    if (myProfile === undefined || !kakaoLinkable() || isAdmin() || kakaoLinked() || localStorage.getItem(LS_KAKAO_ASKED)) return;
    localStorage.setItem(LS_KAKAO_ASKED, '1');
    askKakao();
}

/** 카톡 연동 안내창 — [카카오톡 연동]이면 연동, [취소]면 하단 버튼 안내 (예약하려 할 때도 띄움) */
async function askKakao() {
    if (!kakaoLinkable()) {
        toast(t('kakao.later'));
        return;
    }
    const ok = await askConfirm(t('kakao.ask'), {
        title: t('kakao.askTitle'), yes: t('kakao.askYes'), no: t('modal.btnCancel'), primary: true
    });
    if (ok) startKakaoLink();
    else toast(t('kakao.later'));
}

/** 카카오 로그인으로 이동 (돌아오면 handleKakaoReturn 이 이어받음) */
async function startKakaoLink() {
    await userReady;   // 돌아왔을 때 같은 익명 uid 여야 하므로 로그인이 끝난 뒤에 이동
    if (!(await loadKakao())) {
        toast(t('kakao.fail'), 'error');
        return;
    }
    const state = randomToken();   // 로그인 CSRF 방지용 무작위 값
    localStorage.setItem(LS_KAKAO_STATE, state);
    localStorage.setItem(LS_KAKAO_ASKED, '1');   // 버튼으로 연동해도 첫 방문 안내는 다시 띄우지 않음
    window.Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri(), state });
}

/** 카카오에서 돌아왔으면(?code= / ?error=) 닉네임을 저장합니다. */
async function handleKakaoReturn() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return;

    const state = localStorage.getItem(LS_KAKAO_STATE);
    localStorage.removeItem(LS_KAKAO_STATE);
    history.replaceState(null, '', location.pathname);
    if (!state || q.get('state') !== state) return;   // 내가 시작하지 않은 로그인은 무시
    if (q.has('error')) {
        toast(t('kakao.later'));   // 동의 화면에서 취소
        return;
    }

    try {
        // 인가 코드 → 토큰 (JavaScript 키에는 클라이언트 시크릿이 없어 브라우저에서 바로 교환)
        const res = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body: new URLSearchParams({
                grant_type: 'authorization_code', client_id: KAKAO_JS_KEY,
                redirect_uri: kakaoRedirectUri(), code: q.get('code')
            })
        });
        const token = await res.json();
        if (!token.access_token) throw new Error(token.error_description || token.error || `HTTP ${res.status}`);
        if (!(await loadKakao())) throw new Error('sdk');
        window.Kakao.Auth.setAccessToken(token.access_token);

        // 카톡 프로필 닉네임, 안 되면 카카오계정 닉네임
        let nick = '';
        try {
            nick = (await window.Kakao.API.request({ url: '/v1/api/talk/profile' })).nickName ?? '';
        } catch (err) {
            console.warn('[kakao] 카톡 프로필 조회 실패, 계정 닉네임으로 대신:', err);
        }
        if (!nick) {
            const me = await window.Kakao.API.request({ url: '/v2/user/me' });
            nick = me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? '';
        }
        if (!nick) throw new Error('no-nickname');

        await store.saveProfile({ kakaoNick: nick.slice(0, 40) });
        toast(t('kakao.linked', { nick }), 'success');
    } catch (err) {
        console.error('[kakao] 닉네임 연결 실패:', err);
        toast(t('kakao.fail'), 'error');
    }
}

/* ---------- 관리자 ---------- */

/** 로그인 상태에 맞춰 하단 관리자 영역과 헤더 배지를 갱신 */
function updateAdminUI() {
    // 익명 로그인이 실패해도 관리자 버튼은 보여줍니다. (누르면 원인을 안내)
    const cloud = store && store.mode === 'cloud';
    const google = cloud && currentUser && !currentUser.isAnonymous;

    el.adminLoginBtn.classList.toggle('hidden', !cloud || google);
    el.adminInfo.classList.toggle('hidden', !google);
    el.adminBadge.classList.toggle('hidden', !isAdmin());
    updateKakaoBtn();

    // 관리자면 기기별 이름과 수정·취소 기록을 받아 누가 무엇을 했는지 표시
    if (isAdmin() && !unwatchUsers) {
        const unUsers = store.watchUsers(next => {
            users = next;
            renderDay();
            renderLogs();
        });
        const unLogs = store.watchLogs(next => {
            logs = next;
            renderLogs();
        });
        unwatchUsers = () => { unUsers(); unLogs(); };
    } else if (!isAdmin() && unwatchUsers) {
        unwatchUsers();
        unwatchUsers = null;
        users = new Map();
        logs = [];
    }
    renderLogs();

    if (!google) return;

    if (isAdmin()) {
        el.adminInfoText.textContent = t('admin.signedIn');
        el.adminUidRow.classList.add('hidden');
    } else {
        el.adminInfoText.textContent = t('admin.notRegistered', { email: currentUser.email || '' });
        el.adminUid.textContent = currentUser.uid;
        el.adminUidRow.classList.remove('hidden');
    }
}

async function handleAdminLogin() {
    const ok = await askConfirm(t('admin.loginConfirm'), {
        title: t('admin.loginTitle'),
        yes: t('admin.loginYes'),
        no: t('modal.btnCancel')
    });
    if (!ok) return;

    // 카카오톡 등 앱 내 브라우저는 구글이 로그인을 차단합니다.
    if (/KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent)) {
        toast(t('admin.inApp'), 'error');
        return;
    }

    try {
        await store.signInWithGoogle();
    } catch (err) {
        console.error('[admin] 로그인 실패:', err);
        const code = err?.code || err?.message || 'unknown';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        const key = {
            'auth/popup-blocked': 'admin.popupBlocked',
            'auth/unauthorized-domain': 'admin.domain',
            'auth/operation-not-allowed': 'admin.notEnabled',
            'auth/configuration-not-found': 'admin.notEnabled'
        }[code];
        toast(key ? t(key) : t('admin.loginFail', { code }), 'error');
    }
}

/** 기록의 날짜 'YYYY-MM-DD' (기기 시간대 기준) */
const logDate = l => (l.at?.toDate ? fmtDate(l.at.toDate()) : '');

/** 규칙 테스트 기록을 뺀, 화면에 보일 기록 */
const visibleLogs = () => logs.filter(l => typeof l.res?.date === 'string' && logDate(l) && !l.res.teamName.startsWith('[TEST]'));

/** 기록이 있는 날짜들 (최신순) */
const logDays = () => [...new Set(visibleLogs().map(logDate))];

/** 기록이 있는 날짜 중 step 만큼 이동 (+1 이전 날, -1 다음 날) */
function stepLogDay(step) {
    const days = logDays();
    const i = Math.max(0, days.indexOf(logDay ?? days[0]));
    return days[Math.min(days.length - 1, Math.max(0, i + step))] ?? null;
}

/**
 * 관리자에게만: 예약표 아래 '최근 수정·취소' 카드 — 하루씩 한 장, ◀ ▶ 로 넘김.
 * 한 번에 저장된 기록은 한 줄로 — 고정 예약 전체 취소는 "[팀] 고정 예약 전체 취소 (N회)".
 */
function renderLogs() {
    el.logCard.classList.toggle('hidden', !isAdmin());
    if (!isAdmin()) return;

    const days = logDays();
    if (!days.includes(logDay)) logDay = days[0] ?? null;   // 처음엔 가장 최근 날짜
    const i = days.indexOf(logDay);
    el.logPrev.disabled = i < 0 || i >= days.length - 1;
    el.logNext.disabled = i <= 0;
    el.logDayLabel.textContent = logDay ? dayLabel(parseDate(logDay)) : '';

    const groups = new Map();   // batch → 기록들 (최신순이라 먼저 나온 batch 가 최근)
    visibleLogs().filter(l => logDate(l) === logDay)
        .forEach(l => groups.set(l.batch, [...(groups.get(l.batch) ?? []), l]));
    el.logClearBtn.classList.toggle('hidden', groups.size === 0);
    if (groups.size === 0) {
        el.logList.innerHTML = `<li class="placeholder">${escapeHtml(t('log.empty'))}</li>`;
        return;
    }

    const slot = r => `${dayLabel(parseDate(r.date))} ${r.startTime}–${r.endTime}`;
    el.logList.innerHTML = [...groups.values()].map(group => {
        const deletes = group.filter(l => l.action === 'delete');
        const updates = group.filter(l => l.action === 'update');
        const team = (updates[0] ?? deletes[0]).res.teamName;
        const what = updates.length && deletes.length ? t('log.toOnce', { team, slot: slot(updates[0].res), n: deletes.length })
            : deletes.length > 1 ? t('log.seriesAll', { team, n: deletes.length })
            : deletes.length ? t('log.one', { team, slot: slot(deletes[0].res) })
            : t('log.edit', { team, slot: slot(updates[0].res) });
        const action = deletes.length ? 'delete' : 'update';

        const at = group[0].at.toDate();
        const when = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
        return `
            <li class="log-item">
                <span class="tag log-action${action === 'delete' ? ' is-delete' : ''}">${escapeHtml(t(`log.${action}`))}</span>
                <span>${escapeHtml(what)}</span>
                <span class="log-who"><i class="fa-solid fa-user-pen"></i> ${escapeHtml(userLabel(group[0].uid))} · ${escapeHtml(when)}</span>
            </li>`;
    }).join('');
}

/** 관리자: 보고 있는 날짜의 기록만 삭제 (규칙 테스트 기록 포함, 다른 날짜는 그대로) */
async function clearLogDay() {
    const day = logDay;
    const ids = logs.filter(l => logDate(l) === day).map(l => l.id);
    if (!day || ids.length === 0) return;
    const dayText = dayLabel(parseDate(day));
    const ok = await askConfirm(t('log.clearConfirm', { day: dayText, n: ids.length }), {
        title: t('log.clearTitle'), yes: t('log.clearYes'), no: t('modal.btnCancel')
    });
    if (!ok) return;
    try {
        await store.deleteLogs(ids);
        toast(t('log.cleared', { day: dayText }), 'success');
    } catch (err) {
        console.error('[admin] 기록 삭제 실패:', err);
        toast(t('log.clearFail'), 'error');
    }
}

async function handleAdminLogout() {
    await store.signOut();
    toast(t('admin.loggedOut'));
}

async function copyUid() {
    try {
        await navigator.clipboard.writeText(el.adminUid.textContent);
        toast(t('admin.copied'), 'success');
    } catch {
        // 클립보드 권한이 없으면 텍스트를 선택해 둡니다.
        const range = document.createRange();
        range.selectNodeContents(el.adminUid);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/* ---------- 테마 ---------- */
function applyTheme(theme) {
    const value = THEMES.includes(theme) ? theme : 'default';
    document.documentElement.dataset.theme = value;
    localStorage.setItem(LS_THEME, value);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.theme === value);
    });
}

/* ---------- 이벤트 바인딩 ---------- */
function bindEvents() {
    el.prevMonth.addEventListener('click', () => {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
        renderCalendar();
    });
    el.nextMonth.addEventListener('click', () => {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        renderCalendar();
    });
    el.todayBtn.addEventListener('click', () => {
        selectedDate = new Date();
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        renderAll();
    });

    el.quickBtn.addEventListener('click', () => openCreate(selectedDate));
    el.dayReserveBtn.addEventListener('click', () => openCreate(selectedDate));
    el.mineChip.addEventListener('click', () => {
        const next = myUpcoming()[0];
        if (!next) return;
        selectedDate = parseDate(next.date);
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        renderAll();
    });
    el.kakaoLinkBtn.addEventListener('click', startKakaoLink);
    el.closeModalBtn.addEventListener('click', closeReservationModal);
    el.cancelBtn.addEventListener('click', closeReservationModal);
    el.resModal.addEventListener('click', e => { if (e.target === el.resModal) closeReservationModal(); });
    el.form.addEventListener('submit', handleSubmit);

    el.date.addEventListener('change', () => {
        if (editingId) refreshTimeOptions();
        else pickDefaultTimes();   // 새 예약이면 바뀐 날짜에서 다시 빈 시간을 골라줌
        updateRepeatSummary();
    });
    el.repeatUntil.addEventListener('change', updateRepeatSummary);
    el.resTypeGroup.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setResType(btn.dataset.type);
            refreshTimeOptions();   // 전환에 따라 겹침 검사 대상이 바뀝니다
        });
    });
    el.start.addEventListener('change', refreshTimeOptions);
    el.end.addEventListener('change', () => {
        el.nextDayHint.classList.toggle('hidden', !isEndNextDay(el.start.value, el.end.value));
    });

    el.langBtn.addEventListener('click', () => {
        lang = lang === 'ko' ? 'en' : 'ko';
        localStorage.setItem(LS_LANG, lang);
        applyLanguage();
        el.modalTitle.textContent = t(editingId ? 'modal.editResTitle' : 'modal.newResTitle');
        el.submitBtn.textContent = t(editingId ? 'modal.btnEdit' : 'modal.btnSubmit');
        setResType(resType);
        updateAdminUI();
        renderAll();
    });

    el.adminLoginBtn.addEventListener('click', handleAdminLogin);
    el.adminLogoutBtn.addEventListener('click', handleAdminLogout);
    el.copyUidBtn.addEventListener('click', copyUid);

    el.themeBtn.addEventListener('click', () => openOverlay(el.themeModal));
    el.closeThemeBtn.addEventListener('click', () => closeOverlay(el.themeModal));
    el.themeModal.addEventListener('click', e => { if (e.target === el.themeModal) closeOverlay(el.themeModal); });
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });

    // 관리자: 기록 카드의 날짜 넘기기 (logDay 는 기록이 있는 날짜만 오갑니다)
    el.logPrev.addEventListener('click', () => { logDay = stepLogDay(1); renderLogs(); });
    el.logNext.addEventListener('click', () => { logDay = stepLogDay(-1); renderLogs(); });
    el.logClearBtn.addEventListener('click', clearLogDay);

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!el.seriesModal.classList.contains('hidden')) closeOverlay(el.seriesModal);
        else if (!el.resModal.classList.contains('hidden')) closeReservationModal();
        else if (!el.themeModal.classList.contains('hidden')) closeOverlay(el.themeModal);
    });
}

/* ---------- 시작 ---------- */
async function init() {
    applyTheme(localStorage.getItem(LS_THEME) || 'default');
    applyLanguage();
    buildTimeOptions();
    bindEvents();
    renderCalendar();
    renderDay();

    store = await createStore((list, err) => {
        if (err) toast(t('err.load'), 'error');
        reservations = list;
        renderAll();
        // 모달이 열려 있으면 선택 가능 시간도 갱신
        if (!el.resModal.classList.contains('hidden')) refreshTimeOptions();
    });

    el.banner.classList.toggle('hidden', store.mode !== 'local');

    // 로그인 상태(익명/구글)가 바뀌면 권한 표시를 다시 그립니다.
    store.onUser((user, err) => {
        currentUser = user;
        authUnavailable = !!err && !user;
        if (user) resolveUserReady();
        updateAdminUI();
        renderDay();
        renderMine();
    });

    // 카카오에서 돌아온 경우를 먼저 처리한 뒤, 이 기기의 카톡 연동 여부로 수정 버튼·첫 방문 안내를 정합니다.
    await handleKakaoReturn();
    store.onProfile(profile => {
        myProfile = profile;
        renderDay();
        updateKakaoBtn();
        askKakaoOnce();
    });

    // 진행중 표시를 1분마다 갱신
    setInterval(() => {
        renderDay();
        renderToday();
    }, 60_000);
}

init();
