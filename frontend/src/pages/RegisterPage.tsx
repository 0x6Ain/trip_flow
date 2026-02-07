import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  registerWithFirebase,
  loginWithFirebase,
  getCurrentUser,
} from "../services/api/authApi";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from "../services/firebaseAuthService";
import { useAuthStore } from "../stores/authStore";
import { useTripStore } from "../stores/tripStore";
import { tokenManager } from "../services/tokenManager";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const migrateGuestTrips = useTripStore((state) => state.migrateGuestTrips);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // 이메일 회원가입
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    // 비밀번호 확인
    if (formData.password !== formData.password_confirm) {
      setErrors({ password_confirm: "비밀번호가 일치하지 않습니다." });
      setLoading(false);
      return;
    }

    try {
      let firebaseUser;
      let isNewUser = true;

      try {
        // 1. Firebase로 회원가입 시도 (인증 이메일 자동 전송)
        firebaseUser = await signUpWithEmail(formData.email, formData.password);
      } catch (signUpError: any) {
        // 이미 등록된 이메일인 경우 로그인 시도
        if (signUpError.code === "auth/email-already-in-use") {
          firebaseUser = await signInWithEmail(
            formData.email,
            formData.password
          );
          isNewUser = false;
        } else {
          throw signUpError;
        }
      }

      // 2. Firebase ID Token 획득
      const idToken = await firebaseUser.getIdToken();

      // 3. 백엔드로 Firebase 토큰 전송
      if (isNewUser) {
        // 새 사용자 - 백엔드에 회원가입 (이메일 인증 전)
        await registerWithFirebase({
          provider: "email",
          token: idToken,
          email: formData.email,
          name: formData.name || undefined,
        });

        // 이메일 인증 대기 화면 표시
        setRegisteredEmail(formData.email);
        setShowEmailVerification(true);
        setLoading(false);
        return; // 이메일 인증 후 로그인하도록 안내
      } else {
        // 기존 사용자 - 로그인 API 호출
        const response = await loginWithFirebase({
          provider: "email",
          token: idToken,
        });

        // 4. Access Token을 메모리에 저장 (Refresh Token은 Cookie에 자동 저장됨)
        tokenManager.setAccessToken(response.accessToken);

        // 5. 사용자 정보 조회
        const user = await getCurrentUser();
        setUser(user);

        // 6. 게스트 여행 마이그레이션
        setMigrating(true);
        try {
          const result = await migrateGuestTrips();
          if (result.success > 0) {
            // Migration successful
          }
          if (result.failed > 0) {
            console.warn(
              `⚠️ ${result.failed}개의 여행 마이그레이션에 실패했습니다.`
            );
          }
        } catch (migrateError) {
          console.error("마이그레이션 중 오류 발생:", migrateError);
        } finally {
          setMigrating(false);
        }

        navigate("/");
      }
    } catch (err: any) {
      console.error("회원가입 오류:", err);
      console.error("에러 응답 데이터:", err.response?.data);

      // Firebase 에러 메시지 처리
      if (err.code) {
        const firebaseErrors: Record<string, string> = {
          "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
          "auth/invalid-email": "유효하지 않은 이메일 형식입니다.",
          "auth/weak-password": "비밀번호는 최소 6자 이상이어야 합니다.",
          "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않습니다.",
        };
        setErrors({ general: firebaseErrors[err.code] || err.message });
      } else if (err.response?.data) {
        // 백엔드에서 반환한 에러가 객체인 경우
        if (typeof err.response.data === "object") {
          setErrors(err.response.data);
        } else {
          setErrors({ general: String(err.response.data) });
        }
      } else {
        setErrors({ general: err.message || "회원가입에 실패했습니다." });
      }
    } finally {
      setLoading(false);
    }
  };

  // Google 회원가입
  const handleGoogleRegister = async () => {
    setErrors({});
    setLoading(true);

    try {
      // 1. Firebase Google 로그인 (회원가입과 로그인이 동일)
      const firebaseUser = await signInWithGoogle();

      // 2. Firebase ID Token 획득
      const idToken = await firebaseUser.getIdToken();

      // 3. 백엔드로 Firebase 토큰 전송하여 JWT 토큰 획득
      // Google의 경우 먼저 회원가입 시도, 실패하면 로그인 시도
      let response;
      try {
        response = await registerWithFirebase({
          provider: "google",
          token: idToken,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || undefined,
          profileImage: firebaseUser.photoURL || undefined,
        });
      } catch (registerError: any) {
        // 이미 등록된 사용자인 경우 로그인 시도
        if (
          registerError.response?.status === 400 ||
          registerError.response?.data?.error?.includes("already exists")
        ) {
          response = await loginWithFirebase({
            provider: "google",
            token: idToken,
          });
        } else {
          throw registerError;
        }
      }

      // 4. Access Token을 메모리에 저장 (Refresh Token은 Cookie에 자동 저장됨)
      tokenManager.setAccessToken(response.accessToken);

      // 5. 사용자 정보 조회
      const user = await getCurrentUser();
      setUser(user);

      // 6. 게스트 여행 마이그레이션
      setMigrating(true);
      try {
        const result = await migrateGuestTrips();
        if (result.success > 0) {
          // Migration successful
        }
        if (result.failed > 0) {
          console.warn(
            `⚠️ ${result.failed}개의 여행 마이그레이션에 실패했습니다.`
          );
        }
      } catch (migrateError) {
        console.error("마이그레이션 중 오류 발생:", migrateError);
      } finally {
        setMigrating(false);
      }

      navigate("/");
    } catch (err: any) {
      console.error("Google 회원가입 오류:", err);
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({
          general: err.message || "Google 회원가입에 실패했습니다.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // 해당 필드의 에러 제거
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // 이메일 인증 대기 화면
  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-20 pb-12">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              이메일 인증이 필요합니다
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              회원가입이 완료되었습니다!
            </p>
          </div>

          {/* Message */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            <p className="text-sm">
              <span className="font-semibold">{registeredEmail}</span>로 인증
              이메일을 전송했습니다.
            </p>
            <p className="text-sm mt-2">
              이메일의 인증 링크를 클릭한 후 로그인해주세요.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              로그인 페이지로 이동
            </Link>

            <button
              onClick={() => {
                setShowEmailVerification(false);
                setFormData({
                  email: "",
                  password: "",
                  password_confirm: "",
                  name: "",
                });
              }}
              className="w-full flex justify-center py-2 px-4 text-sm text-gray-600 hover:text-gray-900"
            >
              다른 이메일로 다시 가입하기
            </button>
          </div>

          {/* Tips */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 text-center">
              💡 이메일이 도착하지 않았나요?
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              스팸 메일함을 확인하거나 몇 분 후 다시 시도해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-20 pb-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            여행 계획을 저장하고 관리하세요
          </p>
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {/* Register Form */}
        <form className="mt-8 space-y-4" onSubmit={handleEmailRegister}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              이메일 *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              이름
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호 *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="8자 이상 입력하세요"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password_confirm"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호 확인 *
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              value={formData.password_confirm}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.password_confirm ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="비밀번호를 다시 입력하세요"
            />
            {errors.password_confirm && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password_confirm}
              </p>
            )}
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading || migrating}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrating
                ? "여행 데이터 동기화 중..."
                : loading
                ? "가입 중..."
                : "이메일로 회원가입"}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>

            {/* Google Register Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading || migrating}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              Google로 회원가입
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">이미 계정이 있으신가요? </span>
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              로그인
            </Link>
          </div>

          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
