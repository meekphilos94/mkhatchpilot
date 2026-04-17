import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '../lib/firebase';

interface FirebaseContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  authError: string | null;
  signOutUser: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  configured: false,
  loading: false,
  user: null,
  authError: null,
  signOutUser: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsGuest: async () => {},
});

export function FirebaseProvider({ children }: PropsWithChildren) {
  const configured = hasFirebaseConfig();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    getFirestoreDb();

    if (!auth) {
      setLoading(false);
      setAuthError('Firebase auth is not available.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [configured]);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    await signOut(auth);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();

    if (!auth) {
      throw new Error('Firebase auth is not available.');
    }

    setAuthError(null);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();

    if (!auth) {
      throw new Error('Firebase auth is not available.');
    }

    setAuthError(null);
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInAsGuest = useCallback(async () => {
    const auth = getFirebaseAuth();

    if (!auth) {
      throw new Error('Firebase auth is not available.');
    }

    setAuthError(null);

    try {
      await signInAnonymously(auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in as guest.');
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      configured,
      loading,
      user,
      authError,
      signOutUser,
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
    }),
    [authError, configured, loading, user, signOutUser, signInWithEmail, signUpWithEmail, signInAsGuest],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebaseSession() {
  return useContext(FirebaseContext);
}
