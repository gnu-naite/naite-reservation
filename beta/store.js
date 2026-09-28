/* ============================================================
   데이터 저장소 계층
   ------------------------------------------------------------
   - config.js 에 Firebase 설정이 채워져 있으면 Firestore(실시간 공유) 사용
   - 아직 설정 전이라면 localStorage 임시 모드로 동작 (배너 노출)
   두 경우 모두 동일한 인터페이스를 제공합니다.
     store.mode           'cloud' | 'local'
     store.write(ops)     추가·수정·삭제를 한 번에 (원자적으로) 저장
   ============================================================ */

import { FIREBASE_CONFIG, COLLECTION_NAME } from './config.js';

const FIREBASE_VERSION = '12.19.0';
// 컬렉션별로 따로 저장 (정식: naite_reservations_local 그대로, 베타는 분리)
const LOCAL_KEY = `${COLLECTION_NAME}_local`;

/* 공유 링크 — 정식/베타가 같은 컬렉션을 씁니다 (id 가 무작위라 섞이지 않음)
   naite_shares/{shareId}              { ownerUid, key }  만든 사람만 읽기 가능
   naite_access/{uid}/grants/{shareId} { key }            링크를 연 기기의 수정 권한 */
const SHARES = 'naite_shares';
const ACCESS = 'naite_access';
// 기기(uid)별 표시 이름 { kakaoNick, name } — 관리자만 전체를 봅니다.
const USERS = 'naite_users';
// 예약 수정·취소 기록 { action, uid, col, batch, at, res } — 관리자만 읽습니다.
const LOGS = 'naite_logs';
const LOG_FIELDS = ['date', 'startTime', 'endTime', 'teamName', 'userName'];

const emptyAccess = () => ({ shares: new Map(), grants: new Map(), teams: new Map() });

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
// ponytail: b % 62 는 약간 치우치지만 32자리 키의 추측 불가능성엔 영향 없음
const randomId = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALNUM[b % ALNUM.length]).join('');

/** 새 공유 링크 한 벌 (id 는 예약 문서에 공개, key 는 링크에만 담기는 비밀값) */
export function newShare() {
    return { id: `sh_${randomId(20)}`, key: randomId(32) };
}

/** 값이 undefined 인 필드를 뺍니다. */
const withoutUndefined = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** 설정 파일이 실제 값으로 채워졌는지 검사 */
function isConfigured(cfg) {
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    return required.every(k => {
        const v = cfg?.[k];
        return typeof v === 'string' && v.length > 0 && !v.includes('여기에') && !v.includes('YOUR_');
    });
}

