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

const FIREBASE_VERSION = '12.10.0';
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
    const [{ initializeApp }, fs] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]);

    const app = initializeApp(FIREBASE_CONFIG);
    const db = fs.getFirestore(app);
    const col = fs.collection(db, COLLECTION_NAME);

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

    return {
        mode: 'cloud',
        async add(data) {
            await fs.addDoc(col, { ...data, createdAt: new Date().toISOString() });
        },
        async update(id, data) {
            await fs.updateDoc(fs.doc(db, COLLECTION_NAME, id), data);
        },
        async remove(id) {
            await fs.deleteDoc(fs.doc(db, COLLECTION_NAME, id));
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

    return {
        mode: 'local',
        async add(data) {
            const list = read();
            list.push({ ...data, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() });
            write(list);
        },
        async update(id, data) {
            write(read().map(r => (r.id === id ? { ...r, ...data } : r)));
        },
        async remove(id) {
            write(read().filter(r => r.id !== id));
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
