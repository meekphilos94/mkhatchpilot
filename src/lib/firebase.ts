import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!firebaseAppInstance) {
    firebaseAppInstance = getApps()[0] ?? initializeApp(firebaseConfig);
  }

  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (firebaseAuthInstance) {
    return firebaseAuthInstance;
  }

  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  firebaseAuthInstance = getAuth(app);
  return firebaseAuthInstance;
}

export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (storageInstance) {
    return storageInstance;
  }

  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  storageInstance = getStorage(app);
  return storageInstance;
}
