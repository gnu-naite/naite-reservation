// 실제 Firebase(테스트 컬렉션 naite_reservations_beta)에 대한 보안 규칙 시나리오 테스트
// 실행: cd tools/rules-test && npm install && npm test
// 익명 사용자 A, B, C = 서로 다른 기기. 끝나면 테스트 문서를 지웁니다.
import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInAnonymously } from 'firebase/auth';
import {
    getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    writeBatch, deleteField, query, where
} from 'firebase/firestore';

import { FIREBASE_CONFIG as CONFIG } from '../../config.js';

// 규칙 블록이 정식·베타 공용이라, 실제 예약을 건드리지 않도록 테스트 컬렉션에서 검증합니다.
const COL = 'naite_reservations_beta';
const TAG = '[TEST]';

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALNUM[b % 62]).join('');
const newShare = () => ({ id: `sh_${rid(20)}`, key: rid(32) });

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

// 새 share + 예약들을 한 배치로
async function createWithShare(d, dates, extra = {}) {
    const share = newShare();
    const batch = writeBatch(d.db);
    batch.set(doc(d.db, 'naite_shares', share.id), { ownerUid: d.uid, key: share.key, createdAt: 'x' });
    const ids = dates.map(date => {
        const ref = doc(d.col);
        batch.set(ref, { ...res(date, extra), shareId: share.id, ownerUid: d.uid, createdAt: 'x' });
        return ref.id;
    });
    await batch.commit();
    ids.forEach(id => created.push([d, id]));
    leftover.shares.push(share.id);
    return { share, ids };
}
async function createPlain(d, date, extra = {}) {
    const ref = doc(d.col);
    await setDoc(ref, { ...res(date, extra), ownerUid: d.uid, createdAt: 'x' });
    created.push([d, ref.id]);
    return ref.id;
}
const grant = (d, shareId, key, uidPath = d.uid) =>
    setDoc(doc(d.db, 'naite_access', uidPath, 'grants', shareId), { key, createdAt: 'x' });

const anon = await device('anon', false);
const A = await device('A');
const B = await device('B');
const C = await device('C');
if (new Set([A.uid, B.uid, C.uid]).size !== 3) throw new Error('기기 uid 가 겹칩니다');
console.log('uid A/B/C:', A.uid, B.uid, C.uid);
const leftover = { shares: [], grants: [] };   // 규칙상 앱에서 지울 수 없는 문서 (보고용)

// 1 비로그인
await expect('1a 비로그인 베타 읽기', true, () => getDocs(anon.col));
await expect('1b 비로그인 예약 생성', false, () => setDoc(doc(anon.col), { ...res('2030-01-01'), ownerUid: 'x', createdAt: 'x' }));
await expect('1c 비로그인 정식 읽기', true, () => getDocs(collection(anon.db, 'naite_reservations')));

// 2 A 생성
let s1, s2, plainId;
await expect('2a A: share+예약 한 배치 생성', true, async () => { s1 = await createWithShare(A, ['2030-01-07']); });
await expect('2b A: share 없이 생성(정식 방식)', true, async () => { plainId = await createPlain(A, '2030-01-08'); });
await expect('2c A: 다른 share 로 예약 생성', true, async () => { s2 = await createWithShare(A, ['2030-01-09']); });
await expect('2d A: 내 share 문서 읽기', true, () => getDoc(doc(A.db, 'naite_shares', s1.share.id)));
await expect('2e A: 내 share 목록 쿼리', true, () => getDocs(query(collection(A.db, 'naite_shares'), where('ownerUid', '==', A.uid))));
await expect('2f A: ownerUid 를 남으로 생성', false, () => setDoc(doc(A.col), { ...res('2030-01-10'), ownerUid: B.uid, createdAt: 'x' }));
// 정식 코드 호환: shareId 없는 예약을 작성자가 수정·삭제
await expect('2g A: 링크 없는 내 예약 수정(정식 방식)', true, () => updateDoc(doc(A.db, COL, plainId), { userName: '작성자수정' }));
await expect('2h A: 링크 없는 내 예약 삭제(정식 방식)', true, async () => {
    const id = await createPlain(A, '2030-01-15');
    await deleteDoc(doc(A.db, COL, id));
});
// 최대 60회 고정 예약 한 배치
await expect('2i A: 60회 고정 예약 한 배치', true, async () => {
    const dates = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2031, 0, 1 + i * 7)).toISOString().slice(0, 10));
    await createWithShare(A, dates, { seriesId: 's-60' });
});
// 원자성: 배치 중 하나가 규칙 위반이면 전부 취소
let atomicRef;
await expect('2j A: 한 건 위반 배치는 거부', false, async () => {
    const b = writeBatch(A.db);
    atomicRef = doc(A.col);
    b.set(atomicRef, { ...res('2030-02-01'), ownerUid: A.uid, createdAt: 'x' });
    b.set(doc(A.col), { ...res('2030-02-02'), peopleCount: 0, ownerUid: A.uid, createdAt: 'x' });
    await b.commit();
});
await expect('2k 거부된 배치의 정상 건도 저장 안 됨', true, async () => {
    if ((await getDoc(atomicRef)).exists()) throw new Error('일부만 저장됨');
});

