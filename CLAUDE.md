# 나이테 동아리방 예약 — 작업 안내 (Claude/개발자용)

사용자 안내·설치법은 [README.md](README.md). 여기는 이어서 개발할 때 알아야 할 것만 적습니다.
답변·코드 주석은 **한국어**로 합니다.

## 구조

- 빌드 없는 정적 사이트(GitHub Pages, `main` 브랜치 루트). `main` 에 푸시하면 1~2분 뒤 배포됩니다.
  - 정식: https://gnu-naite.github.io/naite-reservation/ — 루트의 `index.html · app.js · store.js · styles.css · config.js`
  - 베타: https://gnu-naite.github.io/naite-reservation/beta/ — `beta/` 폴더. 루트 파일을 복사해 고친 것
- 저장소: Firestore(프로젝트 `naite-reservation`). 로그인 없이 **익명 인증**으로 기기(브라우저)마다 uid 가 생깁니다.
- 파일을 고치면 `index.html` 의 `styles.css?v=N`, `app.js?v=N` 숫자를 올려 캐시를 무효화합니다.

## 권한 모델

- 보기: 누구나
- **정식·베타**: 보기만 할 때는 로그인 불필요. 예약·수정·삭제는 **관리자 또는 카톡 닉네임을 연동한 기기**만 가능하며 작성자 구분 없이 모든 예약을 관리합니다.
  새 예약은 예약자 이름·인원수 입력 없이 카톡 닉네임(관리자도 동일, 미연동 관리자는 '관리자')을 기록합니다. 기존 예약자·인원수·반복 정보는 유지합니다.
- **관리자**: Firebase 이메일/비밀번호 계정. 정식은 config.js의 PASSWORD_ADMIN_EMAIL·PASSWORD_ADMIN_UID,
  베타는 beta/config.js의 BETA_ADMIN_EMAIL·BETA_ADMIN_UID로 같은 계정을 사용합니다. 비밀번호는 소스에 저장하지 않습니다.
  기존 ADMIN_UIDS는 과거 관리자 세션·기록 표시를 유지합니다.
- **한계**: kakaoNick은 기기가 스스로 쓰므로 카카오 계정 소유를 서버에서 검증하지 않습니다.
  위조 방지가 필요하면 서버에서 카카오 토큰을 검증해야 합니다. 수정·취소 기록도 앱이 남기는 것이며 규칙으로 강제하지 않습니다.
- 보안 규칙: [firestore.rules](firestore.rules). 정식·베타·테스트 컬렉션은 동일한 권한 및 입력 검사를 적용합니다.
  실제 반영은 Firebase 콘솔 > Firestore > 규칙에서 게시합니다.

## 정식·베타 현황

- 2026-10-23 베타의 화면·카카오 닉네임·로그·비밀번호 로그인 기능을 정식으로 승격했습니다.
  정식 예약 컬렉션 naite_reservations의 기존 238건은 그대로 사용하며 베타 데이터를 복사하거나 덮어쓰지 않았습니다.
- 정식은 Firebase 기본 앱을 유지해 기존 기기 UID를 보존하고, 베타는 naite-beta 앱으로 인증 상태를 분리합니다.
  베타 예약은 naite_reservations_beta에 별도로 저장됩니다.
- 카톡 채팅 OCR 패널·자동 처리는 중지했습니다. 정식 store에는 OCR API를 넣지 않았고 이전 처리기 소스는 beta/와 tools/에 보관합니다.
- **카톡 닉네임 연동**: 배포 주소(https)에서 첫 방문 시(PC 포함) 안내창을 한 번 띄움 → [카카오톡 연동]이면 카카오 로그인
  (카톡 인앱은 동의 1회, PC 등은 카카오 로그인 화면 1회) → `/v1/api/talk/profile` 닉네임을 `naite_users/{uid}` 에 저장.
  [취소]하면 다시 묻지 않고 하단 [카톡 닉네임 연결] 안내. 연동 전에 [예약하기]를 누르면 다시 안내창.
- **최근 수정·취소(관리자)**: 수정·취소 때 `naite_logs` 에 { action, uid, col, batch, at(서버 시각), res(날짜·시간·팀·예약자) } 를
  같은 배치로 남김. 관리자 로그인 시에만 예약표 아래 카드 — **하루씩 한 장**(◀ ▶, 기록 있는 날짜만), batch 단위로 한 줄:
  "[팀] 고정 예약 전체 취소 (N회)" / "[팀] 날짜 시간 예약 취소" / "(으)로 수정" + 누가(관리자는 '관리자') · HH:MM.
  [이 날 기록 삭제]는 보고 있는 날짜의 기록만 지움(규칙: 관리자만 삭제). `[TEST]` 팀명(규칙 테스트)은 표시 안 함.
  기록은 앱이 남기는 것이라 규칙으로 강제하진 않음 (개발자 도구로 우회 가능). 규칙에서 기록을 확인하게 하면
  배치당 문서 조회 한도(20회) 때문에 60회 고정 예약 일괄 취소가 막히므로, 강제하려면 서버(Cloud Functions)가 필요.
