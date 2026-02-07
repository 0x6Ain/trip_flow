import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { applyActionCode } from "firebase/auth";
import { syncEmailVerification, getCurrentUser } from "../services/api/authApi";
import { useAuthStore } from "../stores/authStore";

export const EmailVerificationCompletePage = () => {
  const navigate = useNavigate();
  const { setUser, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get("oobCode");

        if (!oobCode) {
          setStatus("error");
          setMessage("유효하지 않은 링크입니다.");
          return;
        }

        // Firebase에서 이메일 인증 적용
        await applyActionCode(auth, oobCode);

        // Firebase 사용자 정보 새로고침
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          await firebaseUser.reload();

          // 로그인된 사용자라면 백엔드에 이메일 인증 상태 동기화
          if (isAuthenticated && firebaseUser.emailVerified) {
            const idToken = await firebaseUser.getIdToken();

            await syncEmailVerification(idToken);

            // 사용자 정보 업데이트
            const user = await getCurrentUser();
            setUser(user);

            setStatus("success");
            setMessage("이메일 인증이 완료되었습니다! 잠시 후 홈으로 이동합니다.");

            setTimeout(() => {
              navigate("/");
            }, 2000);
          } else {
            // 로그인하지 않은 경우 로그인 페이지로
            setStatus("success");
            setMessage("이메일 인증이 완료되었습니다! 이제 로그인할 수 있습니다.");

            setTimeout(() => {
              navigate("/login?verified=true");
            }, 3000);
          }
        } else {
          // Firebase 사용자가 없는 경우
          setStatus("success");
          setMessage("이메일 인증이 완료되었습니다! 이제 로그인할 수 있습니다.");

          setTimeout(() => {
            navigate("/login?verified=true");
          }, 3000);
        }
      } catch (error: any) {
        console.error("이메일 인증 실패:", error);

        if (error.code === "auth/invalid-action-code") {
          setStatus("error");
          setMessage("인증 링크가 만료되었거나 이미 사용되었습니다.");
        } else {
          setStatus("error");
          setMessage(error.message || "인증에 실패했습니다.");
        }
      }
    };

    handleEmailVerification();
  }, [navigate, isAuthenticated, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg">
        {/* Icon */}
        <div className="flex justify-center">
          {status === "loading" && (
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === "success" && (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {status === "loading" && "이메일 인증 확인 중..."}
            {status === "success" && "이메일 인증 완료!"}
            {status === "error" && "인증 실패"}
          </h2>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`text-center p-4 rounded ${
              status === "success"
                ? "bg-green-50 text-green-800"
                : status === "error"
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Actions */}
        {status === "success" && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              {message.includes("홈으로")
                ? "잠시 후 홈으로 이동합니다..."
                : "잠시 후 로그인 페이지로 이동합니다..."}
            </p>
            <button
              onClick={() =>
                navigate(message.includes("홈으로") ? "/" : "/login")
              }
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              {message.includes("홈으로")
                ? "지금 홈으로 가기 →"
                : "지금 로그인하기 →"}
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              로그인 페이지로 이동
            </button>
            <button
              onClick={() => navigate("/register")}
              className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-900"
            >
              다시 회원가입하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
