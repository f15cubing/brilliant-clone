import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

const recaptchaSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY;
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let appCheckInstance: AppCheck | undefined;
let functionsInstance: Functions | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // ignoreUndefinedProperties lets optional fields (e.g. completedAt,
  // lastProblemId, lastMistakeId) be omitted instead of rejecting the write.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });

  // App Check protects the paid NL Cloud Function (SECURITY_AUDIT finding #9).
  // It's initialized only when a reCAPTCHA site key is provided, so the rest of
  // the app keeps working before App Check is provisioned. In dev, set
  // VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ("true" to auto-generate, or paste a
  // registered debug token) to exercise the protected endpoint locally.
  if (recaptchaSiteKey) {
    const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
    if (import.meta.env.DEV && debugToken) {
      (
        self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
    }
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn("[firebase] App Check init failed:", err);
    }
  }

  functionsInstance = getFunctions(app, functionsRegion);
} else {
  console.warn(
    "[firebase] Not configured. Copy .env.example to .env and fill in your " +
      "Firebase project keys to enable auth and progress sync.",
  );
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
/** App Check handle (undefined until a reCAPTCHA site key is provided). */
export const appCheck = appCheckInstance;
/** Cloud Functions handle (undefined until Firebase is configured). */
export const functions = functionsInstance;
