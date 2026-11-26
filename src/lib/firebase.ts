import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const databaseId =
  firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
    ? firebaseConfigJson.firestoreDatabaseId
    : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch {
  try {
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
        localCache: memoryLocalCache(),
      },
      databaseId
    );
  } catch {
    firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;

export async function measureFirestoreLatency(): Promise<{
  ok: boolean;
  latencyMs: number;
  online: boolean;
  error?: string;
}> {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      ok: true,
      latencyMs: Math.max(1, Math.round(end - start)),
      online: true,
    };
  } catch (error) {
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const message = error instanceof Error ? error.message : String(error);
    const isOffline = message.toLowerCase().includes('the client is offline') || !online;
    if (isOffline) {
      console.warn('Firestore server reachability check: client is offline.');
    }
    return {
      ok: false,
      latencyMs: Math.max(1, Math.round(end - start)),
      online: !isOffline,
      error: message,
    };
  }
}

measureFirestoreLatency().catch(() => {});

export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