// 3 B 권한 없음
const r1 = s1.ids[0];
await expect('3a B: A 예약 수정', false, () => updateDoc(doc(B.db, COL, r1), { userName: '해커' }));
await expect('3b B: A 예약 삭제', false, () => deleteDoc(doc(B.db, COL, r1)));
await expect('3c B: A share 문서 읽기', false, () => getDoc(doc(B.db, 'naite_shares', s1.share.id)));
await expect('3d B: share 전체 목록 쿼리', false, () => getDocs(collection(B.db, 'naite_shares')));
await expect('3e B: 새 예약 생성은 가능', true, async () => { await createPlain(B, '2030-01-11'); });

// 4 링크로 권한 받기
await expect('4a B: 틀린 key 로 grant', false, () => grant(B, s1.share.id, rid(32)));
await expect('4b B: 맞는 key 로 grant', true, async () => {
    await grant(B, s1.share.id, s1.share.key);
    leftover.grants.push(`${B.uid}/${s1.share.id}`);
});
await expect('4c B: 같은 링크 재등록(update)', true, () => grant(B, s1.share.id, s1.share.key));
await expect('4d B: 내 grant 목록 읽기', true, () => getDocs(collection(B.db, 'naite_access', B.uid, 'grants')));
await expect('4e B: 권한으로 A 예약 수정', true, () => updateDoc(doc(B.db, COL, r1), { userName: '팀원수정' }));
await expect('4f B: 없는 share 로 grant', false, () => grant(B, `sh_${rid(20)}`, rid(32)));

// 5 다른 share 에는 적용 안 됨
await expect('5a B: A 의 다른 share 예약 수정', false, () => updateDoc(doc(B.db, COL, s2.ids[0]), { userName: '해커' }));
await expect('5b B: A 의 share 없는 예약 수정', false, () => updateDoc(doc(B.db, COL, plainId), { userName: '해커' }));

// 6 C 공격
await expect('6a C: A shareId 붙여 새 예약 생성', false, () => setDoc(doc(C.col), { ...res('2030-01-12'), shareId: s1.share.id, ownerUid: C.uid, createdAt: 'x' }));
await expect('6b C: A share 문서 덮어쓰기', false, () => setDoc(doc(C.db, 'naite_shares', s1.share.id), { ownerUid: C.uid, key: rid(32), createdAt: 'x' }));
await expect('6c C: B uid 경로에 grant(맞는 key)', false, () => grant(C, s1.share.id, s1.share.key, B.uid));
await expect('6d C: B 의 grant 읽기', false, () => getDocs(collection(C.db, 'naite_access', B.uid, 'grants')));
await expect('6e C: 형식 틀린 shareId 로 share 생성', false, () => setDoc(doc(C.db, 'naite_shares', 'sh_short'), { ownerUid: C.uid, key: rid(32), createdAt: 'x' }));
await expect('6f C: share 에 추가 필드', false, () => setDoc(doc(C.db, 'naite_shares', `sh_${rid(20)}`), { ownerUid: C.uid, key: rid(32), createdAt: 'x', admin: true }));
await expect('6g C: 남의 uid 로 share 생성', false, () => setDoc(doc(C.db, 'naite_shares', `sh_${rid(20)}`), { ownerUid: A.uid, key: rid(32), createdAt: 'x' }));
// 링크 없던 A 의 기존 예약(plainId)에 C 가 자기 share 를 붙이려는 시도
await expect('6h C: A 기존 예약에 자기 share 붙이기', false, async () => {
    const sh = newShare();
    const b = writeBatch(C.db);
    b.set(doc(C.db, 'naite_shares', sh.id), { ownerUid: C.uid, key: sh.key, createdAt: 'x' });
    b.update(doc(C.db, COL, plainId), { shareId: sh.id });
    await b.commit();
});

// 7 권한자 B 의 제한
await expect('7a B: shareId 변경', false, () => updateDoc(doc(B.db, COL, r1), { shareId: s2.share.id }));
await expect('7b B: shareId 삭제', false, () => updateDoc(doc(B.db, COL, r1), { shareId: deleteField() }));
await expect('7c B: ownerUid 변경', false, () => updateDoc(doc(B.db, COL, r1), { ownerUid: B.uid }));
await expect('7d B: 인원 0명', false, () => updateDoc(doc(B.db, COL, r1), { peopleCount: 0 }));
await expect('7e B: 팀명 31자', false, () => updateDoc(doc(B.db, COL, r1), { teamName: 'x'.repeat(31) }));

