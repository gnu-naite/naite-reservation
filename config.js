/* ============================================================
   나이테 동아리방 예약 — 설정 파일
   ------------------------------------------------------------
   여기만 고치면 됩니다. 나이테 전용 Firebase 프로젝트를 새로
   만든 뒤, 콘솔에서 받은 값을 아래에 그대로 붙여넣으세요.
   (희나리 동아리 프로젝트와는 완전히 분리된 별개의 저장소입니다)

   설정 방법은 README.md 를 참고하세요.
   ============================================================ */

export const FIREBASE_CONFIG = {
    apiKey: "여기에_apiKey_붙여넣기",
    authDomain: "여기에_authDomain_붙여넣기",
    projectId: "여기에_projectId_붙여넣기",
    storageBucket: "여기에_storageBucket_붙여넣기",
    messagingSenderId: "여기에_messagingSenderId_붙여넣기",
    appId: "여기에_appId_붙여넣기"
};

/** Firestore 컬렉션 이름 (예약 데이터가 저장되는 곳) */
export const COLLECTION_NAME = "naite_reservations";

/** 동아리 정보 — 제목/푸터 표기에 사용됩니다. */
export const CLUB = {
    nameKo: "나이테",
    nameEn: "Naite"
};
