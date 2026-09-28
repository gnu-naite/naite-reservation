// 실제 Firebase 에 대한 보안 규칙 시나리오 테스트
//  - 1~15: 정식과 같은 규칙을 쓰는 테스트 컬렉션 naite_reservations_test (작성자·관리자만 수정)
//  - 16:   베타 컬렉션 naite_reservations_beta (카톡 연동한 기기면 누구나 수정·삭제)
// 실행: cd tools/rules-test && npm install && npm test
// 익명 사용자 A, B, C = 서로 다른 기기. 끝나면 테스트 문서를 지웁니다.
import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInAnonymously } from 'firebase/auth';
import {
    getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    writeBatch, deleteField, query, where, serverTimestamp
} from 'firebase/firestore';

import { FIREBASE_CONFIG as CONFIG } from '../../config.js';

// 실제 예약을 건드리지 않도록 정식과 같은 규칙의 테스트 컬렉션에서 검증합니다.
const COL = 'naite_reservations_test';
const BETA = 'naite_reservations_beta';
const TAG = '[TEST]';

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALNUM[b % 62]).join('');

async function device(name, signIn = true) {
    const app = initializeApp(CONFIG, name);
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const db = getFirestore(app);
    const uid = signIn ? (await signInAnonymously(auth)).user.uid : null;
    return { name, db, uid, col: collection(db, COL) };
}

const res = (date, extra = {}) => ({
    date, startTime: '10:00', endTime: '11:00', isNextDay: false,
    teamName: `${TAG} 팀`, userName: '테스터', peopleCount: 3, purpose: '합주', ...extra
});

const results = [];
async function expect(label, shouldAllow, fn) {
    let allowed = true, msg = '';
    try { await fn(); } catch (e) { allowed = false; msg = e.code || e.message; }
    const ok = allowed === shouldAllow;
    results.push({ ok, label, expected: shouldAllow ? '허용' : '거부', got: allowed ? '허용' : `거부(${msg})` });
}

const created = [];   // 정리용 [device, id]

async function createPlain(d, date, extra = {}) {
    const ref = doc(d.col);
    await setDoc(ref, { ...res(date, extra), ownerUid: d.uid, createdAt: 'x' });
    created.push([d, ref.id]);
    return ref.id;
}
const anon = await device('anon', false);
const A = await device('A');
const B = await device('B');
const C = await device('C');
if (new Set([A.uid, B.uid, C.uid]).size !== 3) throw new Error('기기 uid 가 겹칩니다');
console.log('uid A/B/C:', A.uid, B.uid, C.uid);
const leftover = { logs: 0 };   // 규칙상 앱에서 지울 수 없는 문서 (보고용)

// 1 비로그인
await expect('1a 비로그인 테스트 컬렉션 읽기', true, () => getDocs(anon.col));
await expect('1b 비로그인 예약 생성', false, () => setDoc(doc(anon.col), { ...res('2030-01-01'), ownerUid: 'x', createdAt: 'x' }));
await expect('1c 비로그인 정식 읽기', true, () => getDocs(collection(anon.db, 'naite_reservations')));

// 2 정식 규칙(테스트 컬렉션): 작성자 A
let plainId;
await expect('2a A: 예약 생성', true, async () => { plainId = await createPlain(A, '2030-01-08'); });
await expect('2b A: ownerUid 를 남으로 생성', false, () => setDoc(doc(A.col), { ...res('2030-01-10'), ownerUid: B.uid, createdAt: 'x' }));
await expect('2c A: 내 예약 수정', true, () => updateDoc(doc(A.db, COL, plainId), { userName: '작성자수정' }));
await expect('2d A: 내 예약 삭제', true, async () => {
    const id = await createPlain(A, '2030-01-15');
    await deleteDoc(doc(A.db, COL, id));
});
await expect('2e A: 60회 고정 예약 한 배치', true, async () => {
    const b = writeBatch(A.db);
    for (let i = 0; i < 60; i++) {
        const ref = doc(A.col);
        b.set(ref, { ...res(new Date(Date.UTC(2031, 0, 1 + i * 7)).toISOString().slice(0, 10), { seriesId: 's-60' }), ownerUid: A.uid, createdAt: 'x' });
        created.push([A, ref.id]);
    }
    await b.commit();
});
let atomicRef;
await expect('2f A: 한 건 위반 배치는 거부', false, async () => {
    const b = writeBatch(A.db);
    atomicRef = doc(A.col);
    b.set(atomicRef, { ...res('2030-02-01'), ownerUid: A.uid, createdAt: 'x' });
    b.set(doc(A.col), { ...res('2030-02-02'), peopleCount: 0, ownerUid: A.uid, createdAt: 'x' });
    await b.commit();
});
await expect('2g 거부된 배치의 정상 건도 저장 안 됨', true, async () => {
    if ((await getDoc(atomicRef)).exists()) throw new Error('일부만 저장됨');
});
await expect('2h A: shareId 붙여 생성(공유 링크 기능 제거)', false, () =>
    setDoc(doc(A.col), { ...res('2030-02-03'), shareId: `sh_${rid(20)}`, ownerUid: A.uid, createdAt: 'x' }));
