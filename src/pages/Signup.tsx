import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { Spinner } from "@/components/Spinner";

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
          <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            △
          </span>
          <h1 className="text-2xl font-bold text-ink-50">Create your account</h1>
          <p className="mt-1 text-sm text-ink-400">
            Save your progress as you master olympiad geometry.
          </p>
        </div>

        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Firebase is not configured. Copy{" "}
            <code className="text-amber-100">.env.example</code> to{" "}
            <code className="text-amber-100">.env</code> to enable sign-up.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-ink-800 bg-ink-900/60 p-6 shadow-xl"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-300">
              Name
            </span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-ink-50 outline-none focus:border-brand-500"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-300">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-ink-50 outline-none focus:border-brand-500"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-300">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-ink-50 outline-none focus:border-brand-500"
            />
          </label>

          {error && (
            <p className="mb-4 text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
