/* 베타 테스트용 설정 — 정식 설정(../config.js)을 그대로 쓰고
   예약 저장 위치만 별도 컬렉션으로 분리합니다. (실제 예약에 영향 없음) */
export * from '../config.js';
export const COLLECTION_NAME = "naite_reservations_beta";
