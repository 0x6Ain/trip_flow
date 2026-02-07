import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import { tokenManager } from "./tokenManager";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // httpOnly 쿠키 전송 활성화
});

// Request interceptor - JWT 토큰 자동 포함 및 API 요청 로깅
apiClient.interceptors.request.use(
  (config) => {
    // JWT Access Token 추가
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403 에러 처리 - 로그인 필요 메시지 추가
    if (error.response?.status === 403) {
      // 403 에러에 사용자 친화적인 메시지 추가
      error.userMessage = "해당 기능을 이용하려면 로그인이 필요합니다.";
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
        // Refresh token으로 새 access token 발급 (쿠키로 자동 전송)
        const response = await apiClient.post("/auth/refresh/");

        const newAccessToken = response.data.accessToken;

        // 새 토큰 저장
        tokenManager.setAccessToken(newAccessToken);

        processQueue(null);

        // 원래 요청에 새 토큰 적용
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 원래 요청 재시도
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh 실패 시 로그아웃 처리
        useAuthStore.getState().clearAuth();

        // 로그인 페이지로 리다이렉트
        if (typeof window !== "undefined") {
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
