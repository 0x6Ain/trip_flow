import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginWithFirebase, getCurrentUser } from "../services/api/authApi";
import {
  signInWithEmail,
  signInWithGoogle,
  resendVerificationEmail,
} from "../services/firebaseAuthService";
import { useAuthStore } from "../stores/authStore";
import { useTripStore } from "../stores/tripStore";
import { tokenManager } from "../services/tokenManager";
import { GradientButton } from "../components/GradientButton/GradientButton";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const migrateGuestTrips = useTripStore((state) => state.migrateGuestTrips);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // 이메일 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Firebase로 로그인
      const firebaseUser = await signInWithEmail(
        formData.email,
        formData.password,
      );

      // 2. Firebase ID Token 획득
      const idToken = await firebaseUser.getIdToken();

      // 3. 백엔드로 Firebase 토큰 전송하여 JWT 토큰 획득
      const response = await loginWithFirebase({
        provider: "email",
        token: idToken,
      });

      // 4. Access Token을 메모리에 저장 (Refresh Token은 Cookie에 자동 저장됨)
      tokenManager.setAccessToken(response.accessToken);

      // 5. 사용자 정보 조회
      const user = await getCurrentUser();

      // 6. 백엔드 DB의 이메일 인증 상태 확인 (Firebase가 아닌 백엔드 값 사용)
      if (!user.email_verified) {
        setUnverifiedEmail(formData.email);
        setShowEmailVerification(true);
        setLoading(false);
        return;
      }

      setUser(user);

      // 7. 게스트 여행 마이그레이션
      setMigrating(true);
      try {
        const result = await migrateGuestTrips();
        if (result.success > 0) {
          // Migration successful
        }
        if (result.failed > 0) {
          console.warn(
            `⚠️ ${result.failed}개의 여행 마이그레이션에 실패했습니다.`,
          );
        }
      } catch (migrateError) {
        console.error("마이그레이션 중 오류 발생:", migrateError);
      } finally {
        setMigrating(false);
      }

      navigate("/");
    } catch (err: any) {
      console.error("로그인 오류:", err);
      setError(
        err.response?.data?.error || err.message || "로그인에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Google 로그인
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // 1. Firebase Google 로그인
      const firebaseUser = await signInWithGoogle();

      // 2. Firebase ID Token 획득
      const idToken = await firebaseUser.getIdToken();

      // 3. 백엔드로 Firebase 토큰 전송하여 JWT 토큰 획득
      const response = await loginWithFirebase({
        provider: "google",
        token: idToken,
      });

      // 4. Access Token을 메모리에 저장 (Refresh Token은 Cookie에 자동 저장됨)
      tokenManager.setAccessToken(response.accessToken);

      // 5. 사용자 정보 조회
      const user = await getCurrentUser();
      setUser(user);

      // 참고: Google 로그인은 이메일이 이미 인증되어 있으므로 email_verified 체크 생략

      // 6. 게스트 여행 마이그레이션
      setMigrating(true);
      try {
        const result = await migrateGuestTrips();
        if (result.success > 0) {
          // Migration successful
        }
        if (result.failed > 0) {
          console.warn(
            `⚠️ ${result.failed}개의 여행 마이그레이션에 실패했습니다.`,
          );
        }
      } catch (migrateError) {
        console.error("마이그레이션 중 오류 발생:", migrateError);
      } finally {
        setMigrating(false);
      }

      navigate("/");
    } catch (err: any) {
      console.error("Google 로그인 오류:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Google 로그인에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      await resendVerificationEmail();
      alert("인증 이메일을 다시 전송했습니다. 이메일을 확인해주세요.");
    } catch (err: any) {
      setError(err.message || "이메일 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 이메일 인증 대기 화면
  if (showEmailVerification) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 pt-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% -20%, #DBEAFE 0%, #EFF6FF 40%, #F9FAFB 100%)",
        }}
      >
        <div className="max-w-[480px] w-full bg-white p-12 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] flex flex-col items-center gap-8">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col items-center gap-2 w-full">
            <h2 className="text-[28px] font-bold text-gray-900">
              이메일 인증이 필요합니다
            </h2>
            <p className="text-sm text-gray-500">
              아직 이메일 인증을 완료하지 않으셨습니다
            </p>
          </div>

          {/* Message */}
          <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 px-5 py-4 rounded-xl">
            <p className="text-sm">
              <span className="font-semibold">{unverifiedEmail}</span>로 전송된
              인증 이메일을 확인해주세요.
            </p>
            <p className="text-sm mt-2">
              이메일의 인증 링크를 클릭한 후 다시 로그인해주세요.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-4">
            <GradientButton
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full h-[52px]"
              size="lg"
            >
              {loading ? "전송 중..." : "인증 이메일 다시 보내기"}
            </GradientButton>

            <button
              onClick={() => {
                setShowEmailVerification(false);
                setFormData({ email: "", password: "" });
                setError("");
              }}
              className="w-full flex justify-center py-3 text-sm text-gray-600 hover:text-gray-900"
            >
              다른 계정으로 로그인하기
            </button>
          </div>

          {/* Tips */}
          <div className="w-full border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-500 text-center">
              💡 이메일이 도착하지 않았나요?
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              스팸 메일함을 확인하거나 위 버튼으로 다시 전송해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 pt-20"
      style={{
        background:
          "radial-gradient(ellipse 80% 80% at 50% -20%, #DBEAFE 0%, #EFF6FF 40%, #F9FAFB 100%)",
      }}
    >
      <div className="max-w-[480px] w-full bg-white p-12 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] flex flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 w-full">
          <h2 className="text-[32px] font-bold text-gray-900">로그인</h2>
          <p className="text-sm text-gray-500">
            여행 계획을 저장하고 관리하세요
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form
          className="w-full flex flex-col gap-6"
          onSubmit={handleEmailLogin}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700"
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="email@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <GradientButton
              type="submit"
              disabled={loading || migrating}
              className="w-full h-[52px]"
              size="lg"
            >
              {migrating
                ? "여행 데이터 동기화 중..."
                : loading
                  ? "로그인 중..."
                  : "이메일로 로그인"}
            </GradientButton>

            {/* Divider */}
            <div className="flex items-center gap-3 h-5">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">또는</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || migrating}
              className="w-full h-[52px] flex items-center justify-center gap-3 rounded-lg text-base font-semibold text-gray-800 bg-white border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 w-full">
            <span className="text-sm text-gray-500">계정이 없으신가요?</span>
            <Link
              to="/register"
              className="text-sm font-semibold text-blue-500 hover:text-blue-600"
            >
              회원가입
            </Link>
          </div>

          <div className="flex justify-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
