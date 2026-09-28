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
- **정식**: 예약은 로그인(익명 포함)한 누구나, 수정·삭제는 작성 기기(`ownerUid`) · 관리자(`ADMIN_UIDS`, 구글 로그인)
  (규칙에는 예전 베타의 공유 링크 `naite_shares` / `naite_access` 권한도 남아 있음 — 정식 화면은 쓰지 않음)
- **베타**: 예약·수정·삭제 모두 **관리자 또는 카톡 닉네임을 연동한 기기**(`naite_users/{uid}.kakaoNick`)면 누구나.
  작성자·팀·링크 구분 없음. 예약자 이름·인원수 칸 없음 — 새 예약의 `userName` 은 카톡 닉네임(관리자는 '관리자').
  **한계: 서버가 없어 `kakaoNick` 은 기기가 스스로 쓰는 값이라, 개발자 도구로 아무 닉네임이나 써 넣으면 카카오 로그인 없이
  베타 수정 권한을 얻을 수 있습니다.** 막으려면 서버(Cloud Functions)에서 카카오 토큰을 검증해 기록하거나 Firebase OIDC(카카오) 필요.
- 보안 규칙: [firestore.rules](firestore.rules). **정식·베타 공용**이라 게시하는 순간 정식에도 적용됩니다.
  저장소 파일은 기록용이고, 실제 반영은 Firebase 콘솔 > Firestore > 규칙에 붙여넣고 [게시] (사용자가 직접).
  `naite_reservations_test` 는 규칙 테스트 전용(정식과 같은 규칙).

## 베타 현황

- `beta/config.js` 는 루트 설정을 재수출하고 **예약 컬렉션만 `naite_reservations_beta`(테스트 전용)** 로 바꿉니다.
  베타에서 한 예약·수정·취소는 정식 예약표에 영향이 없습니다. (주소는 GitHub Pages `/beta/` 그대로)
- 정식 예약을 베타로 복사: 작성자(`ownerUid`)를 그대로 둔 채 만들려면 규칙에 "베타 컬렉션에 한해 관리자 허용" 예외가 필요합니다.
  **2026-09-28 복사를 마친 뒤 그 예외는 게시된 규칙에서 뺐습니다** (저장소 firestore.rules 도 예외 없음 = 게시본과 동일).
  다시 복사하려면 콘솔에서 create 규칙의 작성자 조건을
  `(request.resource.data.get('ownerUid', '') == request.auth.uid || (col == 'naite_reservations_beta' && isAdmin()))` 로 잠시 바꿔 게시 → 아래 실행 → 원래대로 게시.
  관리자로 로그인한 브라우저에서 베타 페이지를 열고, 정식 문서를 같은 id 로 베타에 `set` (베타에 이미 있는 id 는 건너뜀, `shareId` 는 빼고 복사).
  원래 작성 기기에서는 베타 복사본도 수정할 수 있습니다.
  - 2026-09-28 정식 208건 + 이후 추가된 8건(총 216건 전부)을 베타로 복사함 (정식은 읽기만, 변경 없음). 다시 맞출 때는 관리자 세션의 베타 페이지 콘솔에서:
    ```js
    const { getApp } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js');
    const fs = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
    const db = fs.getFirestore(getApp());
    const have = new Set((await fs.getDocs(fs.collection(db, 'naite_reservations_beta'))).docs.map(d => d.id));
    for (const d of (await fs.getDocs(fs.collection(db, 'naite_reservations'))).docs) {
        if (have.has(d.id)) continue;
        const { shareId, ...data } = d.data();
        await fs.setDoc(fs.doc(db, 'naite_reservations_beta', d.id), data);
    }
    ```
- **카톡 닉네임 연동**: 배포 주소(https)에서 첫 방문 시(PC 포함) 안내창을 한 번 띄움 → [카카오톡 연동]이면 카카오 로그인
  (카톡 인앱은 동의 1회, PC 등은 카카오 로그인 화면 1회) → `/v1/api/talk/profile` 닉네임을 `naite_users/{uid}` 에 저장.
  [취소]하면 다시 묻지 않고 하단 [카톡 닉네임 연결] 안내. 연동 전에 [예약하기]를 누르면 다시 안내창.
