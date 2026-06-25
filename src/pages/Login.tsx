import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { Spinner } from "@/components/Spinner";
import { ByrneLogo } from "@/components/ByrneMark";

export function Login() {
  const { signIn, user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  if (configured && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex justify-center">
            <ByrneLogo size={52} />
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
            Olympiad Geometry
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1 font-serif italic text-ink-soft">
            Sign in to continue your angle-chasing journey.
          </p>
        </div>

        {!configured && (
          <p className="mb-4 border-l-2 border-ochre bg-ochre/10 px-4 py-3 text-sm text-ink-soft">
            Firebase is not configured — the app runs in guest mode. Copy{" "}
            <code className="font-mono text-ochre-deep">.env.example</code> to{" "}
            <code className="font-mono text-ochre-deep">.env</code> to enable
            accounts.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="border border-ink/15 bg-panel-soft p-6 shadow-[3px_3px_0_0_rgba(27,23,20,0.08)]"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-ink-soft">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-ultramarine"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-ink-soft">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-ultramarine"
            />
          </label>

          {error && (
            <p className="mb-4 text-sm font-medium text-vermilion" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="w-full rounded-sm bg-vermilion py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          No account?{" "}
          <Link
            to="/signup"
            className="font-mono text-xs uppercase tracking-wide text-ultramarine hover:text-vermilion"
          >
            Create one
          </Link>
        </p>

        {!configured && (
          <p className="mt-4 text-center">
            <Link
              to="/"
              className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ink"
            >
              Continue as guest →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
