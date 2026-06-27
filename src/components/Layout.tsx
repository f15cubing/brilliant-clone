import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { useProgress } from "@/lib/progress/ProgressContext";
import { ByrneLogo, IconXP } from "@/components/ByrneMark";

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
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <ByrneLogo size={34} />
            <span className="flex flex-col leading-none">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
                Elements of
              </span>
              <span className="font-display text-lg tracking-tight text-ink">
                Olympiad Geometry
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            {isAdmin && (
              <button
                onClick={() => setTestMode(!testMode)}
                title="When on, every question opens fresh and no progress is recorded."
                className={
                  testMode
                    ? "rounded-sm bg-correct px-3 py-1 font-mono text-xs uppercase tracking-wide text-paper"
                    : "rounded-sm border border-rule px-3 py-1 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
                }
              >
                Test {testMode ? "on" : "off"}
              </button>
            )}
            <span className="flex items-center gap-1.5 border border-ochre/40 bg-ochre/10 px-2.5 py-1 font-mono text-sm font-semibold text-ochre-deep">
              <IconXP size={15} />
              {snapshot.totalXp}
            </span>
            <nav className="hidden gap-5 font-mono text-xs uppercase tracking-wider text-ink-soft sm:flex">
              <Link to="/" className="transition hover:text-vermilion">
                Dashboard
              </Link>
              <Link to="/course" className="transition hover:text-vermilion">
                Course
              </Link>
              <Link to="/freeplay" className="transition hover:text-vermilion">
                Freeplay
              </Link>
              <Link to="/proofs" className="transition hover:text-vermilion">
                Proofs
              </Link>
            </nav>
            {configured && user && (
              <button
                onClick={handleSignOut}
                className="rounded-sm border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
