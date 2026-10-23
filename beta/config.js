/* 베타 테스트용 설정 — 정식 설정(../config.js)을 그대로 쓰되, 예약은 베타 전용 컬렉션에 저장합니다.
   베타에서 한 예약·수정·취소는 정식 예약표에 반영되지 않습니다.
   (정식 예약은 전환 시점에 한 번 복사해 둔 것이라, 이후 정식 변경은 베타에 따라오지 않습니다) */
export * from '../config.js';
export const COLLECTION_NAME = "naite_reservations_beta";

// Firebase Authentication에서 만든 베타 전용 계정. 비밀번호는 서버에서만 검증합니다.
export const BETA_ADMIN_EMAIL = 'admin@beta.naite.invalid';
export const BETA_ADMIN_UID = 'bOm29KxDcwMA3nmUcnvhSAC4Lf13';

/**
 * 카카오 로그인(카톡 닉네임 연동)용 JavaScript 키 (카카오디벨로퍼스 > naite res > 플랫폼 키).
 * 브라우저에 공개되는 값이며, 콘솔에 등록한 도메인에서만 동작합니다.
 * 정식 전환 때 루트 config.js 로 옮기세요.
 */
export const KAKAO_JS_KEY = "6a20847a93503b12e90ebb8d3d94dc5e";
