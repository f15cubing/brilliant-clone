import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { Spinner } from "@/components/Spinner";
import { ByrneLogo } from "@/components/ByrneMark";

export function Signup() {
  const { signUp, user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
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
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      navigate("/");
    } catch {
      setError("Could not create account. The email may already be in use.");
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
            Create your account
          </h1>
          <p className="mt-1 font-serif italic text-ink-soft">
            Save your progress as you master olympiad geometry.
          </p>
        </div>

        {!configured && (
          <p className="mb-4 border-l-2 border-ochre bg-ochre/10 px-4 py-3 text-sm text-ink-soft">
            Firebase is not configured. Copy{" "}
            <code className="font-mono text-ochre-deep">.env.example</code> to{" "}
            <code className="font-mono text-ochre-deep">.env</code> to enable
            sign-up.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="border border-ink/15 bg-panel-soft p-6 shadow-[3px_3px_0_0_rgba(27,23,20,0.08)]"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-ink-soft">
              Name
            </span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-ink outline-none transition focus:border-ultramarine"
            />
          </label>
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
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-wide text-ultramarine hover:text-vermilion"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