/** Firestore 기반 실시간 저장소 */
async function createCloudStore(onChange) {
    const [{ initializeApp }, fs, au] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
    ]);

    const app = initializeApp(FIREBASE_CONFIG);
    const db = fs.getFirestore(app);
    const col = fs.collection(db, COLLECTION_NAME);

    /* ----- 이 기기의 공유 권한 -----
       shares: 내가 만든 공유 링크 (shareId → key)
       grants: 링크를 열어 받은 수정 권한 (shareId → key, 팀 링크를 다시 공유할 때 씀)
       teams:  그중 팀 링크 (shareId → { name, since }) — 예약 창의 '내 팀' 목록 */
    const accessListeners = new Set();
    let access = emptyAccess();
    let accessUid = null;
    let unsubAccess = [];
    let ownTeams = new Map();
    let grantTeams = new Map();
    const teamCache = new Map();   // shareId → { name } | null — 팀 이름은 바뀌지 않아 한 번만 읽습니다
    const emitAccess = () => {
        access = { ...access, teams: new Map([...grantTeams, ...ownTeams]) };
        accessListeners.forEach(fn => fn(access));
    };

    const watchAccess = uid => {
        if (uid === accessUid) return;
        accessUid = uid;
        unsubAccess.forEach(u => u());
        unsubAccess = [];
        access = emptyAccess();
        ownTeams = new Map();
        grantTeams = new Map();
        emitAccess();
        if (!uid) return;

        const onErr = err => console.error('[store] 공유 권한 구독 실패:', err);
        unsubAccess.push(fs.onSnapshot(
            fs.query(fs.collection(db, SHARES), fs.where('ownerUid', '==', uid)),
            snap => {
                access = { ...access, shares: new Map(snap.docs.map(d => [d.id, d.data().key])) };
                ownTeams = new Map(snap.docs.filter(d => d.data().teamName)
                    .map(d => [d.id, { name: d.data().teamName, since: d.data().createdAt }]));
                emitAccess();
            },
            onErr
        ));
        unsubAccess.push(fs.onSnapshot(
            fs.collection(db, ACCESS, uid, 'grants'),
            async snap => {
                access = { ...access, grants: new Map(snap.docs.map(d => [d.id, d.data().key])) };
                emitAccess();
                // 받은 링크가 팀 링크인지(팀 이름이 있는지) 공유 문서에서 읽어옵니다.
                await Promise.all(snap.docs.filter(d => !teamCache.has(d.id)).map(async d => {
                    try {
                        const s = await fs.getDoc(fs.doc(db, SHARES, d.id));
                        const name = s.data()?.teamName;
                        teamCache.set(d.id, name ? { name } : null);
                    } catch (err) {
                        console.error('[store] 팀 정보 읽기 실패:', err);   // 다음 변경 때 다시 시도
                    }
                }));
                if (uid !== accessUid) return;
                grantTeams = new Map(snap.docs
                    .filter(d => teamCache.get(d.id))
                    .map(d => [d.id, { ...teamCache.get(d.id), since: d.data().createdAt }]));
                emitAccess();
            },
            onErr
        ));
    };

    /* ----- 인증 -----
       부원: 첫 접속 시 익명 계정을 자동 발급 (브라우저에 유지됨)
       관리자: 구글 로그인. 익명 계정에 구글을 "연결"해서 기존 예약 소유권을 유지합니다. */
    const auth = au.getAuth(app);
    const userListeners = new Set();
    let currentUser = null;
    let authError = null;
    let resolveFirstUser;
    const firstUser = new Promise(r => (resolveFirstUser = r));

    au.onAuthStateChanged(auth, user => {
        currentUser = user;
        watchAccess(user?.uid ?? null);
        if (user) {
            resolveFirstUser(user);
        } else {
            // 로그인 정보가 없으면 익명으로 자동 로그인
            au.signInAnonymously(auth).catch(err => {
                console.error('[store] 익명 로그인 실패 (Firebase 콘솔에서 익명 로그인을 켜야 합니다):', err);
                authError = err;
                resolveFirstUser(null);
                userListeners.forEach(fn => fn(null, err));
            });
        }
        userListeners.forEach(fn => fn(user, null));
    });

    /** 쓰기 직전 현재 사용자 uid (최대 8초 대기, 실패 시 null) */
    const getUid = async () => {
        if (currentUser) return currentUser.uid;
        const user = await Promise.race([firstUser, new Promise(r => setTimeout(() => r(null), 8000))]);
        return user?.uid ?? null;
    };

    // 실시간 구독: 다른 사람이 예약을 바꾸면 즉시 반영됩니다.
    let current = new Map();   // id → 예약 (변경 기록에 취소·수정 전 내용을 남길 때 씀)
    fs.onSnapshot(
        fs.query(col),
        snapshot => {
            const list = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
            current = new Map(list.map(r => [r.id, r]));
            onChange(list);
        },
        err => {
            console.error('[store] 실시간 구독 실패:', err);
            onChange([], err);
        }
    );

    return {
        mode: 'cloud',

        /** 로그인 상태가 바뀔 때마다 cb(user, error) 호출 */
        onUser(cb) {
            userListeners.add(cb);
            cb(currentUser, authError);
        },

        /** 공유 권한이 바뀔 때마다 cb({ shares, grants }) 호출 */
        onAccess(cb) {
            accessListeners.add(cb);
            cb(access);
        },

        /**
         * 관리자 구글 로그인.
         * 익명 계정에 구글을 연결해 uid 를 유지하고,
         * 이미 다른 기기에서 연결된 구글 계정이면 그 계정으로 로그인합니다.
         */
        async signInWithGoogle() {
            const provider = new au.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            if (auth.currentUser?.isAnonymous) {
                try {
                    await au.linkWithPopup(auth.currentUser, provider);
                    await auth.currentUser.reload();
                    userListeners.forEach(fn => fn(auth.currentUser, null));
                    return auth.currentUser;
                } catch (err) {
                    if (err.code !== 'auth/credential-already-in-use') throw err;
                    const cred = au.GoogleAuthProvider.credentialFromError(err);
                    const res = await au.signInWithCredential(auth, cred);
                    return res.user;
                }
            }
            const res = await au.signInWithPopup(auth, provider);
            return res.user;
        },

        /** 로그아웃 → 자동으로 새 익명 계정으로 돌아갑니다. */
        async signOut() {
            await au.signOut(auth);
        },

        /**
         * 추가·수정·삭제를 한 배치로 저장합니다. 중간에 실패해도 반쯤 저장되는 일이 없습니다.
         * (고정 예약은 최대 60회라 배치 한도 500건 안에 들어갑니다)
         *   share   새 공유 링크 { id, key, teamName? } — 예약과 같은 배치에서 만들어야 보안 규칙을 통과합니다
         *           teamName 이 있으면 팀 링크 (그 팀의 모든 예약에 쓰임)
         *   add     [data]         새 예약 (작성자 uid 자동 기록)
         *   update  [[id, data]]   값이 undefined 인 필드는 삭제
         *   remove  [id]
         * 추가·수정한 예약에는 마지막으로 손댄 기기(editedBy)를 남기고,
         * 수정·취소는 같은 배치로 변경 기록(naite_logs)에 남깁니다. (관리자 [로그 보기])
         */
        async write({ share, add = [], update = [], remove = [] }) {
            const uid = await getUid();
            const createdAt = new Date().toISOString();
            const batch = fs.writeBatch(db);
            const by = uid ? { editedBy: uid } : {};

            // ponytail: 기록은 앱이 남기는 것이라 규칙으로 강제하진 않음 (개발자 도구로 우회 가능).
            // 삭제 규칙에서 기록을 확인하면 배치당 문서 조회 한도(20회)에 걸려 60회 고정 예약 일괄 취소가 막힘 — 강제하려면 서버(Cloud Functions) 필요
            const batchId = fs.doc(fs.collection(db, LOGS)).id;
            const log = (action, r) => r && uid && batch.set(fs.doc(fs.collection(db, LOGS)), {
                action, uid, col: COLLECTION_NAME, batch: batchId, at: fs.serverTimestamp(),
                res: Object.fromEntries(LOG_FIELDS.map(k => [k, r[k] ?? ''])),
            });
            update.forEach(([id, data]) => log('update', current.get(id) && { ...current.get(id), ...data }));
            remove.forEach(id => log('delete', current.get(id)));

            if (share) {
                batch.set(fs.doc(db, SHARES, share.id), withoutUndefined({ ownerUid: uid, key: share.key, teamName: share.teamName, createdAt }));
            }
            add.forEach(data => {
                batch.set(fs.doc(col), { ...withoutUndefined(data), ...(uid ? { ownerUid: uid } : {}), ...by, createdAt });
            });
            update.forEach(([id, data]) => {
                const fields = Object.fromEntries(
                    Object.entries({ ...data, ...by }).map(([k, v]) => [k, v === undefined ? fs.deleteField() : v])
                );
                batch.update(fs.doc(db, COLLECTION_NAME, id), fields);
            });
            remove.forEach(id => batch.delete(fs.doc(db, COLLECTION_NAME, id)));

            await batch.commit();
        },

        /** 공유 링크의 key 를 이 기기의 수정 권한으로 등록 (같은 링크를 다시 열어도 안전) */
        async claimShare(shareId, key) {
            const uid = await getUid();
            if (!uid) throw new Error('no-auth');
            await fs.setDoc(fs.doc(db, ACCESS, uid, 'grants', shareId), { key, createdAt: new Date().toISOString() });
        },

        /** 이 기기의 표시 이름 저장 ({ kakaoNick } 또는 { name }, 나머지 필드는 유지) */
        async saveProfile(fields) {
            const uid = await getUid();
            if (!uid) return;
            await fs.setDoc(fs.doc(db, USERS, uid), { ...fields, updatedAt: new Date().toISOString() }, { merge: true });
        },

        /** 관리자용: 이 예약표의 최근 수정·취소 기록 (최신순) */
        async readLogs(max = 300) {
            // 이 예약표 것만 받아 정렬 (col + at 정렬을 함께 쓰면 복합 색인이 필요해서 정렬은 여기서)
            const snap = await fs.getDocs(fs.query(fs.collection(db, LOGS), fs.where('col', '==', COLLECTION_NAME)));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0))
                .slice(0, max);
        },

        /** 관리자용: 기기별 표시 이름 목록 구독. cb(Map uid → { kakaoNick, name }), 해제 함수 반환 */
        watchUsers(cb) {
            return fs.onSnapshot(
                fs.collection(db, USERS),
                snap => cb(new Map(snap.docs.map(d => [d.id, d.data()]))),
                err => console.error('[store] 사용자 목록 구독 실패:', err)
            );
        }
    };
}

