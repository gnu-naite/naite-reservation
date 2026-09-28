/* ============================================================
   나이테 동아리방 예약 — 메인 로직
   ============================================================ */

import { createStore, newShare } from './store.js?v=3';
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
        "modal.labelName": "예약자 이름",
        "modal.phName": "홍길동",
        "modal.labelCount": "사용 인원수",
        "modal.phCount": "예: 5",
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
        "err.permission": "권한이 없습니다. 예약한 사람에게 공유 링크를 받아주세요.",
        "err.permissionNew": "서버가 예약 저장을 거부했습니다. 관리자에게 알려주세요. (보안 규칙 설정 확인 필요)",
        "modal.shareNote": "새 팀이면 팀 톡방에 올릴 팀 링크가 만들어집니다.",
        "modal.newTeam": "➕ 새 팀 만들기",
        "main.bookDay": "이 날 예약",
        "main.mine": "내 예약 {count}건",
        "status.fromPrev": "전날부터",
        "err.past": "이미 지난 시간은 예약할 수 없습니다.",
        "confirm.dupTeamTitle": "같은 이름의 예약",
        "confirm.dupTeam": "[{team}] 이름으로 된 예약이 이미 있습니다.\n\n같은 팀이면 팀 톡방 공지의 팀 링크를 먼저 열어주세요. 그러면 목록에서 고를 수 있습니다.\n\n다른 팀이라면 새 팀으로 만들까요?",
        "confirm.dupTeamYes": "새 팀 만들기",
        "share.titleTeam": "팀 링크",
        "share.bodyTeam": "팀 톡방에 올리고 공지로 고정해 두세요. 링크를 한 번 연 팀원은 이 팀의 모든 예약을 수정·취소할 수 있습니다.",
        "share.kakaoTextTeam": "[{team}] 동아리방 예약 팀 링크\n버튼을 한 번 누르면 이 팀의 모든 예약을 수정·취소할 수 있습니다.",
        "grant.doneTeamLink": "[{team}] 팀 권한이 생겼습니다. 이 팀의 모든 예약을 수정·취소할 수 있습니다.",
        "kakao.connect": "카톡 닉네임 연결",
        "kakao.linked": "카톡 닉네임 '{nick}'(으)로 연결했습니다.",
        "kakao.fail": "카톡 닉네임 연결에 실패했습니다.",
        "admin.logs": "로그 보기",
        "log.title": "수정·취소 기록",
        "log.empty": "아직 기록이 없습니다.",
        "log.fail": "기록을 불러오지 못했습니다.",
        "log.delete": "취소",
        "log.update": "수정",
        "log.more": "외 {n}건",
        "confirm.toOnceTitle": "한 번 예약으로 변경",
        "confirm.toOnce": "이 회차만 남기고, 아직 남은 고정 예약 {count}회를 취소할까요? 되돌릴 수 없습니다.",
        "confirm.toOnceYes": "변경하기",

        "lock.notOwner": "예약한 사람에게 공유 링크를 받으면 수정·취소할 수 있습니다.",
        "btn.share": "공유",
        "share.title": "예약 완료",
        "share.titleCard": "수정 링크 공유",
        "share.body": "이 링크를 팀 카톡방에 보내면, 링크를 연 기기에서도 이 예약을 수정·취소할 수 있습니다.",
        "share.copy": "복사하기",
        "share.copiedBtn": "복사됨",
        "share.send": "카카오톡으로 보내기",
        "share.text": "[{team}] 동아리방 예약 수정 링크",
        "share.kakaoText": "[{team}] 동아리방 예약\n아래 버튼을 누르면 이 예약을 수정·취소할 수 있는 권한이 생깁니다.",
        "share.kakaoButton": "수정 권한 받기",
        "share.copied": "링크를 복사했습니다. 카톡방에 붙여넣어 주세요.",
        "share.copyFail": "자동 복사가 막혀 있습니다. 링크를 길게 눌러 복사해주세요.",
        "grant.done": "권한이 부여되었습니다.",
        "grant.doneTeam": "권한이 부여되었습니다. [{team}] 예약을 이 기기에서 수정·취소할 수 있습니다.",
        "share.claimFail": "공유 링크가 올바르지 않습니다. 예약한 사람에게 다시 받아주세요.",
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
        "modal.labelName": "Booked by",
        "modal.phName": "John Doe",
        "modal.labelCount": "Headcount",
        "modal.phCount": "e.g. 5",
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
        "err.permission": "Permission denied. Ask the person who booked for the share link.",
        "err.permissionNew": "The server refused to save this booking. Please tell an admin. (security rules need checking)",
        "modal.shareNote": "For a new team, you get a team link to post in the team chat.",
        "modal.newTeam": "+ New team",
        "main.bookDay": "Book this day",
        "main.mine": "My bookings: {count}",
        "status.fromPrev": "from prev. day",
        "err.past": "You can't book a time that has already passed.",
        "confirm.dupTeamTitle": "Same name exists",
        "confirm.dupTeam": "There are already bookings named [{team}].\n\nIf that's your team, open the team link pinned in your team chat first; then you can pick it from the list.\n\nCreate a new team anyway?",
        "confirm.dupTeamYes": "Create new team",
        "share.titleTeam": "Team link",
        "share.bodyTeam": "Post this in your team chat and pin it. Anyone who opens it once can edit or cancel every booking of this team.",
        "share.kakaoTextTeam": "[{team}] club room team link\nTap the button once to edit or cancel any booking of this team.",
        "grant.doneTeamLink": "You're now in [{team}]. You can edit or cancel all of this team's bookings.",
        "kakao.connect": "Link KakaoTalk nickname",
        "kakao.linked": "Linked KakaoTalk nickname '{nick}'.",
        "kakao.fail": "Couldn't link your KakaoTalk nickname.",
        "admin.logs": "View log",
        "log.title": "Edit & cancel log",
        "log.empty": "No records yet.",
        "log.fail": "Couldn't load the log.",
        "log.delete": "Cancelled",
        "log.update": "Edited",
        "log.more": "+{n} more",
        "confirm.toOnceTitle": "Change to one-off",
        "confirm.toOnce": "Keep only this occurrence and cancel the {count} remaining weekly bookings? This cannot be undone.",
        "confirm.toOnceYes": "Change",

        "lock.notOwner": "Get the share link from the person who booked to edit or cancel.",
        "btn.share": "Share",
        "share.title": "Booked",
        "share.titleCard": "Share edit link",
        "share.body": "Send this link to your team chat. Any device that opens it can edit or cancel this booking.",
        "share.copy": "Copy",
        "share.copiedBtn": "Copied",
        "share.send": "Send via KakaoTalk",
        "share.text": "[{team}] club room booking edit link",
        "share.kakaoText": "[{team}] club room booking\nTap the button below to get permission to edit or cancel it.",
        "share.kakaoButton": "Get edit access",
        "share.copied": "Link copied. Paste it into your group chat.",
        "share.copyFail": "Copying is blocked here. Long-press the link to copy it.",
        "grant.done": "Permission granted.",
        "grant.doneTeam": "Permission granted. This device can now edit or cancel the [{team}] booking.",
        "share.claimFail": "This share link is invalid. Ask the person who booked for a new one.",
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
const LS_LAST = 'naite_last';            // 마지막 예약 입력값 (다음 새 예약에 미리 채움)
const LS_KAKAO = 'naite_kakao';          // 카톡 닉네임 연결: 'tried'(자동 시도함) | 'done' | 'declined'
const LS_KAKAO_STATE = 'naite_kakao_state';
const LS_PENDING_GRANT = 'naite_pending_grant';
const NEW_TEAM = '__new';
const TEAM_IDLE_MS = 28 * 24 * 60 * 60 * 1000;   // 4주 넘게 쓰지 않은 팀은 목록에서 접습니다
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
let access = { shares: new Map(), grants: new Map(), teams: new Map() };  // 만든 링크 / 받은 권한 / 그중 팀 링크
let users = new Map();            // 관리자용: uid → { kakaoNick, name }
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
    if (isAdmin()) return true;
    if (r.shareId && (access.grants.has(r.shareId) || access.shares.has(r.shareId))) return true;
    return !!currentUser && !!r.ownerUid && r.ownerUid === currentUser.uid;
}

