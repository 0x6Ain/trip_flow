import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { Header } from "./components/Header/Header";
import { PublicOnlyRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { TripPlanPage } from "./pages/TripPlanPage";
import { ScheduleView } from "./pages/ScheduleView";
import { SharedTripPage } from "./pages/SharedTripPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EmailVerificationCompletePage } from "./pages/EmailVerificationCompletePage";
import { initGoogleMaps } from "./services/googleMapsService";
import { env } from "./config/env";
import { refreshAccessToken, getCurrentUser } from "./services/api/authApi";
import { useAuthStore } from "./stores/authStore";
import { tokenManager } from "./services/tokenManager";

// Unified Google Maps configuration
const libraries: (
  | "places"
  | "drawing"
  | "geometry"
  | "visualization"
  | "marker"
)[] = ["places", "marker"];

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const { user, _hasHydrated, setUser, clearAuth } = useAuthStore();
  const authCheckInitiated = useRef(false);

  // Load Google Maps API once at the top level
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: env.googleMapsApiKey,
    libraries,
    version: "beta", // Required for AdvancedMarkerElement
  });

  // 앱 초기화 시 인증 상태 확인 및 동기화
  useEffect(() => {
    // localStorage 복원이 완료될 때까지 대기
    if (!_hasHydrated) {
      console.log("⏳ localStorage 복원 대기 중...");
      return;
    }

    // 한 번만 실행되도록 보장
    if (authCheckInitiated.current) {
      return;
    }
    authCheckInitiated.current = true;

    const checkAuth = async () => {
      console.log("🔍 앱 초기화: 인증 상태 확인 중...");
      console.log("  - 사용자 정보 존재:", !!user);
      console.log("  - Access Token 메모리:", tokenManager.hasAccessToken());

      // localStorage에 사용자 정보가 있으면 토큰 복구 시도
      if (user) {
        try {
          // 메모리에 Access Token이 없으면 Cookie의 Refresh Token으로 재발급
          if (!tokenManager.hasAccessToken()) {
            console.log(
              "🔄 새로고침 감지: Cookie의 Refresh Token으로 Access Token 재발급 시도..."
            );
            await refreshAccessToken();
            console.log("✅ Access Token 재발급 성공");
          }

          // 사용자 정보 최신화
          console.log("🔄 사용자 정보 조회 중...");
          const userData = await getCurrentUser();
          setUser(userData);
          console.log("✅ 인증 상태 복원 완료:", userData.email);
        } catch (error: any) {
          console.error("❌ 토큰 복구 실패:", error.response?.status);
          // Refresh Token이 만료되었거나 없으면 로그아웃 처리
          tokenManager.clearAccessToken();
          clearAuth();
          console.log("🧹 로그아웃 처리 완료 (Refresh Token 없음 또는 만료)");
        }
      } else {
        console.log("ℹ️ 저장된 사용자 정보 없음 - 비로그인 상태");
      }

      setAuthChecked(true);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]); // hydration 완료 시 한 번만 실행

  // Initialize Google Maps services when API is loaded
  useEffect(() => {
    if (isLoaded) {
      initGoogleMaps().catch((error) => {
        console.error("Google Maps 초기화 실패:", error);
      });
    }
  }, [isLoaded]);

  // 인증 확인이 완료될 때까지 로딩 표시
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* 비로그인 사용자만 접근 가능 */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* 이메일 인증 완료 페이지 (모두 접근 가능) */}
        <Route
          path="/email-verification-complete"
          element={<EmailVerificationCompletePage />}
        />

        {/* 여행 관련 페이지 (모두 접근 가능 - 게스트도 사용 가능) */}
        <Route path="/plan/:tripId" element={<TripPlanPage />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/trip/:tripId" element={<SharedTripPage />} />
      </Routes>
    </Router>
  );
}

export default App;