await expect('2i A: 예약자 이름 없이 생성(정식은 필수)', false, async () => {
    const { userName, ...noName } = res('2030-02-04');
    await setDoc(doc(A.col), { ...noName, ownerUid: A.uid, createdAt: 'x' });
});

// 3 다른 기기 B
await expect('3a B: A 예약 수정', false, () => updateDoc(doc(B.db, COL, plainId), { userName: '해커' }));
await expect('3b B: A 예약 삭제', false, () => deleteDoc(doc(B.db, COL, plainId)));
await expect('3c B: 새 예약 생성은 가능', true, async () => { await createPlain(B, '2030-01-11'); });
await expect('3d B: 예전 공유 문서 읽기', false, () => getDocs(collection(B.db, 'naite_shares')));
await expect('3e B: 예전 공유 문서 만들기', false, () =>
    setDoc(doc(B.db, 'naite_shares', `sh_${rid(20)}`), { ownerUid: B.uid, key: rid(32), createdAt: 'x' }));
await expect('3f B: 예전 권한 문서 만들기', false, () =>
    setDoc(doc(B.db, 'naite_access', B.uid, 'grants', `sh_${rid(20)}`), { key: rid(32), createdAt: 'x' }));

// 4 작성자도 바꿀 수 없는 것
await expect('4a A: shareId 새로 붙이기', false, () => updateDoc(doc(A.db, COL, plainId), { shareId: `sh_${rid(20)}` }));
await expect('4f A: 빈 shareId 붙이기', false, () => updateDoc(doc(A.db, COL, plainId), { shareId: '' }));
await expect('4b A: ownerUid 변경', false, () => updateDoc(doc(A.db, COL, plainId), { ownerUid: B.uid }));
await expect('4c A: 인원 0명', false, () => updateDoc(doc(A.db, COL, plainId), { peopleCount: 0 }));
await expect('4d A: 팀명 31자', false, () => updateDoc(doc(A.db, COL, plainId), { teamName: 'x'.repeat(31) }));
await expect('4e A: 예약자 이름 지우기(정식은 필수)', false, () => updateDoc(doc(A.db, COL, plainId), { userName: deleteField() }));

// 5 editedBy: 본인 uid 만 기록, 정식 화면(기록 안 함)은 그대로 통과
await expect('5a A: editedBy 에 남의 uid 로 생성', false, () =>
    setDoc(doc(A.col), { ...res('2030-05-01'), ownerUid: A.uid, editedBy: B.uid, createdAt: 'x' }));
await expect('5b A: 수정하며 editedBy 를 남의 uid 로', false, () => updateDoc(doc(A.db, COL, plainId), { userName: '위장', editedBy: B.uid }));
await expect('5c A: editedBy 안 건드리는 수정(정식 방식)', true, () => updateDoc(doc(A.db, COL, plainId), { userName: '정식수정' }));
await expect('5d A: editedBy 를 본인으로 수정', true, () => updateDoc(doc(A.db, COL, plainId), { userName: '본인', editedBy: A.uid }));

