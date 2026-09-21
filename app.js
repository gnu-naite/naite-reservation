/* ============================================================
   나이테 동아리방 예약 — 메인 로직
   ============================================================ */

import { createStore } from './store.js';
import { CLUB, DEFAULT_REPEAT_UNTIL, MAX_OCCURRENCES, ADMIN_UIDS } from './config.js';

/* ---------- i18n 사전 ---------- */
const I18N = {
    ko: {
        "doc.title": `${CLUB.nameKo} 동아리방 예약`,
        "app.title": `${CLUB.nameKo} 동아리방 예약`,
        "app.subtitle": "공유 예약 캘린더",
        "app.reserveBtn": "예약하기",
        "banner.local": "임시 저장 모드입니다. 예약이 이 기기에만 저장되고 다른 사람과 공유되지 않습니다. (config.js 설정 필요)",

        "main.upcomingTitle": "다가오는 예약",
        "main.loading": "불러오는 중...",
        "main.noUpcoming": "다가오는 예약이 없습니다.",
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
        "modal.typeOnce": "일회성",
        "modal.typeWeekly": "고정 (매주)",
        "modal.labelRepeatUntil": "반복 종료일",
        "modal.repeatSummary": "{until}까지 매주 {weekday}요일 · 총 {count}회 예약됩니다.",
        "modal.repeatInvalid": "반복 종료일은 첫 예약 날짜보다 뒤여야 합니다.",
        "modal.editScopeSeries": "고정 예약 중 이 회차({date})만 수정됩니다.",
        "modal.labelTeam": "팀명",
        "modal.phTeam": "예: 밴드팀",
        "modal.labelName": "예약자 이름",
        "modal.phName": "홍길동",
        "modal.labelCount": "사용 인원수",
        "modal.phCount": "예: 5",
        "modal.labelPurpose": "사용 목적",
        "modal.optEnsemble": "🎸 합주",
        "modal.optClass": "📚 강습",
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
        "err.permission": "권한이 없습니다. 예약한 기기에서 시도하거나 관리자에게 요청해주세요.",

        "lock.notOwner": "예약한 기기에서만 수정·취소할 수 있습니다.",
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

        "main.upcomingTitle": "Upcoming",
        "main.loading": "Loading...",
        "main.noUpcoming": "No upcoming reservations.",
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
        "err.permission": "Permission denied. Try from the device you booked on, or ask an admin.",

        "lock.notOwner": "Only the device that made this booking can edit or cancel it.",
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
const THEMES = ['default', 'forest', 'ocean', 'sunset', 'mono', 'dark'];

/* ---------- 상태 ---------- */
let lang = localStorage.getItem(LS_LANG) === 'en' ? 'en' : 'ko';
let viewMonth = new Date();       // 캘린더가 보여주는 달
let selectedDate = new Date();    // 선택된 날짜
let reservations = [];            // 전체 예약 목록
let editingId = null;             // 수정 중인 예약 id
let resType = 'once';             // 'once' 일회성 | 'weekly' 고정(매주)
let store = null;
let currentUser = null;           // Firebase 사용자 (익명 또는 구글)
let authUnavailable = false;      // 인증을 쓸 수 없는 상태 (콘솔에서 미설정 등)

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
    return !!currentUser && !!r.ownerUid && r.ownerUid === currentUser.uid;
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

    resModal: $('reservationModal'),
    modalTitle: $('modalTitle'),
    form: $('reservationForm'),
    date: $('resDate'),
    dateLabel: $('resDateLabel'),
    start: $('startTime'),
    end: $('endTime'),
    nextDayHint: $('nextDayHint'),

    resTypeField: $('resTypeField'),
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

function shortDayLabel(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return lang === 'en' ? `${m}/${d} ${weekdayLabel(date)}` : `${m}월 ${d}일 (${weekdayLabel(date)})`;
}

/* ---------- 렌더링 ---------- */
function renderAll() {
    renderCalendar();
    renderDay();
    renderUpcoming();
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
    const now = Date.now();
    const list = reservations
        .filter(r => r.date === key)
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
    list.forEach(r => {
        const ongoing = startTs(r) <= now && endTs(r) > now;
        const item = document.createElement('div');
        item.className = `res-item${ongoing ? ' is-ongoing' : ''}${r.seriesId ? ' is-series' : ''}`;
        const repeatTag = r.seriesId
            ? `<span class="tag repeat"><i class="fa-solid fa-repeat"></i> ${escapeHtml(t('status.repeat', { weekday: weekdayLabel(parseDate(r.date)) }))}</span>`
            : '';
        item.innerHTML = `
            <div class="res-top">
                <span class="res-time">${escapeHtml(r.startTime)} – ${escapeHtml(r.endTime)}${r.isNextDay ? `<span class="tag next-day">${escapeHtml(t('status.nextDay'))}</span>` : ''}</span>
                <span class="tag">${escapeHtml(r.purpose)}</span>
            </div>
            <div class="res-team">${escapeHtml(r.teamName)}</div>
            <div class="res-meta">
                <span><i class="fa-regular fa-user"></i>${escapeHtml(r.userName)}</span>
                <span><i class="fa-solid fa-user-group"></i>${escapeHtml(r.peopleCount)}${escapeHtml(t('unit.people'))}</span>
                ${repeatTag}
                ${ongoing ? `<span class="status-pill">${escapeHtml(t('status.ongoing'))}</span>` : ''}
            </div>
            ${canEdit(r) ? `
            <div class="res-actions">
                <button class="edit-btn" type="button"><i class="fa-solid fa-pen"></i>${escapeHtml(t('btn.edit'))}</button>
                <button class="delete-btn" type="button"><i class="fa-regular fa-trash-can"></i>${escapeHtml(t('btn.delete'))}</button>
            </div>` : `
            <div class="res-locked"><i class="fa-solid fa-lock"></i>${escapeHtml(t('lock.notOwner'))}</div>`}`;

        item.querySelector('.edit-btn')?.addEventListener('click', () => openEdit(r));
        item.querySelector('.delete-btn')?.addEventListener('click', () => handleDelete(r));
        el.resList.appendChild(item);
    });
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

function renderUpcoming() {
    const now = Date.now();
    const upcoming = reservations
        .filter(r => endTs(r) > now)
        .sort((a, b) => startTs(a) - startTs(b))
        .slice(0, 5);

    if (upcoming.length === 0) {
        el.upcoming.innerHTML = `<div class="placeholder">${escapeHtml(t('main.noUpcoming'))}</div>`;
        return;
    }

    el.upcoming.innerHTML = '';
    upcoming.forEach(r => {
        const ongoing = startTs(r) <= now && endTs(r) > now;
        const card = document.createElement('div');
        card.className = `upcoming-card${ongoing ? ' is-ongoing' : ''}`;
        card.innerHTML = `
            <div class="uc-top">
                <span class="uc-date">${escapeHtml(shortDayLabel(parseDate(r.date)))}</span>
                ${ongoing ? `<span class="status-pill">${escapeHtml(t('status.ongoing'))}</span>` : ''}
            </div>
            <div class="uc-team">${escapeHtml(r.teamName)}</div>
            <div class="uc-time">${escapeHtml(r.startTime)} – ${escapeHtml(r.endTime)}${r.isNextDay ? ` (${escapeHtml(t('status.nextDay'))})` : ''}</div>`;

        // 카드를 누르면 해당 날짜로 이동
        card.addEventListener('click', () => {
            selectedDate = parseDate(r.date);
            viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            renderAll();
        });
        card.style.cursor = 'pointer';

        el.upcoming.appendChild(card);
    });
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

/** 예약 유형(일회성/고정) 전환 */
function setResType(type) {
    resType = type === 'weekly' ? 'weekly' : 'once';

    el.resTypeGroup.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.type === resType);
    });
    el.repeatUntilField.classList.toggle('hidden', resType !== 'weekly');
    el.dateLabel.textContent = t(resType === 'weekly' ? 'modal.labelFirstDate' : 'modal.labelDate');

    if (resType === 'weekly' && !el.repeatUntil.value) {
        el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;
    }
    updateRepeatSummary();
}

/** "11월 20일까지 매주 월요일 · 총 9회" 안내 갱신 */
function updateRepeatSummary() {
    if (resType !== 'weekly') return;

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
 * 이미 예약된 시간대를 선택할 수 없도록 옵션을 비활성화합니다.
 * (수정 중인 예약 본인은 제외)
 */
function refreshTimeOptions() {
    const dateStr = el.date.value;
    if (!dateStr) return;

    const others = reservations
        .filter(r => r.id !== editingId)
        .map(r => ({ s: startTs(r), e: endTs(r) }));

    // 1) 시작 시간: 다른 예약 구간 안에 있으면 선택 불가
    Array.from(el.start.options).forEach(opt => {
        const point = ts(dateStr, opt.value, false);
        opt.disabled = others.some(o => point >= o.s && point < o.e);
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

/* ---------- 모달 ---------- */
function openCreate(date) {
    editingId = null;
    el.form.reset();
    el.date.value = fmtDate(date);
    el.start.value = '18:00';
    el.end.value = '20:00';
    el.repeatUntil.value = DEFAULT_REPEAT_UNTIL;

    el.resTypeField.classList.remove('hidden');
    el.editScopeHint.classList.add('hidden');
    setResType('once');

    el.modalTitle.textContent = t('modal.newResTitle');
    el.submitBtn.textContent = t('modal.btnSubmit');
    refreshTimeOptions();
    openOverlay(el.resModal);
}

function openEdit(res) {
    editingId = res.id;
    el.date.value = res.date;
    $('teamName').value = res.teamName;
    $('userName').value = res.userName;
    $('peopleCount').value = res.peopleCount;
    $('purpose').value = res.purpose;

    // 수정은 항상 해당 회차 하나만 대상으로 합니다.
    el.resTypeField.classList.add('hidden');
    el.repeatUntilField.classList.add('hidden');
    resType = 'once';
    el.dateLabel.textContent = t('modal.labelDate');

    if (res.seriesId) {
        el.editScopeText.textContent = t('modal.editScopeSeries', { date: dayLabel(parseDate(res.date)) });
        el.editScopeHint.classList.remove('hidden');
    } else {
        el.editScopeHint.classList.add('hidden');
    }

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
    el.editScopeHint.classList.add('hidden');
    el.resTypeField.classList.remove('hidden');
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

    const base = {
        startTime,
        endTime,
        isNextDay,
        teamName: $('teamName').value.trim(),
        userName: $('userName').value.trim(),
        peopleCount: Number($('peopleCount').value),
        purpose: $('purpose').value
    };

    /** 해당 날짜에 이 시간대가 비어 있는지 */
    const isFree = dateStr => {
        const s = ts(dateStr, startTime, false);
        const e = ts(dateStr, endTime, isNextDay);
        return !reservations.some(r => r.id !== editingId && s < endTs(r) && e > startTs(r));
    };

    // ----- 저장할 목록 만들기 -----
    let payloads;

    if (!editingId && resType === 'weekly') {
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
        payloads = free.map(d => ({ ...base, date: d, seriesId, repeatUntil: until }));
    } else {
        if (!isFree(date)) {
            toast(t('err.overlap'), 'error');
            refreshTimeOptions();
            return;
        }
        payloads = [{ ...base, date }];
    }

    // ----- 저장 -----
    const originalLabel = el.submitBtn.textContent;
    el.submitBtn.disabled = true;
    el.submitBtn.textContent = t('btn.saving');

    try {
        if (editingId) {
            // 고정 예약이라도 수정은 이 회차 하나만 반영합니다.
            await store.update(editingId, payloads[0]);
            toast(t('msg.updated'), 'success');
        } else if (payloads.length > 1) {
            await store.addMany(payloads);
            toast(t('msg.savedSeries', { count: payloads.length }), 'success');
        } else {
            await store.add(payloads[0]);
            toast(t('msg.saved'), 'success');
        }

        selectedDate = parseDate(payloads[0].date);
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        closeReservationModal();
        renderAll();
    } catch (err) {
        console.error(err);
        toast(t(err?.code === 'permission-denied' ? 'err.permission' : 'err.save'), 'error');
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
        await store.remove(id);
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
            await store.removeMany(siblings.map(r => r.id));
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

/* ---------- 관리자 ---------- */

/** 로그인 상태에 맞춰 하단 관리자 영역과 헤더 배지를 갱신 */
function updateAdminUI() {
    // 익명 로그인이 실패해도 관리자 버튼은 보여줍니다. (누르면 원인을 안내)
    const cloud = store && store.mode === 'cloud';
    const google = cloud && currentUser && !currentUser.isAnonymous;

    el.adminLoginBtn.classList.toggle('hidden', !cloud || google);
    el.adminInfo.classList.toggle('hidden', !google);
    el.adminBadge.classList.toggle('hidden', !isAdmin());

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
    el.closeModalBtn.addEventListener('click', closeReservationModal);
    el.cancelBtn.addEventListener('click', closeReservationModal);
    el.resModal.addEventListener('click', e => { if (e.target === el.resModal) closeReservationModal(); });
    el.form.addEventListener('submit', handleSubmit);

    el.date.addEventListener('change', () => {
        refreshTimeOptions();
        updateRepeatSummary();
    });
    el.repeatUntil.addEventListener('change', updateRepeatSummary);
    el.resTypeGroup.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => setResType(btn.dataset.type));
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
        el.dateLabel.textContent = t(resType === 'weekly' ? 'modal.labelFirstDate' : 'modal.labelDate');
        updateRepeatSummary();
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
        updateAdminUI();
        renderDay();
    });

    // 진행중 표시를 1분마다 갱신
    setInterval(() => {
        renderDay();
        renderUpcoming();
    }, 60_000);
}

init();
