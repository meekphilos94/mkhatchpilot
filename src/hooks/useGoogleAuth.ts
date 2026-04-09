import { useEffect, useMemo, useState } from 'react';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';

import { getFirebaseAuth } from '../lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleConfig = useMemo(
    () => ({
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    }),
    [],
  );

  const configured = Boolean(
    googleConfig.androidClientId || googleConfig.iosClientId || googleConfig.webClientId,
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleConfig.androidClientId,
    iosClientId: googleConfig.iosClientId,
    webClientId: googleConfig.webClientId,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type !== 'success') {
        return;
      }

      const auth = getFirebaseAuth();
      const idToken = response.params.id_token;

      if (!auth || !idToken) {
        setError('Google sign-in returned without a usable ID token.');
        setLoading(false);
        return;
      }

      try {
        const credential = GoogleAuthProvider.credential(idToken);

        if (auth.currentUser?.isAnonymous) {
          await linkWithCredential(auth.currentUser, credential);
        } else {
          await signInWithCredential(auth, credential);
        }
      } catch (signInError) {
        setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.');
      } finally {
        setLoading(false);
      }
    }

    handleResponse();
  }, [response]);

  async function signInWithGoogle() {
    if (!configured || !request) {
      setError('Google sign-in is not configured yet.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await promptAsync();

    if (result.type !== 'success') {
      setLoading(false);
    }
  }

  return {
    configured,
    error,
    loading,
    signInWithGoogle,
  };
}