/**
 * 공유 버튼을 보여줄지 — 링크를 만들었거나 받은 기기(링크 key 를 아는 기기)에서만.
 * 링크가 없는 기존 예약은 작성자 기기에서 누르는 순간 새로 만듭니다.
 */
function canShare(r) {
    if (!store || store.mode !== 'cloud' || !currentUser) return false;
    return r.shareId ? !!shareKey(r.shareId) : r.ownerUid === currentUser.uid;
}

const shareKey = id => access.shares.get(id) ?? access.grants.get(id);

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
    teamSelect: $('teamSelect'),
    teamName: $('teamName'),
    kakaoLinkBtn: $('kakaoLinkBtn'),
    logViewBtn: $('logViewBtn'),
    logModal: $('logModal'),
    logList: $('logList'),
    logCloseBtn: $('logCloseBtn'),

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
    shareNote: $('shareNote'),

    shareModal: $('shareModal'),
    shareTitle: $('shareTitle'),
    shareBody: $('shareBody'),
    shareLink: $('shareLink'),
    shareCopyBtn: $('shareCopyBtn'),
    shareSendBtn: $('shareSendBtn'),
    shareCloseBtn: $('shareCloseBtn'),
    shareDoneBtn: $('shareDoneBtn'),

    grantBanner: $('grantBanner'),
    grantText: $('grantText'),
    grantCloseBtn: $('grantCloseBtn'),

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

        const meta = [
            escapeHtml(r.userName),
            `${escapeHtml(r.peopleCount)}${escapeHtml(t('unit.people'))}`,
            escapeHtml(r.purpose)
        ];
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
                ${canShare(r) ? `<button class="share-btn" type="button"><i class="fa-solid fa-share-nodes"></i>${escapeHtml(t('btn.share'))}</button>` : ''}
                <button class="edit-btn" type="button"><i class="fa-solid fa-pen"></i>${escapeHtml(t('btn.edit'))}</button>
                <button class="delete-btn" type="button"><i class="fa-regular fa-trash-can"></i>${escapeHtml(t('btn.delete'))}</button>
            </div>` : `
            <i class="fa-solid fa-lock res-lock" role="img" title="${escapeHtml(t('lock.notOwner'))}" aria-label="${escapeHtml(t('lock.notOwner'))}"></i>`}`;

        item.querySelector('.share-btn')?.addEventListener('click', () => handleShare(r));
        item.querySelector('.edit-btn')?.addEventListener('click', () => openEdit(r));
        item.querySelector('.delete-btn')?.addEventListener('click', () => handleDelete(r));
        el.resList.appendChild(item);
    });

    // 잠긴 예약이 있을 때만, 목록 아래에 한 번만 안내
    if (anyLocked) {
        const note = document.createElement('p');
        note.className = 'res-note';
        note.innerHTML = `<i class="fa-solid fa-lock"></i><span></span>`;
        note.querySelector('span').textContent = t('lock.notOwner');
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

/** 이 기기에서 수정할 수 있는 앞으로의 예약 (관리자는 전부라 제외) */
function myUpcoming() {
    if (!store || store.mode !== 'cloud' || authUnavailable || isAdmin()) return [];
    const now = Date.now();
    return reservations.filter(r => endTs(r) > now && canEdit(r)).sort((a, b) => startTs(a) - startTs(b));
}

/** '내 예약 N건' 칩 — 누르면 가장 가까운 내 예약 날짜로 이동 */
function renderMine() {
    const mine = myUpcoming();
    el.mineChip.classList.toggle('hidden', mine.length === 0);
    el.mineChip.textContent = t('main.mine', { count: mine.length });
}

function userLabel(uid) {
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

/* ---------- 팀 선택 ---------- */

/** '내 팀' 목록 — 4주 넘게 예약도 없고 링크도 오래된 팀은 접습니다. */
function activeTeams() {
    const cutoff = Date.now() - TEAM_IDLE_MS;
    return [...access.teams]
        .filter(([id, team]) => Date.parse(team.since || 0) > cutoff
            || reservations.some(r => r.shareId === id && endTs(r) > cutoff))
        .sort((a, b) => a[1].name.localeCompare(b[1].name, 'ko'));
}

function fillTeamSelect(preferId) {
    const teams = activeTeams();
    el.teamSelect.innerHTML = '';
    teams.forEach(([id, team]) => el.teamSelect.add(new Option(team.name, id)));
    el.teamSelect.add(new Option(t('modal.newTeam'), NEW_TEAM));
    el.teamSelect.value = teams.some(([id]) => id === preferId) ? preferId : (teams[0]?.[0] ?? NEW_TEAM);
    el.teamSelect.classList.toggle('hidden', teams.length === 0);
    syncTeamInput();
}

/** 목록에서 고른 팀 id (새 팀이면 null) */
function selectedTeamId() {
    if (el.teamSelect.classList.contains('hidden') || el.teamSelect.value === NEW_TEAM) return null;
    return el.teamSelect.value;
}

/** 팀을 고르면 이름 칸을 숨기고, '새 팀'이면 이름 칸을 보여줍니다. */
function syncTeamInput() {
    const id = selectedTeamId();
    el.teamName.classList.toggle('hidden', !!id);
    if (id) el.teamName.value = access.teams.get(id)?.name ?? '';
    el.shareNote.classList.toggle('hidden', !!id || store?.mode !== 'cloud');   // 새 팀일 때만 팀 링크 안내
}

function loadLast() {
    try {
        return JSON.parse(localStorage.getItem(LS_LAST)) || {};
    } catch {
        return {};
    }
}

/* ---------- 모달 ---------- */
function openCreate(date) {
    editingId = null;
    el.form.reset();
    el.teamName.readOnly = false;
    el.date.value = fmtDate(date);
    el.date.min = fmtDate(new Date());
    el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;
    setResType('once');

    // 지난번 입력값을 미리 채웁니다.
    const last = loadLast();
    fillTeamSelect(last.teamId);
    if (!selectedTeamId() && !last.teamId) el.teamName.value = last.teamName ?? '';
    $('userName').value = last.userName ?? '';
    $('peopleCount').value = last.peopleCount ?? '';
    if (last.purpose) $('purpose').value = last.purpose;

    el.modalTitle.textContent = t('modal.newResTitle');
    el.submitBtn.textContent = t('modal.btnSubmit');
    pickDefaultTimes();
    openOverlay(el.resModal);
}

function openEdit(res) {
    editingId = res.id;
    el.date.value = res.date;
    el.date.min = '';
    // 수정할 때는 팀을 바꿀 수 없습니다. 링크로 묶인 예약은 팀명도 고정 (팀 링크면 규칙이 팀명 변경을 거부)
    el.teamSelect.classList.add('hidden');
    el.teamName.classList.remove('hidden');
    el.teamName.readOnly = !!res.shareId;
    $('teamName').value = res.teamName;
    $('userName').value = res.userName;
    $('peopleCount').value = res.peopleCount;
    $('purpose').value = res.purpose;
    el.repeatUntil.value = res.repeatUntil || DEFAULT_REPEAT_UNTIL;
    setResType(res.seriesId ? 'weekly' : 'once');

    refreshTimeOptions();
    el.start.value = res.startTime;
    refreshTimeOptions();
    el.end.value = res.endTime;
    el.nextDayHint.classList.toggle('hidden', !res.isNextDay);

    el.shareNote.classList.add('hidden');
    el.modalTitle.textContent = t('modal.editResTitle');
    el.submitBtn.textContent = t('modal.btnEdit');
    openOverlay(el.resModal);
}

function closeReservationModal() {
    closeOverlay(el.resModal);
    el.form.reset();
    editingId = null;
    el.teamName.readOnly = false;
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
        userName: $('userName').value.trim(),
        peopleCount: Number($('peopleCount').value),
        purpose: $('purpose').value
    };

    const editing = editingRes();
    if (editingId && !editing) {
        // 수정하는 사이 다른 기기에서 지워진 경우
        closeReservationModal();
        return;
    }

    const leftovers = editing?.seriesId && resType === 'once' ? seriesLeftovers(editing) : [];
    const ignoreIds = overlapIgnoreIds();

    /** 해당 날짜에 이 시간대가 비어 있는지 */
    const isFree = dateStr => {
        const s = ts(dateStr, startTime, false);
        const e = ts(dateStr, endTime, isNextDay);
        return !reservations.some(r => !ignoreIds.has(r.id) && s < endTs(r) && e > startTs(r));
    };

    // ----- 새 예약의 팀: 목록에서 고른 팀 링크를 쓰거나, 새 팀이면 팀 링크를 만듭니다 -----
    let teamId = null;
    let share = null;
    if (!editing) {
        const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
        teamId = selectedTeamId()
            ?? [...access.teams].find(([, team]) => norm(team.name) === norm(base.teamName))?.[0]   // 이름을 쳤지만 이미 내 팀
            ?? null;
        if (teamId) {
            base.teamName = access.teams.get(teamId).name;
        } else if (store.mode === 'cloud' && !authUnavailable) {
            // 같은 이름의 다른 사람 예약이 있으면 팀 링크를 먼저 열도록 안내합니다 (팀이 둘로 갈라지지 않게)
            const dup = reservations.some(r => r.shareId && norm(r.teamName) === norm(base.teamName));
            if (dup) {
                const ok = await askConfirm(t('confirm.dupTeam', { team: base.teamName }), {
                    title: t('confirm.dupTeamTitle'), yes: t('confirm.dupTeamYes'), no: t('modal.btnCancel'), primary: true
                });
                if (!ok) return;
            }
            share = { ...newShare(), teamName: base.teamName };
            teamId = share.id;
        }
    }

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
            ops = { update: [[editing.id, first]], add: rest.map(p => ({ ...p, shareId: editing.shareId })) };
        } else {
            ops = { share, add: payloads.map(p => ({ ...p, shareId: teamId ?? undefined })) };
        }
    } else {
        if (!isFree(date)) {
            toast(t('err.overlap'), 'error');
            refreshTimeOptions();
            return;
        }

        if (!editing) {
            ops = { share, add: [{ ...base, date, shareId: teamId ?? undefined }] };
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

        if (!editing) rememberInput(base, teamId);

        selectedDate = parseDate(date);
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        closeReservationModal();
        renderAll();

        // 새 팀이면 팀 톡방에 올릴 팀 링크를 바로 보여줍니다.
        if (share) openShareModal(share.id, share.key, { title: t('share.titleTeam'), team: base.teamName, teamLink: true });
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

/** 다음 새 예약에 미리 채울 값을 기억하고, 예약자 이름이 바뀌었으면 관리자용 이름도 갱신합니다. */
function rememberInput(base, teamId) {
    const last = loadLast();
    const next = {
        teamId, teamName: base.teamName, userName: base.userName,
        peopleCount: base.peopleCount, purpose: base.purpose
    };
    try { localStorage.setItem(LS_LAST, JSON.stringify(next)); } catch { /* 저장 못 해도 예약엔 지장 없음 */ }
    if (store.mode === 'cloud' && last.userName !== base.userName) {
        store.saveProfile({ name: base.userName }).catch(err => console.error('[store] 이름 저장 실패:', err));
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

/* ---------- 공유 링크 ----------
   팀 링크: 팀 첫 예약 때 무작위 key 가 담긴 링크를 만들고, 팀원이 그 링크를 한 번 열면
   그 기기에서 그 팀의 모든 예약(앞으로 할 예약 포함)을 수정·취소할 수 있습니다.
   예전 예약별 링크(팀 이름 없는 링크)도 그대로 동작합니다.
   ponytail: 링크가 새도 권한을 회수할 수 없음 — 필요해지면 key 재발급 + 규칙의 grant key 대조 추가 */

function shareUrl(shareId, key) {
    // 링크를 연 그 창에서 바로 권한만 받습니다. (다른 브라우저로 넘기지 않음)
    // 카카오톡 메시지 링크에서 # 뒤가 빠질 수 있어 쿼리(?share=)로 보냅니다.
    return `${location.origin}${location.pathname}?share=${shareId}.${key}`;
}

/* 카카오톡 공유 SDK — 공유 창을 열 때 미리 불러와 둡니다.
   (버튼을 누른 뒤에 불러오면 브라우저가 팝업·앱 전환을 막을 수 있음) */
const KAKAO_SDK = {
    src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js',
    integrity: 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy'
};
let kakaoLoading = null;
let kakaoReady = false;

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

/** 휴대폰 기본 공유 창 (카카오 SDK 를 못 쓸 때 대안) */
const canNativeShare = () => !!navigator.share && matchMedia('(pointer: coarse)').matches;

let shareModalUrl = '';
let shareModalTeam = '';
let shareModalTeamLink = false;

/** 공유 창 — 열자마자 링크를 자동 복사하고, [복사하기] 버튼도 둡니다. */
function openShareModal(shareId, key, { title, team, teamLink = false }) {
    shareModalUrl = shareUrl(shareId, key);
    shareModalTeam = team;
    shareModalTeamLink = teamLink;
    el.shareTitle.textContent = title;
    el.shareBody.textContent = t(teamLink ? 'share.bodyTeam' : 'share.body');
    el.shareLink.value = shareModalUrl;
    el.shareSendBtn.classList.toggle('hidden', !(kakaoReady || canNativeShare()));
    loadKakao().then(ok => {
        kakaoReady = ok;
        el.shareSendBtn.classList.toggle('hidden', !(ok || canNativeShare()));
    });
    setShareCopied(false);
    openOverlay(el.shareModal);
    copyShareLink(true);
}

function setShareCopied(done) {
    el.shareCopyBtn.innerHTML = done
        ? `<i class="fa-solid fa-check"></i>${escapeHtml(t('share.copiedBtn'))}`
        : `<i class="fa-regular fa-copy"></i>${escapeHtml(t('share.copy'))}`;
}

/** auto: 창을 열 때의 자동 복사 — 막혀 있으면 조용히 넘어가고 버튼으로 복사합니다. */
async function copyShareLink(auto = false) {
    const done = () => {
        setShareCopied(true);
        toast(t('share.copied'), 'success');
    };
    try {
        await navigator.clipboard.writeText(shareModalUrl);
        return done();
    } catch { /* 앱 내 브라우저 등은 클립보드 API 가 막혀 있을 수 있음 */ }
    if (auto) return;

    // 예전 방식 복사 (카톡 내장 브라우저에서도 동작)
    el.shareLink.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    if (ok) return done();
    toast(t('share.copyFail'), 'error');   // 입력칸이 선택된 상태라 길게 눌러 복사하면 됩니다
}

/** [카카오톡으로 보내기] — 카톡 친구·채팅방 선택 화면을 바로 띄웁니다. */
async function sendShareViaApp() {
    if (kakaoReady) {
        try {
            window.Kakao.Share.sendDefault({
                objectType: 'text',
                text: t(shareModalTeamLink ? 'share.kakaoTextTeam' : 'share.kakaoText', { team: shareModalTeam }),
                link: { mobileWebUrl: shareModalUrl, webUrl: shareModalUrl },
                buttonTitle: t('share.kakaoButton')
            });
            return;
        } catch (err) {
            console.error('[kakao] 공유 실패:', err);   // 아래 기본 공유 창으로 대신
        }
    }
    if (!navigator.share) return copyShareLink();
    try {
        await navigator.share({ title: t('share.text', { team: shareModalTeam }), url: shareModalUrl });
    } catch (err) {
        if (err?.name !== 'AbortError') copyShareLink();   // 공유 시트가 안 되면 복사로 대신
    }
}

/** 예약 카드의 [공유] 버튼 */
async function handleShare(res) {
    try {
        let shareId = res.shareId;
        let key = shareId && shareKey(shareId);
        if (!key) {
            // 링크가 없던 기존 예약: 새 링크를 만들어 붙입니다. (고정 예약이면 내가 만든 회차 전부)
            const share = newShare();
            const targets = (res.seriesId ? reservations.filter(r => r.seriesId === res.seriesId) : [res])
                .filter(r => !r.shareId && r.ownerUid === currentUser?.uid);
            await store.write({ share, update: targets.map(r => [r.id, { shareId: share.id }]) });
            ({ id: shareId, key } = share);
        }
        const teamLink = access.teams.has(shareId);
        openShareModal(shareId, key, { title: t(teamLink ? 'share.titleTeam' : 'share.titleCard'), team: res.teamName, teamLink });
    } catch (err) {
        console.error(err);
        toast(t(err?.code === 'permission-denied' ? 'err.permission' : 'err.save'), 'error');
    }
}

let pendingGrant = null;   // 방금 링크로 권한 받은 shareId — 예약 목록이 오면 그 날짜로 이동
let grantedNow = null;     // 이번 방문에 받은 shareId (카카오에 다녀온 뒤 배너를 다시 보여줄 때 씀)

/**
 * 링크를 연 그 자리(카톡 내장 브라우저 포함)에서 화면 위 배너로 알립니다.
 * 해당 예약을 찾으면 팀명을 보여주고 그 날짜로 이동합니다.
 */
function showGrantBanner() {
    el.grantBanner.classList.remove('hidden');
    const team = access.teams.get(pendingGrant)?.name;
    const list = reservations.filter(r => r.shareId === pendingGrant).sort((a, b) => startTs(a) - startTs(b));
    if (list.length === 0) {
        el.grantText.textContent = team ? t('grant.doneTeamLink', { team }) : t('grant.done');
        return;   // 예약 목록·팀 정보가 아직 안 왔으면 도착했을 때 다시 호출됩니다
    }
    const now = Date.now();
    const target = list.find(r => endTs(r) > now) ?? list[0];
    el.grantText.textContent = team ? t('grant.doneTeamLink', { team }) : t('grant.doneTeam', { team: target.teamName });
    pendingGrant = null;
    selectedDate = parseDate(target.date);
    viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderAll();
}

/** 주소에 ?share=... (예전 링크는 #share=...) 가 있으면 이 기기에 수정 권한을 등록합니다. */
async function claimShareFromUrl() {
    const raw = new URLSearchParams(location.search).get('share') ?? location.hash.match(/^#share=(.+)$/)?.[1];
    const m = raw?.match(/^(sh_[A-Za-z0-9]{20})\.([A-Za-z0-9]{32})$/);
    if (!m) return;
    // 주소창의 key 는 등록이 끝나거나 링크가 틀렸을 때만 지웁니다.
    // (네트워크 오류 등이면 남겨 두어 새로고침으로 다시 시도할 수 있게)
    const clearHash = () => history.replaceState(null, '', location.pathname);
    try {
        await store.claimShare(m[1], m[2]);
        clearHash();
        pendingGrant = grantedNow = m[1];
        showGrantBanner();
    } catch (err) {
        console.error(err);
        if (err?.code === 'permission-denied') {
            clearHash();
            toast(t('share.claimFail'), 'error');
        } else {
            toast(t('err.save'), 'error');
        }
    }
}

/* ---------- 카톡 닉네임 ----------
   페이지에 들어오면 카카오 로그인으로 닉네임을 받아 이 기기(uid)에 붙여 둡니다. 관리자가 누가 고쳤는지 보는 용도.
   카톡 안에서는 동의 화면만, PC 등 일반 브라우저에서는 카카오 로그인 화면이 한 번 뜨고, 그 뒤로는 다시 묻지 않습니다.
   권한과는 무관합니다.
   ponytail: 서버가 없어 닉네임은 기기가 스스로 저장하는 값(위조 가능) — 검증이 필요해지면 Firebase OIDC(카카오) 연결 */

const kakaoRedirectUri = () => `${location.origin}${location.pathname}`;   // 콘솔에 등록한 주소와 같아야 함

/** 배포 주소(https)에서만 — 로컬 개발 주소는 카카오 콘솔에 등록돼 있지 않습니다. */
function kakaoLinkable() {
    return location.protocol === 'https:' && !!KAKAO_JS_KEY && store?.mode === 'cloud' && !authUnavailable;
}

function updateKakaoBtn() {
    el.kakaoLinkBtn.classList.toggle('hidden', !kakaoLinkable() || localStorage.getItem(LS_KAKAO) === 'done');
}

/** 카카오 동의 화면으로 이동 (돌아오면 handleKakaoReturn 이 이어받음) */
async function startKakaoLink() {
    await userReady;   // 돌아왔을 때 같은 익명 uid 여야 하므로 로그인이 끝난 뒤에 이동
    if (!(await loadKakao())) return;
    const state = newShare().key;   // 로그인 CSRF 방지용 무작위 값
    localStorage.setItem(LS_KAKAO_STATE, state);
    // 자동 시도는 한 번만 — 로그인 화면에서 그냥 돌아와도 다음부터는 하단 버튼으로만 연결
    if (localStorage.getItem(LS_KAKAO) !== 'done') localStorage.setItem(LS_KAKAO, 'tried');
    if (grantedNow) localStorage.setItem(LS_PENDING_GRANT, grantedNow);   // 돌아와서 권한 배너를 다시 보여줌
    window.Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri(), state });
}

/** 카카오에서 돌아왔으면(?code= / ?error=) 닉네임을 저장합니다. 돌아온 경우 true */
async function handleKakaoReturn() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return false;

    const state = localStorage.getItem(LS_KAKAO_STATE);
    localStorage.removeItem(LS_KAKAO_STATE);
    pendingGrant = localStorage.getItem(LS_PENDING_GRANT);
    localStorage.removeItem(LS_PENDING_GRANT);
    history.replaceState(null, '', location.pathname);
    if (pendingGrant) showGrantBanner();

    if (!state || q.get('state') !== state) return true;   // 내가 시작하지 않은 로그인은 무시
    if (q.has('error')) {
        if (q.get('error') === 'access_denied') localStorage.setItem(LS_KAKAO, 'declined');   // 거절하면 다시 묻지 않음
        updateKakaoBtn();
        return true;
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
        localStorage.setItem(LS_KAKAO, 'done');
        toast(t('kakao.linked', { nick }), 'success');
    } catch (err) {
        console.error('[kakao] 닉네임 연결 실패:', err);   // 일시적 오류일 수 있어 다음 방문 때 다시 시도
        toast(t('kakao.fail'), 'error');
    }
    updateKakaoBtn();
    return true;
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
    el.logViewBtn.classList.toggle('hidden', !isAdmin());
    updateKakaoBtn();

    // 관리자면 기기별 이름 목록을 받아 예약 카드에 누가 고쳤는지 표시
    if (isAdmin() && !unwatchUsers) {
        unwatchUsers = store.watchUsers(next => {
            users = next;
            renderDay();
        });
    } else if (!isAdmin() && unwatchUsers) {
        unwatchUsers();
        unwatchUsers = null;
        users = new Map();
    }

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

/** 관리자: 수정·취소 기록 — 한 번에 저장된 기록(고정 예약 전체 취소 등)은 한 줄로 묶어 보여줍니다. */
async function openLogs() {
    el.logList.innerHTML = `<li class="placeholder">${escapeHtml(t('main.loading'))}</li>`;
    openOverlay(el.logModal);

    let logs;
    try {
        logs = await store.readLogs();
    } catch (err) {
        console.error('[admin] 기록 읽기 실패:', err);
        el.logList.innerHTML = `<li class="placeholder">${escapeHtml(t('log.fail'))}</li>`;
        return;
    }

    const groups = [];
    logs.filter(l => typeof l.res?.date === 'string').forEach(l => {
        const last = groups.at(-1);
        if (last && last[0].batch === l.batch && last[0].action === l.action) last.push(l);
        else groups.push([l]);
    });
    if (groups.length === 0) {
        el.logList.innerHTML = `<li class="placeholder">${escapeHtml(t('log.empty'))}</li>`;
        return;
    }

    el.logList.innerHTML = groups.map(group => {
        const first = group.sort((a, b) => a.res.date.localeCompare(b.res.date))[0];
        const at = first.at?.toDate?.();
        const when = at ? `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '';
        const r = first.res;
        const what = `${r.teamName} · ${dayLabel(parseDate(r.date))} ${r.startTime}–${r.endTime}`
            + (group.length > 1 ? ` ${t('log.more', { n: group.length - 1 })}` : '');
        return `
            <li class="log-item">
                <span class="tag log-action${first.action === 'delete' ? ' is-delete' : ''}">${escapeHtml(t(`log.${first.action}`))}</span>
                <span>${escapeHtml(what)}</span>
                <span class="log-who"><i class="fa-solid fa-user-pen"></i> ${escapeHtml(userLabel(first.uid))} · ${escapeHtml(when)}</span>
            </li>`;
    }).join('');
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
    el.teamSelect.addEventListener('change', () => {
        syncTeamInput();
        if (!selectedTeamId()) {
            el.teamName.value = '';
            el.teamName.focus();
        }
    });
    el.kakaoLinkBtn.addEventListener('click', startKakaoLink);
    el.logViewBtn.addEventListener('click', openLogs);
    el.logCloseBtn.addEventListener('click', () => closeOverlay(el.logModal));
    el.logModal.addEventListener('click', e => { if (e.target === el.logModal) closeOverlay(el.logModal); });
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

    // 공유 창
    el.shareCopyBtn.addEventListener('click', () => copyShareLink());
    el.shareSendBtn.addEventListener('click', sendShareViaApp);
    el.shareLink.addEventListener('focus', () => el.shareLink.select());
    [el.shareCloseBtn, el.shareDoneBtn].forEach(b => b.addEventListener('click', () => closeOverlay(el.shareModal)));
    el.shareModal.addEventListener('click', e => { if (e.target === el.shareModal) closeOverlay(el.shareModal); });
    el.grantCloseBtn.addEventListener('click', () => el.grantBanner.classList.add('hidden'));

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!el.logModal.classList.contains('hidden')) closeOverlay(el.logModal);
        else if (!el.shareModal.classList.contains('hidden')) closeOverlay(el.shareModal);
        else if (!el.seriesModal.classList.contains('hidden')) closeOverlay(el.seriesModal);
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
        if (pendingGrant) showGrantBanner();   // 링크로 받은 예약 날짜로 이동
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

    // 공유 권한(내가 만든 링크 / 받은 권한 / 팀)이 바뀌면 수정·공유 버튼을 다시 그립니다.
    store.onAccess(next => {
        access = next;
        renderDay();
        renderMine();
        if (pendingGrant) showGrantBanner();   // 팀 이름이 도착하면 배너 문구 갱신
    });

    // 카카오에서 돌아온 경우를 먼저 처리하고, 링크 권한을 받은 뒤, 아직 연결 전이면 닉네임 연결을 시작합니다.
    const backFromKakao = await handleKakaoReturn();
    await claimShareFromUrl();
    if (!backFromKakao && kakaoLinkable() && !localStorage.getItem(LS_KAKAO)) startKakaoLink();

    // 진행중 표시를 1분마다 갱신
    setInterval(() => {
        renderDay();
        renderToday();
    }, 60_000);
}

init();
