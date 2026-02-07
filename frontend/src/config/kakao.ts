export const initKakao = () => {
  if (typeof window === "undefined") return;
  
  // Kakao SDK가 로드되었는지 확인
  if (!window.Kakao) {
    console.warn("Kakao SDK가 로드되지 않았습니다.");
    return;
  }

  // 이미 초기화되었으면 중복 초기화 방지
  if (window.Kakao.isInitialized()) {
    return;
  }

  const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
  
  if (!kakaoAppKey) {
    console.warn("VITE_KAKAO_APP_KEY 환경 변수가 설정되지 않았습니다.");
    return;
  }

  try {
    window.Kakao.init(kakaoAppKey);
    console.log("✅ Kakao SDK 초기화 완료");
  } catch (error) {
    console.error("❌ Kakao SDK 초기화 실패:", error);
  }
};
