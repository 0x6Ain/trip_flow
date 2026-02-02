import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { tokenManager } from "./tokenManager";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // HttpOnly Cookie 전송 활성화 (Refresh Token용)
});

// Request interceptor - JWT 토큰 자동 포함 및 API 요청 로깅
apiClient.interceptors.request.use(
  (config) => {
    // JWT Access Token 추가 (메모리에서 가져옴)
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const timestamp = new Date().toLocaleTimeString();
    console.log(`🚀 [${timestamp}] API 요청:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params,
      hasAuth: !!accessToken,
    });
    return config;
  },
  (error) => {
    console.error("❌ API 요청 오류:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - 401 에러 시 자동 토큰 갱신
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`✅ [${timestamp}] API 응답:`, {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    const timestamp = new Date().toLocaleTimeString();
    const originalRequest = error.config;

    // 에러 로깅
    if (error.response) {
      // 서버가 응답을 반환한 경우 (4xx, 5xx)
      console.error(`❌ [${timestamp}] API 에러 응답:`, {
        method: originalRequest?.method?.toUpperCase(),
        url: originalRequest?.url,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // 요청은 전송되었지만 응답을 받지 못한 경우
      console.error(`❌ [${timestamp}] API 응답 없음:`, {
        method: originalRequest?.method?.toUpperCase(),
        url: originalRequest?.url,
        message: "서버로부터 응답을 받지 못했습니다.",
      });
    } else {
      // 요청 설정 중 오류가 발생한 경우
      console.error(`❌ [${timestamp}] API 요청 설정 오류:`, error.message);
    }

    // 401 에러이고, 재시도하지 않은 요청이며, refresh 엔드포인트가 아닌 경우
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh/") &&
      !originalRequest.url?.includes("/auth/login/")
    ) {
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token으로 새 access token 발급
        // Refresh Token은 HttpOnly Cookie에 있으므로 자동으로 전송됨
        console.log("🔄 토큰 갱신 시도 중... (Cookie의 Refresh Token 사용)");

        const response = await apiClient.post("/auth/refresh/", {});

        const newAccessToken = response.data.accessToken;

        // 새 Access Token을 메모리에 저장
        tokenManager.setAccessToken(newAccessToken);

        console.log("✅ 토큰 갱신 성공");

        processQueue(null);

        // 원래 요청에 새 토큰 적용
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 원래 요청 재시도
        console.log("🔄 원래 요청 재시도:", originalRequest.url);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("❌ 토큰 갱신 실패 - 로그아웃 처리");
        processQueue(refreshError, null);

        // Refresh 실패 시 로그아웃 처리
        tokenManager.clearAccessToken();
        useAuthStore.getState().clearAuth();

        // 로그인 페이지로 리다이렉트
        if (typeof window !== "undefined") {
          console.log("🔀 로그인 페이지로 리다이렉트");
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
