import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { logout as apiLogout } from "../../services/api/authApi";

export const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiLogout();
      clearAuth();
    } catch (error) {
      console.error("로그아웃 실패:", error);
      clearAuth();
    }
  };

  // 로그인/회원가입 페이지에서는 헤더를 간소화
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Trip Flow Logo" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gray-900">Trip Flow</span>
          </Link>

          {/* Navigation & Auth */}
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    안녕하세요, <span className="font-semibold text-gray-900">{user.username}</span>님
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
