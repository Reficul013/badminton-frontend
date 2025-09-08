// src/lib/auth.js
import { app } from "./firebase";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";

const auth = getAuth(app);

// --- Wait until Firebase auth finishes initializing (first page load) ---
let _readyOnce;
export function authReady() {
  // If Firebase has already resolved a user/null once in this tab,
  // return that result immediately on next calls.
  if (auth.currentUser !== undefined && auth.currentUser !== null) {
    return Promise.resolve(auth.currentUser);
  }
  if (!_readyOnce) {
    _readyOnce = new Promise((resolve) => {
      const off = onAuthStateChanged(auth, (u) => {
        off();                     // run once
        resolve(u || null);
      });
    });
  }
  return _readyOnce;
}

// ----- State / token helpers -----
export function watchAuth(callback) {
  return onAuthStateChanged(auth, (user) => callback(user));
}

export function currentUser() {
  return auth.currentUser;
}

// Always wait for auth to be ready before asking for a token
export async function idToken() {
  const u = await authReady();
  return u ? u.getIdToken() : null;
}

// ----- Auth actions -----
export async function signIn(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signUp(email, password, displayName) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(user, { displayName }).catch(() => {});
  }
  return user;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  await fbSignOut(auth);
}

// ----- Backwards-compatible aliases (so old imports don’t crash) -----
export { signIn as loginWithEmail };
export { signUp as registerWithEmail };
export { signOut as logout };
