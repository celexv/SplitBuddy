'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function saveUserToFirestore(user) {
    if (!user || user.isAnonymous) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        isAnonymous: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && !user.isAnonymous) await saveUserToFirestore(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signUpWithEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await saveUserToFirestore({ ...cred.user, displayName });
    return cred;
  }

  async function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await saveUserToFirestore(cred.user);
    return cred;
  }

  async function signInAnonymously() {
    return firebaseSignInAnonymously(auth);
  }

  async function signOut() {
    return firebaseSignOut(auth);
  }

  const value = {
    currentUser,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInAnonymously,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
