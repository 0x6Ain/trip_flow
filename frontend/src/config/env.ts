/**
 * 환경 변수를 중앙에서 관리하는 설정 파일
 */

export const env = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
} as const;

/**
 * API 키가 설정되어 있는지 확인
 */
export const isGoogleMapsApiKeySet = () => {
  return env.googleMapsApiKey.length > 0;
};
