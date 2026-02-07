import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { Header } from "./components/Header/Header";
import { PublicOnlyRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { TripPlanPage } from "./pages/TripPlanPage";
import { ScheduleView } from "./pages/ScheduleView";
import { WeeklySchedulePage } from "./pages/WeeklySchedulePage";
import { SharedTripPage } from "./pages/SharedTripPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EmailVerificationCompletePage } from "./pages/EmailVerificationCompletePage";
import { initGoogleMaps } from "./services/googleMapsService";
import { env } from "./config/env";
import { refreshAccessToken, getCurrentUser } from "./services/api/authApi";
import { useAuthStore } from "./stores/authStore";
import { tokenManager } from "./services/tokenManager";
import { initKakao } from "./config/kakao";

// Unified Google Maps configuration
const libraries: ("places" | "drawing" | "geometry" | "visualization" | "marker")[] = ["places", "marker", "geometry"];

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const { user, _hasHydrated, setUser, clearAuth } = useAuthStore();
  const authCheckInitiated = useRef(false);
  const consoleArtDisplayed = useRef(false);

  // Load Google Maps API once at the top level
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: env.googleMapsApiKey,
    libraries,
    version: "beta", // Required for AdvancedMarkerElement
  });

  // Display console art only once
  useEffect(() => {
    if (consoleArtDisplayed.current) return;
    consoleArtDisplayed.current = true;

    const styles = {
      title: "color: #3B82F6; font-size: 20px; font-weight: bold;",
      subtitle: "color: #6B7280; font-size: 13px;",
      border: "color: #3B82F6; font-weight: bold;",
      info: "color: #10B981; font-weight: bold;",
    };

    console.log(
      "%c\n" +
        " ████████╗██████╗ ██╗██████╗ ███████╗██╗      ██████╗ ██╗    ██╗ \n" +
        " ╚══██╔══╝██╔══██╗██║██╔══██╗██╔════╝██║     ██╔═══██╗██║    ██║ \n" +
        "    ██║   ██████╔╝██║██████╔╝█████╗  ██║     ██║   ██║██║ █╗ ██║ \n" +
        "    ██║   ██╔══██╗██║██╔═══╝ ██╔══╝  ██║     ██║   ██║██║███╗██║ \n" +
        "    ██║   ██║  ██║██║██║     ██║     ███████╗╚██████╔╝╚███╔███╔╝ \n" +
        "    ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝   ",
      styles.title
    );
    console.log("");
    console.log("%c✨ Welcome to TripFlow Developer Console!", styles.info);
    console.log("");
  }, []);

  // 앱 초기화 시 인증 상태 확인 및 동기화
  useEffect(() => {
    // localStorage 복원이 완료될 때까지 대기
    if (!_hasHydrated) {
      return;
    }

    // 한 번만 실행되도록 보장
    if (authCheckInitiated.current) {
      return;
    }
    authCheckInitiated.current = true;

    const checkAuth = async () => {
      // localStorage에 사용자 정보가 있으면 토큰 복구 시도
      if (user) {
        try {
          // 메모리에 Access Token이 없으면 Cookie의 Refresh Token으로 재발급
          if (!tokenManager.hasAccessToken()) {
            await refreshAccessToken();
          }

          // 사용자 정보 최신화
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error: any) {
          // Refresh Token이 만료되었거나 없으면 로그아웃 처리
          tokenManager.clearAccessToken();
          clearAuth();
        }
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

  // Initialize Kakao SDK
  useEffect(() => {
    initKakao();
  }, []);

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
        <Route path="/email-verification-complete" element={<EmailVerificationCompletePage />} />

        {/* 여행 관련 페이지 (모두 접근 가능 - 게스트도 사용 가능) */}
        <Route path="/plan" element={<TripPlanPage />} />
        <Route path="/plans/:tripId" element={<TripPlanPage />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/weekly-schedule" element={<WeeklySchedulePage />} />
        <Route path="/weekly-schedule/:tripId" element={<WeeklySchedulePage />} />
        <Route path="/share/:shareId" element={<SharedTripPage />} />
      </Routes>
    </Router>
  );
}

export default App;
