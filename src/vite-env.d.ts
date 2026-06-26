/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Optional Python symbolic-backend URL for step verification. */
  readonly VITE_FREEPLAY_API_URL?: string;
  /** NL step-input backend: "mock" (default) or "firebase". */
  readonly VITE_FREEPLAY_NL_BACKEND?: string;
  /** reCAPTCHA v3 site key for App Check (enables the firebase NL backend). */
  readonly VITE_FIREBASE_RECAPTCHA_SITE_KEY?: string;
  /** Dev-only App Check debug token ("true" to auto-generate, or a token). */
  readonly VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
  /** Cloud Functions region (defaults to us-central1). */
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "react-katex";