// 14 기기별 표시 이름
await expect('14a A: 내 이름 저장', true, () => setDoc(doc(A.db, 'naite_users', A.uid), { kakaoNick: '테스트닉', updatedAt: 'x' }, { merge: true }));
await expect('14b A: 내 이름 추가 저장(merge)', true, () => setDoc(doc(A.db, 'naite_users', A.uid), { name: '테스터', updatedAt: 'x' }, { merge: true }));
await expect('14c A: 내 이름 읽기', true, () => getDoc(doc(A.db, 'naite_users', A.uid)));
await expect('14d B: A 이름 읽기', false, () => getDoc(doc(B.db, 'naite_users', A.uid)));
await expect('14e B: A 이름 덮어쓰기', false, () => setDoc(doc(B.db, 'naite_users', A.uid), { kakaoNick: '해커', updatedAt: 'x' }));
await expect('14f B: 이름 목록 전체 읽기', false, () => getDocs(collection(B.db, 'naite_users')));
await expect('14g A: 허용 안 된 필드', false, () => setDoc(doc(A.db, 'naite_users', A.uid), { admin: true, updatedAt: 'x' }, { merge: true }));
await expect('14h A: 닉네임 41자', false, () => setDoc(doc(A.db, 'naite_users', A.uid), { kakaoNick: 'x'.repeat(41), updatedAt: 'x' }, { merge: true }));

// 15 수정·취소 기록: 본인 uid·서버 시각으로만, 관리자만 읽기, 예약 취소와 한 배치
const logDoc = (d, extra = {}) => ({
    action: 'delete', uid: d.uid, col: COL, batch: 'b1', at: serverTimestamp(),
    res: { date: '2030-06-01', startTime: '10:00', endTime: '11:00', teamName: `${TAG} 팀`, userName: '테스터' }, ...extra
});
await expect('15a A: 예약 취소 + 기록 한 배치', true, async () => {
    const id = await createPlain(A, '2030-06-01');
    const b = writeBatch(A.db);
    b.delete(doc(A.db, COL, id));
    b.set(doc(collection(A.db, 'naite_logs')), logDoc(A));
    await b.commit();
    leftover.logs++;
});
await expect('15b A: 남의 uid 로 기록', false, () => setDoc(doc(collection(A.db, 'naite_logs')), logDoc(A, { uid: B.uid })));
await expect('15c A: 서버 시각 아닌 기록', false, () => setDoc(doc(collection(A.db, 'naite_logs')), logDoc(A, { at: 'x' })));
await expect('15d A: 허용 안 된 action', false, () => setDoc(doc(collection(A.db, 'naite_logs')), logDoc(A, { action: 'wipe' })));
await expect('15e A: res 에 추가 필드', false, () => setDoc(doc(collection(A.db, 'naite_logs')), logDoc(A, { res: { date: 'x', admin: true } })));
await expect('15j A: res 빈 기록', false, () => setDoc(doc(collection(A.db, 'naite_logs')), logDoc(A, { res: {} })));
await expect('15f A: 기록 읽기(관리자 아님)', false, () => getDocs(collection(A.db, 'naite_logs')));
let logRef;
await expect('15g A: 기록 남기기', true, async () => {
    logRef = doc(collection(A.db, 'naite_logs'));
    await setDoc(logRef, logDoc(A, { action: 'update' }));
    leftover.logs++;
});
await expect('15h A: 내 기록 고치기', false, () => updateDoc(logRef, { action: 'delete' }));
await expect('15i A: 내 기록 지우기', false, () => deleteDoc(logRef));

