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

- 보기: 누구나 / 예약: 로그인(익명 포함)한 누구나
- 수정·삭제: 작성 기기(`ownerUid`) · 관리자(`ADMIN_UIDS`, 구글 로그인) · **공유 링크를 연 기기** (베타 기능)
- 공유 링크 (베타):
  - `naite_shares/{sh_xxx}` `{ ownerUid, key }` — 만든 사람만 읽기. 예약과 같은 배치에서 생성
  - `naite_access/{uid}/grants/{sh_xxx}` `{ key }` — 링크(`?share=sh_xxx.key`)를 연 기기에 생성, 규칙이 key 대조
  - 예약 문서의 `shareId` 로 묶임 (고정 예약은 전 회차가 한 링크)
  - 링크는 **연 그 브라우저**에만 권한이 생깁니다 (카톡에서 열면 카톡 내장 브라우저)
- 보안 규칙: [firestore.rules](firestore.rules). **정식·베타 공용**이라 게시하는 순간 정식에도 적용됩니다.
  저장소 파일은 기록용이고, 실제 반영은 Firebase 콘솔 > Firestore > 규칙에 붙여넣고 [게시] (사용자가 직접).

## 베타 현황

- `beta/config.js` 는 루트 설정을 재수출하고 **예약 컬렉션만 `naite_reservations_beta`(테스트 전용)** 로 바꿉니다.
  베타에서 한 예약·수정·취소는 정식 예약표에 영향이 없습니다. (주소는 GitHub Pages `/beta/` 그대로)
- 정식 예약을 베타로 복사: 규칙상 **관리자만**, 베타 컬렉션에 한해 작성자(`ownerUid`)를 그대로 둔 채 만들 수 있습니다.
  관리자로 로그인한 브라우저에서 베타 페이지를 열고, 정식 문서를 같은 id 로 베타에 `set` (베타에 이미 있는 id 는 건너뜀, `shareId` 는 빼고 복사).
  원래 작성 기기에서는 베타 복사본도 수정할 수 있습니다.
  - 2026-09-28 정식 208건을 베타로 복사함 (정식은 읽기만, 변경 없음). 다시 맞출 때는 관리자 세션의 베타 페이지 콘솔에서:
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
- 베타에만 있는 기능: 공유 링크 / 권한 부여 배너 / 공유 창(자동 복사·복사하기·카카오톡으로 보내기) /
  수정 화면의 한 번↔고정 전환 / 화면 정리(오늘 일정 한 줄 행, 카드 중첩 제거)
- 카카오톡 공유: 카카오디벨로퍼스 앱 `naite res`. `beta/config.js` 의 `KAKAO_JS_KEY`(공개 값).
  콘솔에 **JavaScript SDK 도메인**과 **제품 링크 관리 > 웹 도메인** 둘 다 `https://gnu-naite.github.io`, `http://localhost:5173`, `http://localhost:5174` 등록됨.
  새 도메인에서 쓰려면 두 곳 모두 추가해야 합니다.

## 정식 전환 체크리스트 (베타 → 루트)

1. `beta/app.js · store.js · styles.css · index.html` 을 루트로 복사
2. 루트 `index.html` 에서 베타 안내 배너(`beta-banner`) 블록 삭제, `?v=` 숫자 올리기
3. `KAKAO_JS_KEY` 를 루트 `config.js` 로 옮김 (루트 `COLLECTION_NAME` 은 원래 정식이라 그대로)
4. 규칙은 이미 공유 기능 포함이라 재게시 불필요
5. `beta/` 는 다음 테스트용으로 두거나 삭제

## 로컬 실행·테스트

- 미리보기: `node tools/serve.js . 5173` → http://localhost:5173/ (정식), http://localhost:5173/beta/ (베타)
  Claude 데스크톱 앱은 [.claude/launch.json](.claude/launch.json) 의 `naite-preview` 로 바로 띄울 수 있습니다.
  (베타는 실제 예약표를 쓰므로 쓰기 테스트는 설정을 테스트 컬렉션으로 바꾼 복사본에서 하세요)
- 다른 기기 흉내: `localhost` 와 `127.0.0.1` 은 저장소가 분리돼 서로 다른 익명 uid 가 됩니다.
- 보안 규칙 시나리오 테스트(실제 Firebase, 테스트 컬렉션 사용, 54건):
  `cd tools/rules-test && npm install && npm test`
  공유·권한 문서는 규칙상 앱에서 지울 수 없어 테스트할 때마다 조금씩 남습니다 (콘솔에서 `naite_shares`, `naite_access` 삭제 가능).

## 작업 방식

- Claude 가 구현하고, 커밋 전에 **Codex 로 리뷰**를 받아 합의될 때까지 다듬습니다 (Codex 는 읽기 전용).
  건너뛰는 경우: 사용자가 "코덱스 없이" / 코드 변경 없음 / diff 5줄 이하.
  `codex exec -s read-only` 로 1라운드, 이후 `codex exec resume <session id>` 로 직전 이후 바뀐 부분만. 최대 3라운드, 합의 안 된 쟁점은 사용자에게.
- 커밋·푸시는 사용자 확인 후. `main` 푸시 = 배포입니다.
- 이 PC 에 git 사용자 설정이 없으면 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit ...` 처럼 1회성으로 지정 (기존 커밋 작성자와 동일).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By` 한 줄.

## 남은 확인 사항

- 카카오톡 공유를 실제로 보내 받은 사람이 [수정 권한 받기] → 초록 배너까지 되는지 (카카오 로그인 필요, 폰에서 확인)
