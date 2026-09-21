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
