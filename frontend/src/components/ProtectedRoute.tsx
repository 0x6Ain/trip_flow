/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 */
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 로그인이 필요한 페이지 보호
 * 비로그인 사용자는 로그인 페이지로 리다이렉트
 */
export const ProtectedRoute = ({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    console.log("🚫 인증되지 않은 접근 - 로그인 페이지로 리다이렉트");
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * 비로그인 사용자만 접근 가능한 페이지 보호
 * 로그인 사용자는 홈으로 리다이렉트 (로그인, 회원가입 페이지용)
 */
export const PublicOnlyRoute = ({
  children,
  redirectTo = "/",
}: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    console.log("✅ 이미 로그인되어 있습니다 - 홈으로 리다이렉트");
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