// 8 기존 예약에 링크 붙이기
await expect('8a A: 기존 예약에 새 share 붙이기', true, async () => {
    const sh = newShare();
    const b = writeBatch(A.db);
    b.set(doc(A.db, 'naite_shares', sh.id), { ownerUid: A.uid, key: sh.key, createdAt: 'x' });
    b.update(doc(A.db, COL, plainId), { shareId: sh.id });
    await b.commit();
});
await expect('8b A: 이미 붙은 shareId 교체', false, async () => {
    const sh = newShare();
    const b = writeBatch(A.db);
    b.set(doc(A.db, 'naite_shares', sh.id), { ownerUid: A.uid, key: sh.key, createdAt: 'x' });
    b.update(doc(A.db, COL, plainId), { shareId: sh.id });
    await b.commit();
});
await expect('8c A: 남의(B) share 를 내 기존 예약에', false, async () => {
    const bs = await createWithShare(B, ['2030-01-13']);
    const aPlain = await createPlain(A, '2030-01-14');
    await updateDoc(doc(A.db, COL, aPlain), { shareId: bs.share.id });
});

// 9 권한자 B 의 한 번↔고정 전환
let bAdded = [];
await expect('9a B: 같은 shareId 로 회차 추가(한 번→고정)', true, async () => {
    const b = writeBatch(B.db);
    b.update(doc(B.db, COL, r1), { seriesId: 's-test', repeatUntil: '2030-01-21' });
    for (const date of ['2030-01-14', '2030-01-21']) {
        const ref = doc(B.col);
        b.set(ref, { ...res(date, { seriesId: 's-test', repeatUntil: '2030-01-21' }), shareId: s1.share.id, ownerUid: B.uid, createdAt: 'x' });
        bAdded.push(ref.id);
    }
    await b.commit();
    bAdded.forEach(id => created.push([B, id]));
});
await expect('9b C: 권한 없이 A shareId 로 회차 추가', false, () => setDoc(doc(C.col), { ...res('2030-01-28'), shareId: s1.share.id, ownerUid: C.uid, createdAt: 'x' }));

// 10 share 소유자 A 는 B 가 만든 회차도 수정 가능
await expect('10a A: B 가 만든 회차 수정', true, () => updateDoc(doc(A.db, COL, bAdded[0]), { userName: '주인수정' }));

// 9c 고정→한 번: 필드 삭제 + 나머지 회차 삭제를 한 배치로 (B)
await expect('9c B: 고정→한 번 배치', true, async () => {
    const b = writeBatch(B.db);
    b.update(doc(B.db, COL, r1), { seriesId: deleteField(), repeatUntil: deleteField() });
    bAdded.forEach(id => b.delete(doc(B.db, COL, id)));
    await b.commit();
});
await expect('4g B: 권한으로 A 예약 삭제', true, () => deleteDoc(doc(B.db, COL, r1)));

// 11 고정 예약은 링크 하나로 전 회차 권한
let ser;
await expect('11a A: 3회 고정 예약 + 링크', true, async () => {
    ser = await createWithShare(A, ['2030-03-04', '2030-03-11', '2030-03-18'], { seriesId: 's-ser' });
});
await expect('11b C: 링크 없이 회차 수정', false, () => updateDoc(doc(C.db, COL, ser.ids[2]), { userName: '해커' }));
await expect('11c B: 다른 예약 링크만 가진 기기가 수정', false, () => updateDoc(doc(B.db, COL, ser.ids[0]), { userName: '해커' }));
await expect('11d C: 링크 받기', true, async () => {
    await grant(C, ser.share.id, ser.share.key);
    leftover.grants.push(`${C.uid}/${ser.share.id}`);
});
await expect('11e C: 3번째 회차 수정', true, () => updateDoc(doc(C.db, COL, ser.ids[2]), { userName: '팀원' }));
await expect('11f C: 전 회차 일괄 삭제', true, async () => {
    const b = writeBatch(C.db);
    ser.ids.forEach(id => b.delete(doc(C.db, COL, id)));
    await b.commit();
});

// 정리: 남은 테스트 문서 삭제 (작성자 기기로)
let cleaned = 0;
for (const d of [A, B, C]) {
    const snap = await getDocs(query(d.col, where('ownerUid', '==', d.uid)));
    for (const s of snap.docs) {
        if (String(s.data().teamName).startsWith(TAG)) { await deleteDoc(s.ref); cleaned++; }
    }
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}  (기대 ${r.expected} / 실제 ${r.got})`);
const fail = results.filter(r => !r.ok).length;
console.log(`\n총 ${results.length}건, 실패 ${fail}건, 정리한 테스트 예약 ${cleaned}건`);
console.log(`남은 공유 문서 ${leftover.shares.length}건(naite_shares), 권한 문서 ${leftover.grants.length}건(naite_access) — 규칙상 앱에서 삭제 불가`);
process.exit(fail ? 1 : 0);
