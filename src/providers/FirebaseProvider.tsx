import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from '../lib/firebase';

interface FirebaseContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  authError: string | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  configured: false,
  loading: false,
  user: null,
  authError: null,
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

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        setLoading(false);
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Unable to sign in to Firebase.');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [configured]);

  const value = useMemo(
    () => ({
      configured,
      loading,
      user,
      authError,
    }),
    [authError, configured, loading, user],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebaseSession() {
  return useContext(FirebaseContext);
}
