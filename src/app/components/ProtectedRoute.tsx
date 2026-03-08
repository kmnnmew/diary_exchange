import { Navigate, Outlet } from "react-router";
import { useApp } from "../context/AppContext";

export function ProtectedRoute() {
  const { user, authLoading } = useApp();

  // Wait for auth to resolve before deciding — prevents flash redirect to /auth
  if (authLoading) return <div>로딩 중...</div>;

  if (!user) return <Navigate to="/auth" replace />;

  return <Outlet />;
}
