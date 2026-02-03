/**
 * 환경 변수를 중앙에서 관리하는 설정 파일
 */

export const env = {
  // Google Maps
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  
  // API
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  
  // Firebase
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  },
} as const;

/**
 * Google Maps API 키가 설정되어 있는지 확인
 */
export const isGoogleMapsApiKeySet = () => {
  return env.googleMapsApiKey.length > 0;
};

/**
 * API Base URL이 설정되어 있는지 확인
 */
export const isApiBaseUrlSet = () => {
  return env.apiBaseUrl.length > 0;
};

/**
 * Firebase가 설정되어 있는지 확인
 */
export const isFirebaseConfigured = () => {
  return !!(
    env.firebase.apiKey &&
    env.firebase.authDomain &&
    env.firebase.projectId
  );
};
