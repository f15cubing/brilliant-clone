import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";

// Add your account email(s) here to unlock Test mode.
const ADMIN_EMAILS = ["felipe.caicedo@alphaaiengineering.com"];

const TEST_MODE_KEY = "geo-test-mode";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  testMode: boolean;
  setTestMode: (on: boolean) => void;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [testModeRaw, setTestModeRaw] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TEST_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setTestMode = (on: boolean) => {
    setTestModeRaw(on);
    try {
      if (on) localStorage.setItem(TEST_MODE_KEY, "1");
      else localStorage.removeItem(TEST_MODE_KEY);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()),
  );
  // Non-admins can never have test mode active, even if the flag lingers.
  const testMode = isAdmin && testModeRaw;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      isAdmin,
      testMode,
      setTestMode,
      async signUp(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
          setUser({ ...cred.user });
        }
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, loading, isAdmin, testMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
