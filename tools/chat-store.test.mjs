// 실제 store 모듈을 가짜 Firebase에 연결해 쓰기·재시도·삭제 전 검증을 확인합니다.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { readChat, koreanDate } from '../beta/chat-parser.js';

async function setup(collectionName = 'naite_reservations_beta') {
    const rows = new Map();
    const context = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, crypto });
    const col = (db, path) => ({ path });
    const doc = (parent, ...parts) => {
        const path = [parent.path, ...parts].filter(Boolean).join('/');
        return { path, id: path.split('/').at(-1) };
    };
    const snap = ref => ({ id: ref.id, exists: () => rows.has(ref.path), data: () => rows.get(ref.path) });
    const docs = () => [...rows.keys()].filter(p => p.startsWith(collectionName + '/')).map(path => snap(doc({}, path)));
    const fs = { getFirestore: () => ({}), collection: col, doc, query: x => x,
        onSnapshot: (ref, callback) => { callback(ref.path.startsWith('naite_users/') ? { data: () => null } : { forEach: fn => docs().forEach(fn) }); return () => {}; },
        getDocsFromServer: async () => ({ docs: docs() }), serverTimestamp: () => 'server-time',
        runTransaction: async (db, run) => {
            const writes = [];
            const value = await run({ get: async ref => snap(ref), set: (ref, data) => writes.push(['set', ref, data]), delete: ref => writes.push(['delete', ref]) });
            for (const [kind, ref, data] of writes) {
                // 기존 Firestore 규칙의 로그 batch 길이 한도를 검증합니다.
                if (kind === 'set' && ref.path.startsWith('naite_logs/')) assert.ok(data.batch.length <= 40);
            }
            for (const [kind, ref, data] of writes) kind === 'set' ? rows.set(ref.path, data) : rows.delete(ref.path);
            return value;
        }
    };
    const auth = { currentUser: { uid: 'operator' } };
    const au = { getAuth: () => auth, onAuthStateChanged: (auth, fn) => fn(auth.currentUser) };
    const synthetic = value => new vm.SyntheticModule(Object.keys(value), function () { for (const [k, v] of Object.entries(value)) this.setExport(k, v); }, { context });
    const config = synthetic({ FIREBASE_CONFIG: { apiKey: 'configured', authDomain: 'configured', projectId: 'configured', appId: 'configured' }, COLLECTION_NAME: collectionName });
    const modules = new Map();
    async function load(path) {
        if (modules.has(path)) return modules.get(path);
        const module = new vm.SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path,
            importModuleDynamically: async specifier => {
                const value = synthetic(specifier.includes('firestore') ? fs : specifier.includes('firebase-auth') ? au : { initializeApp: () => ({}) });
                await value.link(() => {}); await value.evaluate(); return value;
            }
        });
        modules.set(path, module);
        await module.link((specifier, parent) => specifier === './config.js' ? config : load(resolve(dirname(parent.identifier), specifier.split('?')[0])));
        return module;
    }
    const module = await load(resolve('beta/store.js'));
    await module.evaluate();
    const store = await module.namespace.createStore(() => {});
    assert.equal(store.mode, 'cloud');
    return { store, rows };
}

