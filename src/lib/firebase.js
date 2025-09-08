import { initializeApp, getApps } from "firebase/app";

function required(name) {
  const v = import.meta.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

const config = {
  apiKey:            required("VITE_FIREBASE_API_KEY"),
  authDomain:        required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     required("VITE_FIREBASE_STORAGE_BUCKET"),
  appId:             required("VITE_FIREBASE_APP_ID"),
  // Optional:
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length ? getApps()[0] : initializeApp(config);
