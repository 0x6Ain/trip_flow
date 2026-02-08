import { useNavigate } from "react-router-dom";
import { GradientButton } from "../components/GradientButton/GradientButton";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 숫자 */}
        {/* <h1 className="text-8xl font-bold text-[#FF6B6B] mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          404
        </h1> */}

        {/* 제목 */}
        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          페이지를 찾을 수 없습니다
        </h2>

        {/* 설명 */}
        <p className="text-lg text-[#6B7280] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        {/* 홈으로 돌아가기 버튼 */}
        <GradientButton onClick={() => navigate("/")} className="px-8 py-4 text-base font-semibold rounded-[20px]">
          홈으로 돌아가기
        </GradientButton>

        {/* 일러스트 영역 */}
        <div className="mt-12">
          <div className="w-full max-w-[400px] h-[300px] mx-auto rounded-[20px] bg-[#F6F7F8] overflow-hidden">
            <img src="/404-illustration.png" alt="404 illustration" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};
