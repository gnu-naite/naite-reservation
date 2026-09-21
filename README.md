# 나이테 동아리방 예약

경상국립대학교 중앙동아리 **나이테**의 동아리방 공유 예약 캘린더입니다.

- 배포 주소(목표): <https://gnu-naite.github.io/naite-reservation/>
- 로그인 없이 링크만 알면 누구나 예약을 보고 등록할 수 있습니다.
- **다른 동아리(희나리) 시스템과 데이터가 완전히 분리되어 있습니다.** 별도의 Firebase 프로젝트를 사용합니다.

---

## 기능

| 기능 | 설명 |
| --- | --- |
| 월별 캘린더 | 날짜별 예약 건수를 점으로 표시, 오늘 / 선택 날짜 강조 |
| 다가오는 예약 | 아직 끝나지 않은 예약 5건을 요약, 진행중이면 배지 표시 |
| 날짜별 상세 | 24시간 점유 막대 + 예약 카드 목록 (전날에서 넘어온 예약도 막대에 표시) |
| 예약 등록 / 수정 / 취소 | 날짜·시간·팀명·예약자·인원수·목적 |
| 중복 예약 차단 | 이미 잡힌 시간대는 드롭다운에서 **선택 자체가 불가능**, 저장 직전 2차 검증 |
| 익일 예약 | 22:00 → 01:00 처럼 자정을 넘기는 예약 지원 (`익일` 배지) |
| 실시간 동기화 | 다른 사람이 예약을 추가/삭제하면 새로고침 없이 즉시 반영 |
| 한국어 / English | 헤더의 언어 버튼으로 전환, 선택값 저장 |
| 테마 6종 | 기본 · 포레스트 · 오션 · 선셋 · 모노 · 다크 |
| 반응형 | PC / 태블릿 / 휴대폰 모두 대응 |

---

## 설치 순서 (총 3단계, 약 15분)

### 1단계. 나이테 전용 Firebase 프로젝트 만들기

예약 데이터가 저장될 **우리 동아리만의 공간**을 만드는 단계입니다.
여기서 만든 프로젝트는 희나리 쪽과 아무 관련이 없습니다.

1. <https://console.firebase.google.com> 접속 → 구글 계정 로그인
2. **프로젝트 추가** → 이름 `naite-reservation` 입력 → 계속
   - Google 애널리틱스는 **사용 안 함**으로 두어도 됩니다.
3. 왼쪽 메뉴 **빌드 > Firestore Database** → **데이터베이스 만들기**
   - 위치: `asia-northeast3 (서울)` 선택
   - 모드: **프로덕션 모드**로 시작 (규칙은 4번에서 넣습니다)
4. 만들어진 화면 위쪽 **규칙** 탭 클릭 → 내용을 모두 지우고
   이 저장소의 [`firestore.rules`](firestore.rules) 파일 내용을 붙여넣기 → **게시**
5. 왼쪽 위 **⚙️ > 프로젝트 설정** → 아래로 내려 **내 앱** → **웹(`</>`)** 아이콘 클릭
   - 앱 닉네임 `naite-web` 입력 → **앱 등록**
   - 화면에 나오는 `firebaseConfig = { ... }` 안의 값들을 복사

### 2단계. `config.js` 에 값 붙여넣기

[`config.js`](config.js) 파일을 열어 1단계에서 복사한 값으로 바꿉니다.

```js
export const FIREBASE_CONFIG = {
    apiKey: "AIza...",                         // ← 복사한 값
    authDomain: "naite-reservation.firebaseapp.com",
    projectId: "naite-reservation",
    storageBucket: "naite-reservation.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
};
```

> 이 값들은 브라우저에 노출되는 **공개 식별자**라서 그대로 올려도 괜찮습니다.
> 실제 접근 제어는 1단계 4번에서 넣은 보안 규칙이 담당합니다.
> (원본 희나리 사이트도 같은 방식입니다.)

설정 전까지는 사이트 상단에 주황색 안내 배너가 뜨고, 예약이 내 기기에만
임시 저장됩니다. 값을 채우면 배너가 사라지고 공유 모드로 전환됩니다.

### 3단계. GitHub Pages 로 올리기

주소를 `https://gnu-naite.github.io/naite-reservation/` 로 만들려면
**GitHub 계정(또는 조직) 이름이 `gnu-naite`**, **저장소 이름이 `naite-reservation`** 이어야 합니다.

1. <https://github.com/signup> 에서 계정명 `gnu-naite` 로 가입
   (이미 개인 계정이 있다면 <https://github.com/organizations/plan> 에서
   무료 조직을 `gnu-naite` 이름으로 만들어도 됩니다)
2. <https://github.com/new> → Repository name `naite-reservation`,
   **Public** 선택 → **Create repository**
3. 이 폴더에서 아래 명령을 실행 (`gnu-naite` 부분은 실제 계정명으로)

```bash
git remote add origin https://github.com/gnu-naite/naite-reservation.git
git branch -M main
git push -u origin main
```

4. 저장소 페이지 **Settings > Pages** 이동
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)** → **Save**
5. 1~2분 뒤 <https://gnu-naite.github.io/naite-reservation/> 접속

이후 내용을 고칠 때는 `git add . && git commit -m "수정" && git push` 만 하면
1분 안에 사이트에 반영됩니다.

---

## 동아리 이름·문구 바꾸기

- 동아리 이름: [`config.js`](config.js) 의 `CLUB.nameKo` / `CLUB.nameEn`
- 사용 목적 항목(합주/레슨/…): [`index.html`](index.html) 의 `#purpose` `<option>` 들과
  [`app.js`](app.js) 의 `modal.opt*` 번역 문구
- 색상·여백: [`styles.css`](styles.css) 맨 위 `:root` 의 CSS 변수

## 파일 구성

```
index.html        화면 구조
styles.css        디자인 (테마 6종 포함)
app.js            캘린더·예약·중복검사·다국어 로직
store.js          데이터 저장소 (Firestore ↔ 로컬 임시모드 자동 전환)
config.js         ★ Firebase 설정 — 여기만 고치면 됩니다
firestore.rules   Firebase 콘솔에 붙여넣을 보안 규칙
```

---

© 2026. 경상국립대학교 중앙동아리 '나이테'. 무단 수정 및 재배포를 금지합니다.
