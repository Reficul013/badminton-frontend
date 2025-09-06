// src/lib/auth.js
import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInWithPopup,
  GoogleAuthProvider, signOut
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FB_API_KEY,
  authDomain:    import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:     import.meta.env.VITE_FB_PROJECT_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export function watchAuth(callback) {
  // returns an unsubscribe function
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken()
      localStorage.setItem('idToken', token)
      localStorage.setItem('displayName', user.displayName || '')
      localStorage.setItem('photoURL', user.photoURL || '')
    } else {
      localStorage.removeItem('idToken')
      localStorage.removeItem('displayName')
      localStorage.removeItem('photoURL')
    }
    callback(user)
  })
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, provider)
  // token is persisted by watchAuth
}

export async function logout() {
  await signOut(auth)
}

export async function getIdToken() {
  const user = auth.currentUser
  return user ? user.getIdToken() : null
}