- 카카오 콘솔(앱 `naite res`): 카카오 로그인 ON, JS 키 리다이렉트 URI `https://gnu-naite.github.io/naite-reservation/` 및 `https://gnu-naite.github.io/naite-reservation/beta/`,
  닉네임 필수 동의. 토큰 교환은 JS 키로 브라우저에서 (클라이언트 시크릿은 REST 키에만 있어 손대지 않음).
  `config.js` 및 `beta/config.js` 의 `KAKAO_JS_KEY`(공개 값). JS SDK 도메인에 `https://gnu-naite.github.io`, `http://localhost:5173`, `http://localhost:5174` 등록됨.
- 오늘 일정: 한 줄짜리 일정을 시간순으로 작은 화살표로 이음 (자정 넘긴 어제 예약 포함)
- 편의: 기본 시간은 18시(오늘이면 지금) 이후 첫 빈 시간, 새 예약은 지난 시간 불가, 날짜 상세의 [이 날 예약],
  '내 예약 N건' 칩(이 기기에서 만든 예약), 자정 넘긴 예약을 다음 날 목록에도 표시, 수정 화면의 한 번↔고정 전환
- 예전 베타의 팀 링크·예약별 공유 링크·공유 창은 코드·규칙·테스트에서 모두 제거함 (연동한 누구나 수정 가능해져 필요 없음).
  DB 에 남은 `naite_shares`, `naite_access` 문서는 규칙상 아무도 못 읽음 — 콘솔에서 컬렉션째 지워도 됨
- 하단 [카톡 연동 해제] (연동된 기기에서만 보임): 닉네임을 비우고 첫 방문 안내도 다시 뜨게 함 (테스트·기기 정리용)

## 이후 정식 전환 시

- 정식 COLLECTION_NAME과 Firebase 기본 앱, 정식 카카오 리다이렉트 주소를 유지합니다.
- 베타 배너는 정식에 넣지 않습니다. 바뀐 파일의 캐시 버전과 모듈 import 버전을 올립니다.
- 예약 데이터 이동은 코드 승격과 별도 작업입니다. 명시적인 요청 없이 베타 예약을 정식에 복사하지 않습니다.
- 공용 규칙 변경은 정식 권한에도 적용되므로 테스트 컬렉션으로 검사합니다.

## 로컬 실행·테스트

- 미리보기: `node tools/serve.js . 5173` → http://localhost:5173/ (정식), http://localhost:5173/beta/ (베타)
  Claude 데스크톱 앱은 [.claude/launch.json](.claude/launch.json) 의 `naite-preview` 로 바로 띄울 수 있습니다.
  (베타는 테스트 전용 예약표 `naite_reservations_beta` 를 씁니다. 카카오 닉네임 자동 연결은 https 배포 주소에서만)
- 다른 기기 흉내: `localhost` 와 `127.0.0.1` 은 저장소가 분리돼 서로 다른 익명 uid 가 됩니다.
- 정식 저장소 회귀 검사: `node --experimental-vm-modules tools/production-store.test.mjs`
- 보안 규칙 시나리오 테스트(실제 Firebase, 테스트 컬렉션 사용):
  `cd tools/rules-test && npm install && npm test`
- 관리자 권한 검사: `NAITE_BETA_ADMIN_PASSWORD` 환경변수를 설정하고 `node tools/rules-test/beta-admin.mjs`. 정식 예약에는 쓰지 않습니다.
  테스트 기기의 이름 문서(`naite_users`)와 기록(`naite_logs`, [TEST] 팀명이라 화면엔 안 보임)이 조금씩 남습니다
  (기록은 관리자 화면 [이 날 기록 삭제], 이름 문서는 콘솔에서 삭제 가능).

## 작업 방식

- Claude 가 구현하고, 커밋 전에 **Codex 로 리뷰**를 받아 합의될 때까지 다듬습니다 (Codex 는 읽기 전용).
  건너뛰는 경우: 사용자가 "코덱스 없이" / 코드 변경 없음 / diff 5줄 이하.
  `codex exec -s read-only` 로 1라운드, 이후 `codex exec resume <session id>` 로 직전 이후 바뀐 부분만. 최대 3라운드, 합의 안 된 쟁점은 사용자에게.
- 커밋·푸시는 사용자 확인 후. `main` 푸시 = 배포입니다.
- 이 PC 에 git 사용자 설정이 없으면 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...` 처럼 1회성으로 지정 (기존 커밋 작성자와 동일).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By` 한 줄.

## 남은 확인 사항

- 폰(카톡 인앱)·PC: 첫 방문 안내 → 카톡 연동 → 수정·취소 버튼이 보이는지, 예약자에 닉네임이 들어가는지
