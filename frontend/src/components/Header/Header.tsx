import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { logoutFromFirebase } from "../../services/firebaseAuthService";
import { logout as logoutFromBackend } from "../../services/api/authApi";
import { GradientButton } from "../GradientButton/GradientButton";
import logoUrl from "../../assets/logo.svg";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const isHomePage = location.pathname === "/";

  const handleLogout = async () => {
    try {
      await Promise.all([logoutFromBackend(), logoutFromFirebase()]);
      clearAuth();
      navigate("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      // 에러가 발생해도 로컬 데이터는 정리
      clearAuth();

      // 홈페이지로 이동
      navigate("/");
    }
  };

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  if (isHomePage) {
    return (
      <header className="bg-transparent h-20 flex items-center px-12">
        <div className="w-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-4xl">✈️</span>
            <span className="text-[28px] font-bold bg-gradient-to-b from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Trip Flow
            </span>
          </Link>

          {/* Navigation & Auth */}
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    안녕하세요, <span className="font-semibold text-gray-900">{user.name || user.username || user.email}</span>님
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="w-[100px] h-10 flex items-center justify-center rounded-[20px] border-2 border-blue-500 text-blue-500 text-[15px] font-semibold hover:bg-blue-50 transition-colors"
                  >
                    로그인
                  </Link>
                  <GradientButton as="link" to="/register" className="w-[120px] h-10 rounded-[20px] text-[15px]" size="sm">
                    회원가입
                  </GradientButton>
                </div>
              )}
            </nav>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt="Trip Flow Logo" className="h-10 w-10" />
            <span className="text-xl font-bold text-gray-900">Trip Flow</span>
          </Link>

          {/* Navigation & Auth */}
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    안녕하세요, <span className="font-semibold text-gray-900">{user.name || user.username || user.email}</span>님
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:border-blue-400 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};
