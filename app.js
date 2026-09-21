/* ============================================================
   나이테 동아리방 예약 — 메인 로직
   ============================================================ */

import { createStore } from './store.js';
import { CLUB } from './config.js';

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
        "modal.labelStart": "시작 시간",
        "modal.labelEnd": "종료 시간",
        "modal.nextDayHint": "자정을 넘겨 익일까지 이어지는 예약입니다.",
        "modal.labelTeam": "팀명",
        "modal.phTeam": "예: 밴드팀",
        "modal.labelName": "예약자 이름",
        "modal.phName": "홍길동",
        "modal.labelCount": "사용 인원수",
        "modal.phCount": "예: 5",
        "modal.labelPurpose": "사용 목적",
        "modal.optEnsemble": "🎸 합주",
        "modal.optClass": "📚 강습",
        "modal.optPractice": "🎧 개인연습",
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

        "status.ongoing": "진행중",
        "status.nextDay": "익일",
        "btn.edit": "수정",
        "btn.delete": "예약 취소",
        "btn.saving": "저장 중...",

        "unit.people": "명",
        "msg.saved": "예약이 등록되었습니다.",
        "msg.updated": "예약이 수정되었습니다.",
        "msg.deleted": "예약이 취소되었습니다.",
        "err.sameTime": "시작 시간과 종료 시간이 같을 수 없습니다.",
        "err.overlap": "해당 시간에 이미 예약이 있습니다. 다른 시간을 선택해주세요.",
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
        "modal.labelStart": "Start time",
        "modal.labelEnd": "End time",
        "modal.nextDayHint": "This booking runs past midnight into the next day.",
        "modal.labelTeam": "Team name",
        "modal.phTeam": "e.g. Rock Band",
        "modal.labelName": "Booked by",
        "modal.phName": "John Doe",
        "modal.labelCount": "Headcount",
        "modal.phCount": "e.g. 5",
        "modal.labelPurpose": "Purpose",
        "modal.optEnsemble": "🎸 Ensemble",
        "modal.optClass": "📚 Lesson",
        "modal.optPractice": "🎧 Practice",
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

        "status.ongoing": "Ongoing",
        "status.nextDay": "next day",
        "btn.edit": "Edit",
        "btn.delete": "Cancel",
        "btn.saving": "Saving...",

        "unit.people": "",
        "msg.saved": "Reservation created.",
        "msg.updated": "Reservation updated.",
        "msg.deleted": "Reservation cancelled.",
        "err.sameTime": "Start and end time cannot be the same.",
        "err.overlap": "That time slot is already booked. Please pick another.",
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
let store = null;

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
    start: $('startTime'),
    end: $('endTime'),
    nextDayHint: $('nextDayHint'),
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
    toastArea: $('toastArea')
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
function askConfirm(message) {
    return new Promise(resolve => {
        el.confirmMessage.textContent = message;
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
        item.className = `res-item${ongoing ? ' is-ongoing' : ''}`;
        item.innerHTML = `
            <div class="res-top">
                <span class="res-time">${escapeHtml(r.startTime)} – ${escapeHtml(r.endTime)}${r.isNextDay ? `<span class="tag next-day">${escapeHtml(t('status.nextDay'))}</span>` : ''}</span>
                <span class="tag">${escapeHtml(r.purpose)}</span>
            </div>
            <div class="res-team">${escapeHtml(r.teamName)}</div>
            <div class="res-meta">
                <span><i class="fa-regular fa-user"></i>${escapeHtml(r.userName)}</span>
                <span><i class="fa-solid fa-user-group"></i>${escapeHtml(r.peopleCount)}${escapeHtml(t('unit.people'))}</span>
                ${ongoing ? `<span class="status-pill">${escapeHtml(t('status.ongoing'))}</span>` : ''}
            </div>
            <div class="res-actions">
                <button class="edit-btn" type="button"><i class="fa-solid fa-pen"></i>${escapeHtml(t('btn.edit'))}</button>
                <button class="delete-btn" type="button"><i class="fa-regular fa-trash-can"></i>${escapeHtml(t('btn.delete'))}</button>
            </div>`;

        item.querySelector('.edit-btn').addEventListener('click', () => openEdit(r));
        item.querySelector('.delete-btn').addEventListener('click', () => handleDelete(r));
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
    const newStart = ts(date, startTime, false);
    const newEnd = ts(date, endTime, isNextDay);

    // 중복 예약 최종 검증
    const overlap = reservations
        .filter(r => r.id !== editingId)
        .some(r => newStart < endTs(r) && newEnd > startTs(r));

    if (overlap) {
        toast(t('err.overlap'), 'error');
        refreshTimeOptions();
        return;
    }

    const payload = {
        date,
        startTime,
        endTime,
        isNextDay,
        teamName: $('teamName').value.trim(),
        userName: $('userName').value.trim(),
        peopleCount: Number($('peopleCount').value),
        purpose: $('purpose').value
    };

    const originalLabel = el.submitBtn.textContent;
    el.submitBtn.disabled = true;
    el.submitBtn.textContent = t('btn.saving');

    try {
        if (editingId) {
            await store.update(editingId, payload);
            toast(t('msg.updated'), 'success');
        } else {
            await store.add(payload);
            toast(t('msg.saved'), 'success');
        }

        selectedDate = parseDate(date);
        viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        closeReservationModal();
        renderAll();
    } catch (err) {
        console.error(err);
        toast(t('err.save'), 'error');
    } finally {
        el.submitBtn.disabled = false;
        el.submitBtn.textContent = originalLabel;
    }
}

async function handleDelete(res) {
    const ok = await askConfirm(t('confirm.body', { team: res.teamName }));
    if (!ok) return;
    try {
        await store.remove(res.id);
        toast(t('msg.deleted'), 'success');
    } catch (err) {
        console.error(err);
        toast(t('err.delete'), 'error');
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

    el.date.addEventListener('change', refreshTimeOptions);
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
        renderAll();
    });

    el.themeBtn.addEventListener('click', () => openOverlay(el.themeModal));
    el.closeThemeBtn.addEventListener('click', () => closeOverlay(el.themeModal));
    el.themeModal.addEventListener('click', e => { if (e.target === el.themeModal) closeOverlay(el.themeModal); });
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (!el.resModal.classList.contains('hidden')) closeReservationModal();
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

    // 진행중 표시를 1분마다 갱신
    setInterval(() => {
        renderDay();
        renderUpcoming();
    }, 60_000);
}

init();
