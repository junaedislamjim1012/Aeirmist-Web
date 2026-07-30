import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore';

import { getStorage } from 'firebase/storage';

import config from '../../firebase-applet-config.json';

// Robust Firebase configuration with explicit, non-negotiable defaults for aeirmist-d4dd8
const activeConfig = {
  projectId: "aeirmist-d4dd8",
  authDomain: "aeirmist-d4dd8.firebaseapp.com",
  storageBucket: "aeirmist-d4dd8.firebasestorage.app",
  appId: "1:999048341395:web:6142e77f58bf3b9de9aa66",
  apiKey: "AIzaSyBmk_p1QK7VEI6VM0z2oX3Ut4TpEme3pkk",
  firestoreDatabaseId: "(default)",
  messagingSenderId: "999048341395",
  measurementId: "G-DLVDQNDWXE"
};

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(activeConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .catch(console.error);

const dbId = activeConfig.firestoreDatabaseId === '(default)' ? undefined : activeConfig.firestoreDatabaseId;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, dbId);
} catch (e) {
  console.warn("Firestore safe-fallback activated. Running with non-persistent client connection.", e);
  firestoreInstance = getFirestore(app, dbId);
}

export const db = firestoreInstance;

export const storage = getStorage(app);

export const isConfigValid = true;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  throw new Error(errorJson);
}

export default app;
