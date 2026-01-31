import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api/authApi";
import { useAuthStore } from "../stores/authStore";
import { useTripStore } from "../stores/tripStore";

export const LoginPage = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const migrateGuestTrips = useTripStore((state) => state.migrateGuestTrips);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(formData);
      setUser(response.user);
      
      // 로그인 성공 후 게스트 여행 마이그레이션
      setMigrating(true);
      try {
        const result = await migrateGuestTrips();
        if (result.success > 0) {
          console.log(`✅ ${result.success}개의 여행을 서버로 마이그레이션했습니다.`);
        }
        if (result.failed > 0) {
          console.warn(`⚠️ ${result.failed}개의 여행 마이그레이션에 실패했습니다.`);
        }
      } catch (migrateError) {
        console.error("마이그레이션 중 오류 발생:", migrateError);
        // 마이그레이션 실패해도 로그인은 성공으로 처리
      } finally {
        setMigrating(false);
      }
      
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "로그인에 실패했습니다.");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 pt-20">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">로그인</h2>
          <p className="mt-2 text-sm text-gray-600">
            여행 계획을 저장하고 관리하세요
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                아이디
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="아이디를 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || migrating}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrating ? "여행 데이터 동기화 중..." : loading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">계정이 없으신가요? </span>
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              회원가입
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
