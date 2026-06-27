import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProgressProvider } from "@/lib/progress/ProgressContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import { Dashboard } from "@/pages/Dashboard";
import { CourseMap } from "@/pages/CourseMap";
import { LessonPlayer } from "@/pages/LessonPlayer";
import { FreeplayList } from "@/pages/FreeplayList";
import { FreeplayArena } from "@/pages/FreeplayArena";
import { ProofArchive } from "@/pages/ProofArchive";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/course" element={<CourseMap />} />
              <Route path="/lesson/:lessonId" element={<LessonPlayer />} />
              <Route path="/freeplay" element={<FreeplayList />} />
              <Route path="/freeplay/:puzzleId" element={<FreeplayArena />} />
              <Route path="/proofs" element={<ProofArchive />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
