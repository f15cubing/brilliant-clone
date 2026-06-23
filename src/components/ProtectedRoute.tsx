import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/AuthContext";
import { Spinner } from "@/components/Spinner";

/**
 * Gates the app behind login when Firebase is configured. When it is *not*
 * configured (local dev without env), the app runs in guest mode so it stays
 * usable.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }
  if (configured && !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