// 16 베타: 관리자 또는 카톡 연동한 기기만 예약·수정·삭제 (작성자·공유 링크 무관, 예약자 이름·인원수 없이)
// A 는 14a 에서 카톡 닉네임을 저장했고, C 는 아직 없음. B 는 이름만 저장
const betaDoc = (d, date, extra = {}) => ({
    date, startTime: '10:00', endTime: '11:00', isNextDay: false, teamName: `${TAG} 베타팀`, purpose: '합주',
    userName: '카톡닉', ownerUid: d.uid, editedBy: d.uid, createdAt: 'x', ...extra
});
let betaId;
await expect('16a C(미연동): 베타 예약 생성', false, () => setDoc(doc(collection(C.db, BETA)), betaDoc(C, '2030-07-01')));
await expect('16b A(연동): 이름·인원수 없이 베타 예약 생성', true, async () => {
    const ref = doc(collection(A.db, BETA));
    const { userName, ...noName } = betaDoc(A, '2030-07-01');
    await setDoc(ref, noName);
    betaId = ref.id;
});
await expect('16c A(연동): 인원 0명 베타 예약', false, () => setDoc(doc(collection(A.db, BETA)), betaDoc(A, '2030-07-02', { peopleCount: 0 })));
await expect('16d 정식 규칙은 그대로: 이름 없이 테스트 컬렉션 예약', false, async () => {
    const { userName, ...noName } = res('2030-07-03');
    await setDoc(doc(A.col), { ...noName, ownerUid: A.uid, createdAt: 'x' });
});
await expect('16e B(이름만): 베타 예약 수정', false, async () => {
    await setDoc(doc(B.db, 'naite_users', B.uid), { name: '이름만', updatedAt: 'x' }, { merge: true });
    await updateDoc(doc(B.db, BETA, betaId), { teamName: `${TAG} 이름만`, editedBy: B.uid });
});
await expect('16f C(미연동): 베타 예약 삭제', false, () => deleteDoc(doc(C.db, BETA, betaId)));
await expect('16g C: 카톡 닉네임 연동', true, () => setDoc(doc(C.db, 'naite_users', C.uid), { kakaoNick: '연동닉', updatedAt: 'x' }, { merge: true }));
await expect('16h C(연동 후): 남의(A) 베타 예약 수정 + 기록', true, async () => {
    const b = writeBatch(C.db);
    b.update(doc(C.db, BETA, betaId), { teamName: `${TAG} 연동후`, editedBy: C.uid });
    b.set(doc(collection(C.db, 'naite_logs')), logDoc(C, { action: 'update', col: BETA }));
    await b.commit();
    leftover.logs++;
});
await expect('16i C(연동): 60회 고정 예약 생성 → A(연동)가 기록과 함께 일괄 삭제', true, async () => {
    const ids = [];
    const mk = writeBatch(C.db);
    for (let i = 0; i < 60; i++) {
        const ref = doc(collection(C.db, BETA));
        mk.set(ref, betaDoc(C, new Date(Date.UTC(2032, 0, 1 + i * 7)).toISOString().slice(0, 10), { seriesId: 's-beta' }));
        ids.push(ref.id);
    }
    await mk.commit();
    const b = writeBatch(A.db);
    ids.forEach(id => {
        b.delete(doc(A.db, BETA, id));
        b.set(doc(collection(A.db, 'naite_logs')), logDoc(A, { col: BETA }));
    });
    await b.commit();
    leftover.logs += 60;
});
await expect('16j C(연동): 남의(A) 베타 예약 삭제', true, () => deleteDoc(doc(C.db, BETA, betaId)));
await expect('16k 정식 규칙은 그대로: 연동한 A 가 B 의 테스트 컬렉션 예약 수정', false, async () => {
    const id = await createPlain(B, '2030-07-08');
    await updateDoc(doc(A.db, COL, id), { userName: '연동해도안됨', editedBy: A.uid });
});

// 정리: 남은 테스트 문서 삭제 (작성자 기기로)
let cleaned = 0;
for (const d of [A, B, C]) {
    const snap = await getDocs(query(d.col, where('ownerUid', '==', d.uid)));
    for (const s of snap.docs) {
        if (String(s.data().teamName).startsWith(TAG)) { await deleteDoc(s.ref); cleaned++; }
    }
}
// 베타에 남은 테스트 예약 (연동한 A 가 삭제)
for (const s of (await getDocs(collection(A.db, BETA))).docs) {
    if (String(s.data().teamName).startsWith(TAG)) { await deleteDoc(s.ref); cleaned++; }
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}  (기대 ${r.expected} / 실제 ${r.got})`);
const fail = results.filter(r => !r.ok).length;
console.log(`\n총 ${results.length}건, 실패 ${fail}건, 정리한 테스트 예약 ${cleaned}건`);
console.log(`남은 기록 ${leftover.logs}건(naite_logs) — 규칙상 관리자만 삭제 가능 (관리자 화면 [이 날 기록 삭제])`);
process.exit(fail ? 1 : 0);
