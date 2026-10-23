// 실행: NAITE_BETA_ADMIN_PASSWORD 환경변수를 설정한 뒤 node tools/rules-test/beta-admin.mjs
// 실제 베타·규칙 테스트 컬렉션에 만든 [TEST] 문서만 지웁니다. 정식 예약은 읽거나 쓰지 않습니다.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, doc, collection, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_CONFIG, BETA_ADMIN_EMAIL, BETA_ADMIN_UID, COLLECTION_NAME } from '../../beta/config.js';

const password = process.env.NAITE_BETA_ADMIN_PASSWORD;
assert.ok(password, 'NAITE_BETA_ADMIN_PASSWORD 환경변수가 필요합니다.');
const apps = ['beta-admin-test', 'beta-member-test'].map(name => initializeApp(FIREBASE_CONFIG, name));
const [adminAuth, memberAuth] = apps.map(app => initializeAuth(app, { persistence: inMemoryPersistence }));
const [adminDb, memberDb] = apps.map(app => getFirestore(app));
const id = `beta_auth_${crypto.randomUUID()}`;
const testCol = 'naite_reservations_test';
const denied = fn => assert.rejects(fn, { code: 'permission-denied' });
let member;
try {
    const admin = (await signInWithEmailAndPassword(adminAuth, BETA_ADMIN_EMAIL, password)).user;
    assert.equal(admin.uid, BETA_ADMIN_UID);
    member = (await signInAnonymously(memberAuth)).user;
    const data = { date: '2036-01-01', startTime: '00:00', endTime: '01:00', teamName: '[TEST] 비밀번호 권한', userName: '테스터', peopleCount: 2, purpose: '레슨', ownerUid: member.uid };
    await denied(() => setDoc(doc(memberDb, COLLECTION_NAME, id), data));
    await setDoc(doc(memberDb, 'naite_users', member.uid), { kakaoNick: '[TEST] 권한 검사' });
    await setDoc(doc(memberDb, COLLECTION_NAME, id), data);
    await setDoc(doc(memberDb, testCol, id), data);
    await updateDoc(doc(adminDb, COLLECTION_NAME, id), { teamName: '[TEST] 관리자 수정', editedBy: admin.uid });
    assert.equal((await getDoc(doc(memberDb, COLLECTION_NAME, id))).data().editedBy, admin.uid);
    await denied(() => updateDoc(doc(adminDb, testCol, id), { teamName: '[TEST] 거부되어야 함' }));
    await denied(() => deleteDoc(doc(adminDb, testCol, id)));
    await setDoc(doc(adminDb, COLLECTION_NAME, `${id}_own`), { ...data, ownerUid: admin.uid });
    const log = { action: 'delete', uid: member.uid, col: COLLECTION_NAME, batch: id.slice(0, 40), at: serverTimestamp(), res: { date: data.date, startTime: data.startTime, endTime: data.endTime, teamName: data.teamName, userName: data.userName } };
    await setDoc(doc(memberDb, 'naite_logs', id), log);
    assert.equal((await getDoc(doc(adminDb, 'naite_logs', id))).data().uid, member.uid);
    await getDocs(query(collection(adminDb, 'naite_logs'), where('col', '==', COLLECTION_NAME)));
    await getDocs(collection(adminDb, 'naite_users'));
    await denied(() => getDocs(query(collection(adminDb, 'naite_logs'), where('col', '==', 'naite_reservations'))));
    await denied(() => getDoc(doc(memberDb, 'naite_logs', id)));
    await deleteDoc(doc(adminDb, COLLECTION_NAME, id));
    await deleteDoc(doc(adminDb, 'naite_logs', id));
    console.log('통과: 비밀번호 인증, 베타 추가·타인 예약 수정/삭제, 카톡 연동 권한, 베타 로그 조회/삭제, 정식과 같은 권한의 타인 예약 수정/삭제 차단, 정식 로그 조회 차단');
} finally {
    // 실패한 시험도 자신이 만든 예약만 정리합니다.
    const cleanup = await Promise.allSettled([
        deleteDoc(doc(adminDb, COLLECTION_NAME, id)),
        deleteDoc(doc(adminDb, COLLECTION_NAME, `${id}_own`)),
        deleteDoc(doc(adminDb, 'naite_logs', id)),
        ...(member ? [deleteDoc(doc(memberDb, testCol, id)), setDoc(doc(memberDb, 'naite_users', member.uid), { kakaoNick: '', name: '' })] : [])
    ]);
    // 이미 삭제한 로그는 resource가 없어 다시 삭제할 때 거절될 수 있습니다.
    for (const [index, result] of cleanup.entries()) {
        if (result.status === 'rejected' && index !== 2) console.error('테스트 문서 정리 확인 필요:', index, result.reason.code);
    }
    if (member) await deleteUser(member);
    await Promise.all(apps.map(deleteApp));
}
