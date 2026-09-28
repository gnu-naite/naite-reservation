/* 베타 테스트용 설정 — 정식 설정(../config.js)을 그대로 쓰고
   예약 저장 위치만 별도 테스트 컬렉션으로 분리합니다. (실제 예약에 영향 없음) */
export * from '../config.js';
export const COLLECTION_NAME = "naite_reservations_beta";

/**
 * 카카오톡 공유용 JavaScript 키 (카카오디벨로퍼스 > naite res > 플랫폼 키).
 * 브라우저에 공개되는 값이며, 콘솔에 등록한 도메인에서만 동작합니다.
 * 정식 전환 때 루트 config.js 로 옮기세요.
 */
export const KAKAO_JS_KEY = "6a20847a93503b12e90ebb8d3d94dc5e";
