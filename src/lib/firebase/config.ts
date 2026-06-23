import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // ignoreUndefinedProperties lets optional fields (e.g. completedAt,
  // lastProblemId, lastMistakeId) be omitted instead of rejecting the write.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
} else {
  console.warn(
    "[firebase] Not configured. Copy .env.example to .env and fill in your " +
      "Firebase project keys to enable auth and progress sync.",
  );
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
