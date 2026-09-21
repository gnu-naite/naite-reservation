/* ============================================================
   나이테 동아리방 예약 — 설정 파일
   ------------------------------------------------------------
   여기만 고치면 됩니다. 나이테 전용 Firebase 프로젝트를 새로
   만든 뒤, 콘솔에서 받은 값을 아래에 그대로 붙여넣으세요.
   (희나리 동아리 프로젝트와는 완전히 분리된 별개의 저장소입니다)

   설정 방법은 README.md 를 참고하세요.
   ============================================================ */

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAa2ePCB2WGsPqnWzgP6v2ao6csnFzg6P4",
    authDomain: "naite-reservation.firebaseapp.com",
    projectId: "naite-reservation",
    storageBucket: "naite-reservation.firebasestorage.app",
    messagingSenderId: "751527072626",
    appId: "1:751527072626:web:7023ddca568df5b067c3eb"
};

/** Firestore 컬렉션 이름 (예약 데이터가 저장되는 곳) */
export const COLLECTION_NAME = "naite_reservations";

/** 동아리 정보 — 제목/푸터 표기에 사용됩니다. */
export const CLUB = {
    nameKo: "나이테",
    nameEn: "Naite"
};

/**
 * 고정(매주 반복) 예약의 기본 종료일.
 * 예약 창에서 매번 바꿀 수 있고, 여기 값은 처음 채워지는 기본값입니다.
 * 학기가 바뀌면 이 날짜만 고쳐주세요. (예: 종강일, 정기공연 날짜)
 */
export const DEFAULT_REPEAT_UNTIL = "2026-11-20";

/** 고정 예약 1건이 만들 수 있는 최대 회차 수 (안전장치) */
export const MAX_OCCURRENCES = 60;

/**
 * 관리자 UID 목록 — 여기 있는 계정은 모든 예약을 수정/삭제할 수 있습니다.
 * 사이트 하단 [관리자 로그인]으로 구글 로그인하면 화면에 UID 가 표시됩니다.
 * 그 값을 여기와 firestore.rules 의 ADMIN_UIDS 두 곳에 똑같이 넣으세요.
 * (이메일 대신 UID 를 쓰는 이유: 저장소가 공개라 이메일이 노출되지 않게)
 */
export const ADMIN_UIDS = [];