/** localStorage 기반 임시 저장소 (Firebase 설정 전 / 연결 실패 시) */
function createLocalStore(onChange) {
    const read = () => {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        } catch {
            return [];
        }
    };
    const save = list => {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        onChange(list);
    };

    // 같은 브라우저의 다른 탭과는 동기화
    window.addEventListener('storage', e => {
        if (e.key === LOCAL_KEY) onChange(read());
    });

    queueMicrotask(() => onChange(read()));

    const newId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return {
        mode: 'local',
        // 로컬 모드는 이 기기 전용이라 권한 구분·공유가 없습니다.
        onUser(cb) {
            cb(null, null);
        },
        onAccess(cb) {
            cb(emptyAccess());
        },
        async signInWithGoogle() {
            throw new Error('local-mode');
        },
        async signOut() {},
        async write({ add = [], update = [], remove = [] }) {
            const createdAt = new Date().toISOString();
            const changes = new Map(update);
            const removed = new Set(remove);
            const list = read()
                .filter(r => !removed.has(r.id))
                .map(r => (changes.has(r.id) ? withoutUndefined({ ...r, ...changes.get(r.id) }) : r));
            add.forEach(data => list.push({ ...withoutUndefined(data), id: newId(), createdAt }));
            save(list);
        },
        async claimShare() {
            throw new Error('local-mode');
        },
        async saveProfile() {},
        async readLogs() {
            return [];
        },
        watchUsers() {
            return () => {};
        }
    };
}

/** 환경에 맞는 저장소를 생성합니다. */
export async function createStore(onChange) {
    if (!isConfigured(FIREBASE_CONFIG)) {
        console.warn('[store] Firebase 설정이 비어 있어 임시(로컬) 모드로 실행합니다. config.js 를 확인하세요.');
        return createLocalStore(onChange);
    }
    try {
        return await createCloudStore(onChange);
    } catch (err) {
        console.error('[store] Firebase 초기화 실패 — 임시(로컬) 모드로 전환합니다.', err);
        return createLocalStore(onChange);
    }
}
