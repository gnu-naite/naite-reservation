/* ============================================================
   데이터 저장소 계층
   ------------------------------------------------------------
   - config.js 에 Firebase 설정이 채워져 있으면 Firestore(실시간 공유) 사용
   - 아직 설정 전이라면 localStorage 임시 모드로 동작 (배너 노출)
   두 경우 모두 동일한 인터페이스를 제공합니다.
     store.mode           'cloud' | 'local'
     store.add(data)      예약 추가
     store.update(id,d)   예약 수정
     store.remove(id)     예약 삭제
   ============================================================ */

import { FIREBASE_CONFIG, COLLECTION_NAME } from './config.js';

const FIREBASE_VERSION = '12.19.0';
const LOCAL_KEY = 'naite_reservations_local';

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

    /** 예약에 작성자 uid 를 붙입니다. 인증을 못 쓰는 경우엔 붙이지 않습니다. */
    const withOwner = async data => {
        const uid = await getUid();
        return uid ? { ...data, ownerUid: uid } : data;
    };

    // 실시간 구독: 다른 사람이 예약을 바꾸면 즉시 반영됩니다.
    fs.onSnapshot(
        fs.query(col),
        snapshot => {
            const list = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
            onChange(list);
        },
        err => {
            console.error('[store] 실시간 구독 실패:', err);
            onChange([], err);
        }
    );

    /** 500건씩 끊어서 배치 실행 (Firestore 배치 한도) */
    const runBatched = async (items, apply) => {
        for (let i = 0; i < items.length; i += 450) {
            const batch = fs.writeBatch(db);
            items.slice(i, i + 450).forEach(item => apply(batch, item));
            await batch.commit();
        }
    };

    return {
        mode: 'cloud',

        /** 로그인 상태가 바뀔 때마다 cb(user, error) 호출 */
        onUser(cb) {
            userListeners.add(cb);
            cb(currentUser, authError);
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

        async add(data) {
            await fs.addDoc(col, { ...(await withOwner(data)), createdAt: new Date().toISOString() });
        },
        /** 고정 예약의 여러 회차를 한 번에 저장 */
        async addMany(list) {
            const createdAt = new Date().toISOString();
            const uid = await getUid();
            await runBatched(list, (batch, data) => {
                batch.set(fs.doc(col), { ...data, ...(uid ? { ownerUid: uid } : {}), createdAt });
            });
        },
        async update(id, data) {
            await fs.updateDoc(fs.doc(db, COLLECTION_NAME, id), data);
        },
        async remove(id) {
            await fs.deleteDoc(fs.doc(db, COLLECTION_NAME, id));
        },
        /** 고정 예약 전체 회차를 한 번에 취소 */
        async removeMany(ids) {
            await runBatched(ids, (batch, id) => {
                batch.delete(fs.doc(db, COLLECTION_NAME, id));
            });
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
    const write = list => {
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
        // 로컬 모드는 이 기기 전용이라 권한 구분이 없습니다.
        onUser(cb) {
            cb(null, null);
        },
        async signInWithGoogle() {
            throw new Error('local-mode');
        },
        async signOut() {},
        async add(data) {
            const list = read();
            list.push({ ...data, id: newId(), createdAt: new Date().toISOString() });
            write(list);
        },
        async addMany(items) {
            const createdAt = new Date().toISOString();
            const list = read();
            items.forEach(data => list.push({ ...data, id: newId(), createdAt }));
            write(list);
        },
        async update(id, data) {
            write(read().map(r => (r.id === id ? { ...r, ...data } : r)));
        },
        async remove(id) {
            write(read().filter(r => r.id !== id));
        },
        async removeMany(ids) {
            const set = new Set(ids);
            write(read().filter(r => !set.has(r.id)));
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
