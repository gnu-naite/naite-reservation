// 실제 정식 store를 가짜 Firebase에 연결해 기존 데이터 보존·로그·저장 위치를 검사합니다.
// node --experimental-vm-modules tools/production-store.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as config from '../config.js';

const col = config.COLLECTION_NAME;
assert.equal(col, 'naite_reservations');
const original = { date: '2026-11-06', startTime: '14:00', endTime: '15:00', teamName: '기존팀', userName: '기존 예약자', peopleCount: 6, purpose: '합주', ownerUid: 'old-device', seriesId: 'original-series', repeatUntil: '2026-11-20', createdAt: 'original-date', shareId: 'old-share' };
const rows = new Map([[`${col}/existing`, original]]);
const listeners = [];
let seq = 0;
const ref = (parent, ...parts) => ({ path: [parent.path, ...parts].filter(Boolean).join('/') });
const doc = (parent, ...parts) => {
    const d = ref(parent, ...(parts.length ? parts : [`generated-${++seq}`]));
    return { ...d, id: d.path.split('/').at(-1) };
};
const snapshot = target => {
    const docs = [...rows].filter(([path]) => path.startsWith(target.path + '/') && !path.slice(target.path.length + 1).includes('/'))
        .filter(([, data]) => !target.filter || data[target.filter.field] === target.filter.value)
        .map(([path, data]) => ({ id: path.split('/').at(-1), data: () => data }));
    return { docs, forEach: fn => docs.forEach(fn), data: () => rows.get(target.path) };
};
const notify = () => listeners.forEach(([target, callback]) => callback(snapshot(target)));
const deleted = Symbol('delete');
const fs = {
    getFirestore: () => ({}), collection: ref, doc, deleteField: () => deleted,
    serverTimestamp: () => 'server-time', where: (field, op, value) => ({ field, value }),
    query: (target, filter) => ({ ...target, filter }),
    onSnapshot: (target, callback) => { const item = [target, callback]; listeners.push(item); callback(snapshot(target)); return () => listeners.splice(listeners.indexOf(item), 1); },
    setDoc: async (target, data) => { rows.set(target.path, { ...rows.get(target.path), ...data }); notify(); },
    writeBatch: () => {
        const ops = [];
        return { set: (target, data) => ops.push(['set', target, data]), update: (target, data) => ops.push(['update', target, data]), delete: target => ops.push(['delete', target]),
            commit: async () => {
                for (const [kind, target, data] of ops) {
                    if (kind === 'delete') rows.delete(target.path);
                    else {
                        const next = kind === 'update' ? { ...rows.get(target.path), ...data } : data;
                        rows.set(target.path, Object.fromEntries(Object.entries(next).filter(([, v]) => v !== deleted)));
                    }
                }
                notify();
            }
        };
    }
};
const auth = { currentUser: { uid: 'current-device', isAnonymous: true } };
let authChanged;
const au = {
    getAuth: () => auth,
    onAuthStateChanged: (_, callback) => { authChanged = callback; callback(auth.currentUser); },
    signInWithEmailAndPassword: async (_, email, password) => {
        assert.equal(email, config.PASSWORD_ADMIN_EMAIL);
        if (password !== 'test-correct') throw Object.assign(new Error('incorrect'), { code: 'auth/invalid-credential' });
        auth.currentUser = { uid: config.PASSWORD_ADMIN_UID, isAnonymous: false };
        authChanged(auth.currentUser);
        return { user: auth.currentUser };
    }
};
const context = vm.createContext({ console, crypto, setTimeout, clearTimeout });
const synthetic = values => new vm.SyntheticModule(Object.keys(values), function () { Object.entries(values).forEach(([k, v]) => this.setExport(k, v)); }, { context });
const source = await readFile(new URL('../store.js', import.meta.url), 'utf8');
const module = new vm.SourceTextModule(source, { context, importModuleDynamically: async specifier => {
    const values = specifier.includes('firestore') ? fs : specifier.includes('firebase-auth') ? au : {
        initializeApp: (cfg, name) => { assert.equal(name, undefined, '기존 정식 기기 UID를 유지해야 함'); return {}; }
    };
    const linked = synthetic(values); await linked.link(() => {}); await linked.evaluate(); return linked;
} });
await module.link(specifier => { assert.equal(specifier, './config.js?v=3'); return synthetic(config); });
await module.evaluate();
const store = await module.namespace.createStore(() => {});
assert.equal(store.mode, 'cloud');
let current;
store.onUser(user => current = user);
assert.equal(current.uid, 'current-device');
await store.write({ update: [['existing', { startTime: '15:00', endTime: '16:00' }]] });
const edited = rows.get(`${col}/existing`);
for (const key of ['ownerUid', 'createdAt', 'seriesId', 'repeatUntil', 'userName', 'peopleCount', 'shareId']) assert.equal(edited[key], original[key]);
assert.equal(edited.editedBy, 'current-device');
const logs = () => [...rows].filter(([path]) => path.startsWith('naite_logs/')).map(([, data]) => data);
assert.equal(logs()[0].action, 'update');
assert.equal(logs()[0].uid, 'current-device');
assert.equal(logs()[0].res.userName, original.userName);
assert.equal(logs()[0].col, col);
await store.write({ remove: ['existing'] });
assert.equal(rows.has(`${col}/existing`), false);
assert.equal(logs()[1].action, 'delete');
assert.equal(logs()[1].res.startTime, '15:00');
await assert.rejects(store.signInWithPassword('incorrect'), { code: 'auth/invalid-credential' });
await store.signInWithPassword('test-correct');
assert.equal(current.uid, config.PASSWORD_ADMIN_UID);
await store.write({ add: [{ date: '2026-11-07', startTime: '15:00', endTime: '16:00', teamName: '새팀', purpose: '합주', userName: '관리자' }] });
const added = [...rows].find(([path]) => path.startsWith(col + '/'))[1];
assert.equal(added.ownerUid, config.PASSWORD_ADMIN_UID);
assert.equal(added.peopleCount, undefined);
assert.ok([...rows.keys()].every(path => !path.startsWith('naite_reservations_beta/')));
assert.equal(store.applyChat, undefined, '정식에 OCR 처리기를 연결하지 않음');
console.log('통과: 정식 컬렉션·기기 UID 유지, 기존 예약자/인원/반복/소유자 보존, 수정/취소 로그, 비밀번호 인증, 베타 쓰기 없음');