const { store, rows } = await setup();
const id = 'a'.repeat(64);
const plan = { action: 'create', data: { date: koreanDate(Date.now() + 86_400_000), startTime: '16:00', endTime: '17:00', isNextDay: false, teamName: '하이라이트', userName: '김동하', purpose: '합주', ownerUid: 'injected', seriesId: 'injected' } };
assert.equal(await store.applyChat(id, plan), '예약 추가');
const path = `naite_reservations_beta/kakao_${id}`;
const created = rows.get(path);
assert.equal(created.ownerUid, 'operator');
assert.equal(created.userName, '김동하');
assert.equal(created.seriesId, undefined);
assert.equal(await store.applyChat(id, plan), '이미 예약됨');
assert.equal(rows.size, 1);
await assert.rejects(store.applyChat('b'.repeat(64), plan), /겹칩니다/);
const target = { id: `kakao_${id}`, ...created };
rows.set(path, { ...created, teamName: '수정된팀' });
await assert.rejects(store.applyChat('c'.repeat(64), { action: 'cancel', target }), /수정되었습니다/);
assert.equal(rows.has(path), true);
rows.set(path, created);
assert.equal(await store.applyChat('c'.repeat(64), { action: 'cancel', target }), '예약 취소');
assert.equal(rows.has(path), false);
const log = rows.get(`naite_logs/kakao_${'c'.repeat(64)}`);
assert.equal(log.res.userName, '김동하');
assert.equal(log.batch.length, 32);
assert.equal(await store.applyChat('c'.repeat(64), { action: 'cancel', target }), '이미 취소됨');
assert.equal(rows.size, 1);
await assert.rejects(store.applyChat('../bad', plan), /식별자/);
const englishResult = readChat({ text: '10/11 11~12 far away from the home 합주', sender: '김동하', sentDate: '2026-10-09', complete: true }, Date.parse('2026-10-09T12:00:00+09:00'));
const englishId = 'd'.repeat(64);
const englishPlan = await store.planChat(englishResult);
assert.equal(await store.applyChat(englishId, englishPlan), '예약 추가');
assert.equal(rows.get(`naite_reservations_beta/kakao_${englishId}`).teamName, 'far away from the home');
const englishCancel = readChat({ text: '10/11 FAR_AWAY-from.the(home) 합주 취소', complete: true }, Date.parse('2026-10-09T12:00:00+09:00'));
const englishCancelPlan = await store.planChat(englishCancel);
assert.equal(englishCancelPlan.target.id, `kakao_${englishId}`);
assert.equal(await store.applyChat('e'.repeat(64), englishCancelPlan), '예약 취소');
assert.equal(rows.has(`naite_reservations_beta/kakao_${englishId}`), false);
const future = koreanDate(Date.now() + 86_400_000);
const parse = text => readChat({ text, sender: '김동하', complete: true });
const otherPlan = await store.planChat(parse(`${future} 7 8`));
assert.equal(otherPlan.data.startTime, '07:00');
assert.equal(otherPlan.data.purpose, '기타');
const otherId = 'f'.repeat(64);
assert.equal(await store.applyChat(otherId, otherPlan), '예약 추가');
assert.equal(rows.get(`naite_reservations_beta/kakao_${otherId}`).purpose, '기타');
assert.equal(rows.get(`naite_reservations_beta/kakao_${otherId}`).seriesId, undefined);
assert.match((await store.planChat(parse(`${future} 7~8 다른 팀 합주`))).reason, /겹칩니다/);
assert.match((await store.planChat(parse(`${future} 6:30~7:30`))).reason, /겹칩니다/);
await assert.rejects(store.applyChat('1'.repeat(64), { action: 'create', data: { ...otherPlan.data, startTime: '07:30', endTime: '08:30' } }), /겹칩니다/);
const halfPlan = await store.planChat(parse(`${future} 19시반20시반 far away 합주`));
assert.equal(halfPlan.data.endTime, '20:30');
assert.equal(await store.applyChat('2'.repeat(64), halfPlan), '예약 추가');
const typoCancel = await store.planChat(parse(`${future} 19시반20시반 faw away 합주 취소`));
assert.equal(typoCancel.target.id, `kakao_${'2'.repeat(64)}`);
assert.equal(await store.applyChat('3'.repeat(64), typoCancel), '예약 취소');
assert.equal(rows.has(`naite_reservations_beta/kakao_${'2'.repeat(64)}`), false);
assert.equal(rows.has(`naite_reservations_beta/kakao_${otherId}`), true);
const titlePath = `naite_reservations_beta/kakao_${'4'.repeat(64)}`;
await store.applyChat('4'.repeat(64), { action: 'create', data: { ...plan.data, teamName: '멸-종_추 가' } });
const titleCancel = await store.planChat(parse(`${future} 멸종 합주 취소`));
assert.equal(titleCancel.target.teamName, '멸-종_추 가');
const originalTitle = rows.get(titlePath);
rows.set(titlePath, { ...originalTitle, teamName: '멸종추가' });
await assert.rejects(store.applyChat('5'.repeat(64), titleCancel), /수정되었습니다/);
rows.set(titlePath, originalTitle);
assert.equal(await store.applyChat('5'.repeat(64), titleCancel), '예약 취소');
assert.equal(rows.has(titlePath), false);
assert.equal(rows.has(`naite_reservations_beta/kakao_${otherId}`), true);
const main = await setup('naite_reservations');
await assert.rejects(main.store.applyChat(id, plan), /베타/);
console.log('실제 store의 추가·중복·충돌·취소 재시도·정식 쓰기 차단 검증 통과');
