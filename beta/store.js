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

// 기기(uid)별 표시 이름 { kakaoNick, name } — 카톡 닉네임이 있으면 베타 예약을 수정·취소할 수 있음. 관리자만 전체를 봅니다.
const USERS = 'naite_users';
// 예약 수정·취소 기록 { action, uid, col, batch, at, res } — 관리자만 읽습니다.
const LOGS = 'naite_logs';
const LOG_FIELDS = ['date', 'startTime', 'endTime', 'teamName', 'userName'];

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 추측할 수 없는 무작위 문자열 (카카오 로그인 state 값 등) */
export function randomToken(n = 32) {
    // ponytail: b % 62 는 약간 치우치지만 32자리 값의 추측 불가능성엔 영향 없음
    return Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALNUM[b % ALNUM.length]).join('');
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

    /* ----- 이 기기의 표시 이름 (카톡 연동 여부) ----- */
    const profileListeners = new Set();
    let profile;              // undefined: 아직 모름 / null: 문서 없음 / { kakaoNick, name }
    let profileUid = null;
    let unsubProfile = () => {};
    const watchProfile = uid => {
        if (uid === profileUid) return;
        profileUid = uid;
        unsubProfile();
        unsubProfile = () => {};
        profile = undefined;
        profileListeners.forEach(fn => fn(undefined));   // 계정이 바뀌면 새 정보가 올 때까지 '모름'
        if (!uid) return;
        unsubProfile = fs.onSnapshot(
            fs.doc(db, USERS, uid),
            snap => {
                profile = snap.data() ?? null;
                profileListeners.forEach(fn => fn(profile));
            },
            err => console.error('[store] 내 정보 구독 실패:', err)
        );
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
        watchProfile(user?.uid ?? null);
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

        /** 이 기기의 표시 이름이 바뀔 때마다 cb(undefined(모름) | null | { kakaoNick, name }) 호출 */
        onProfile(cb) {
            profileListeners.add(cb);
            if (profile !== undefined) cb(profile);
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
         *   add     [data]         새 예약 (작성자 uid 자동 기록)
         *   update  [[id, data]]   값이 undefined 인 필드는 삭제
         *   remove  [id]
         * 추가·수정한 예약에는 마지막으로 손댄 기기(editedBy)를 남기고,
         * 수정·취소는 같은 배치로 변경 기록(naite_logs)에 남깁니다. (관리자 '최근 수정·취소')
         */
        async write({ add = [], update = [], remove = [] }) {
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

        /** 이 기기의 표시 이름 저장 ({ kakaoNick } 또는 { name }, 나머지 필드는 유지) */
        async saveProfile(fields) {
            const uid = await getUid();
            if (!uid) return;
            await fs.setDoc(fs.doc(db, USERS, uid), { ...fields, updatedAt: new Date().toISOString() }, { merge: true });
        },

        /** 관리자용: 이 예약표의 수정·취소 기록 구독. cb(기록 배열, 최신순), 해제 함수 반환 */
        watchLogs(cb) {
            // 이 예약표 것만 받아 정렬 (col + at 정렬을 함께 쓰면 복합 색인이 필요해서 정렬은 여기서)
            return fs.onSnapshot(
                fs.query(fs.collection(db, LOGS), fs.where('col', '==', COLLECTION_NAME)),
                // 방금 쓴 기록은 서버 시각이 오기 전까지 추정 시각으로 정렬·표시
                snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
                    .sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0))),
                err => console.error('[store] 기록 구독 실패:', err)
            );
        },

        /** 관리자용: 기록 삭제 (배치 한도 500건이라 나눠서) */
        async deleteLogs(ids) {
            for (let i = 0; i < ids.length; i += 450) {
                const batch = fs.writeBatch(db);
                ids.slice(i, i + 450).forEach(id => batch.delete(fs.doc(db, LOGS, id)));
                await batch.commit();
            }
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
        onProfile() {},
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
        async saveProfile() {},
        watchLogs() {
            return () => {};
        },
        async deleteLogs() {},
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
