import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useTripStore } from "../../stores/tripStore";
import { logoutFromFirebase } from "../../services/firebaseAuthService";
import { tokenManager } from "../../services/tokenManager";
import logoUrl from "../../assets/logo.svg";

export const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const clearUserTrips = useTripStore((state) => state.clearUserTrips);

  const handleLogout = async () => {
    try {
      // Firebase에서 로그아웃
      await logoutFromFirebase();

      // Access Token 메모리에서 제거
      tokenManager.clearAccessToken();

      // 로컬 상태 정리
      clearAuth();
      clearUserTrips(); // 서버에서 가져온 trips 제거

      console.log("✅ 로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 실패:", error);
      // 에러가 발생해도 로컬 데이터는 정리
      tokenManager.clearAccessToken();
      clearAuth();
      clearUserTrips();
    }
  };

  // 로그인/회원가입 페이지에서는 헤더를 간소화
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Trip Flow Logo" className="h-10 w-10" />
            <span className="text-xl font-bold text-gray-900">Trip Flow</span>
          </Link>

          {/* Navigation & Auth */}
          {!isAuthPage && (
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    안녕하세요,{" "}
                    <span className="font-semibold text-gray-900">
                      {user.name || user.username || user.email}
                    </span>
                    님
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
