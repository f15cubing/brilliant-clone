import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { useProgress } from "@/lib/progress/ProgressContext";

export function Layout() {
  const { user, signOut, configured, isAdmin, testMode, setTestMode } =
    useAuth();
  const { snapshot, flushProgress } = useProgress();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await flushProgress();
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              △
            </span>
            <span className="font-semibold tracking-tight">Olympiad Geometry</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => setTestMode(!testMode)}
                title="When on, every question opens fresh and no progress is recorded."
                className={
                  testMode
                    ? "rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500"
                    : "rounded-full border border-ink-700 px-3 py-1 text-sm font-semibold text-ink-300 hover:border-ink-500 hover:text-ink-100"
                }
              >
                Test mode: {testMode ? "on" : "off"}
              </button>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-ink-800 px-3 py-1 text-sm font-semibold text-amber-300">
              <span>⭐</span>
              {snapshot.totalXp} XP
            </span>
            <nav className="hidden gap-4 text-sm text-ink-300 sm:flex">
              <Link to="/" className="hover:text-ink-50">
                Dashboard
              </Link>
              <Link to="/course" className="hover:text-ink-50">
                Course
              </Link>
            </nav>
            {configured && user && (
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:border-ink-500 hover:text-ink-100"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
