/* 베타 테스트용 설정 — 정식 설정(../config.js)을 그대로 씁니다.
   예약 저장 위치도 정식과 같아서, 베타에서 한 예약·수정·취소는 실제 예약표에 반영됩니다.
   (분리해서 테스트하려면 아래 주석을 풀면 베타 전용 컬렉션을 씁니다) */
export * from '../config.js';
// export const COLLECTION_NAME = "naite_reservations_beta";

/**
 * 카카오톡 공유용 JavaScript 키 (카카오디벨로퍼스 > naite res > 플랫폼 키).
 * 브라우저에 공개되는 값이며, 콘솔에 등록한 도메인에서만 동작합니다.
 * 정식 전환 때 루트 config.js 로 옮기세요.
 */
export const KAKAO_JS_KEY = "6a20847a93503b12e90ebb8d3d94dc5e";