- **최근 수정·취소(관리자)**: 수정·취소 때 `naite_logs` 에 { action, uid, col, batch, at(서버 시각), res(날짜·시간·팀·예약자) } 를
  같은 배치로 남김. 관리자 로그인 시에만 예약표 아래 카드 — **하루씩 한 장**(◀ ▶, 기록 있는 날짜만), batch 단위로 한 줄:
  "[팀] 고정 예약 전체 취소 (N회)" / "[팀] 날짜 시간 예약 취소" / "(으)로 수정" + 누가(관리자는 '관리자') · HH:MM.
  [이 날 기록 삭제]는 보고 있는 날짜의 기록만 지움(규칙: 관리자만 삭제). `[TEST]` 팀명(규칙 테스트)은 표시 안 함.
  기록은 앱이 남기는 것이라 규칙으로 강제하진 않음 (개발자 도구로 우회 가능). 규칙에서 기록을 확인하게 하면
  배치당 문서 조회 한도(20회) 때문에 60회 고정 예약 일괄 취소가 막히므로, 강제하려면 서버(Cloud Functions)가 필요.
- 카카오 콘솔(앱 `naite res`): 카카오 로그인 ON, JS 키 리다이렉트 URI `https://gnu-naite.github.io/naite-reservation/beta/`,
  닉네임 필수 동의. 토큰 교환은 JS 키로 브라우저에서 (클라이언트 시크릿은 REST 키에만 있어 손대지 않음).
  `beta/config.js` 의 `KAKAO_JS_KEY`(공개 값). JS SDK 도메인에 `https://gnu-naite.github.io`, `http://localhost:5173`, `http://localhost:5174` 등록됨.
- 편의: 기본 시간은 18시(오늘이면 지금) 이후 첫 빈 시간, 새 예약은 지난 시간 불가, 날짜 상세의 [이 날 예약],
  '내 예약 N건' 칩(이 기기에서 만든 예약), 자정 넘긴 예약을 다음 날 목록에도 표시, 수정 화면의 한 번↔고정 전환
- 예전 베타의 팀 링크·예약별 공유 링크·공유 창은 제거함 (연동한 누구나 수정 가능해져 필요 없음)

## 정식 전환 체크리스트 (베타 → 루트)

1. `beta/app.js · store.js · styles.css · index.html` 을 루트로 복사
2. 루트 `index.html` 에서 베타 안내 배너(`beta-banner`) 블록 삭제, `?v=` 숫자 올리기
3. `KAKAO_JS_KEY` 를 루트 `config.js` 로 옮김 (루트 `COLLECTION_NAME` 은 원래 정식이라 그대로)
4. 규칙의 베타 전용 조건(isBeta: 카톡 연동·이름·인원수 선택)을 정식에도 적용하도록 바꿔 게시 — 정식 전환 전에 반드시 검토
5. `beta/` 는 다음 테스트용으로 두거나 삭제

## 로컬 실행·테스트

- 미리보기: `node tools/serve.js . 5173` → http://localhost:5173/ (정식), http://localhost:5173/beta/ (베타)
  Claude 데스크톱 앱은 [.claude/launch.json](.claude/launch.json) 의 `naite-preview` 로 바로 띄울 수 있습니다.
  (베타는 테스트 전용 예약표 `naite_reservations_beta` 를 씁니다. 카카오 닉네임 자동 연결은 https 배포 주소에서만)
- 다른 기기 흉내: `localhost` 와 `127.0.0.1` 은 저장소가 분리돼 서로 다른 익명 uid 가 됩니다.
- 보안 규칙 시나리오 테스트(실제 Firebase, 테스트 컬렉션 사용, 99건):
  `cd tools/rules-test && npm install && npm test`
  공유·권한·이름·기록 문서는 규칙상 앱에서 지울 수 없어 테스트할 때마다 조금씩 남습니다
  (콘솔에서 `naite_shares`, `naite_access`, `naite_users`, `naite_logs` 삭제 가능).

## 작업 방식

- Claude 가 구현하고, 커밋 전에 **Codex 로 리뷰**를 받아 합의될 때까지 다듬습니다 (Codex 는 읽기 전용).
  건너뛰는 경우: 사용자가 "코덱스 없이" / 코드 변경 없음 / diff 5줄 이하.
  `codex exec -s read-only` 로 1라운드, 이후 `codex exec resume <session id>` 로 직전 이후 바뀐 부분만. 최대 3라운드, 합의 안 된 쟁점은 사용자에게.
- 커밋·푸시는 사용자 확인 후. `main` 푸시 = 배포입니다.
- 이 PC 에 git 사용자 설정이 없으면 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...` 처럼 1회성으로 지정 (기존 커밋 작성자와 동일).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By` 한 줄.

## 남은 확인 사항

- 카카오톡 공유를 실제로 보내 받은 사람이 [수정 권한 받기] → 초록 배너까지 되는지 (카카오 로그인 필요, 폰에서 확인)
- 폰(카톡 인앱): 두 팀방 링크 열기 → 카톡 재실행 → 두 팀 모두 '내 팀'에 남는지 / 카톡 닉네임 자동 연결(첫 동의 후 재방문 시 화면 없음)
