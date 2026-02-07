/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 */
import { Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  if (isAuthenticated) {
    // localStorage에 pendingJoinShareId가 있으면 해당 공유 페이지로 리다이렉트
    const pendingJoinShareId = localStorage.getItem('pendingJoinShareId');
    
    // location.state?.from이 있으면 그쪽으로, 없으면 pendingJoinShareId 확인
    const targetPath = (location.state as any)?.from 
      || (pendingJoinShareId ? `/share/${pendingJoinShareId}` : redirectTo);
    
    console.log('🔄 PublicOnlyRoute 리다이렉트:', targetPath);
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};
