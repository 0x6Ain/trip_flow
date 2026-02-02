/**
 * Auth API 서비스 (Firebase + JWT)
 *
 * 주의:
 * - Access Token은 메모리에만 저장 (tokenManager)
 * - Refresh Token은 HttpOnly Cookie에 자동 저장
 */
import { apiClient } from "../api";
import { tokenManager } from "../tokenManager";
import type { User } from "../../stores/authStore";

export interface FirebaseRegisterRequest {
  provider: "email" | "google";
  token: string;
  email: string;
  name?: string;
  profileImage?: string;
}

export interface FirebaseLoginRequest {
  provider: "email" | "google";
  token: string;
}

export interface TokenResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
}

/**
 * Firebase 회원가입
 */
export const registerWithFirebase = async (
  data: FirebaseRegisterRequest
): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>("/auth/register/", data);
  return response.data;
};

/**
 * Firebase 로그인
 */
export const loginWithFirebase = async (
  data: FirebaseLoginRequest
): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>("/auth/login/", data);
  return response.data;
};

/**
 * Access Token 갱신
 * Refresh Token은 HttpOnly Cookie에서 자동으로 전송됨
 */
export const refreshAccessToken = async (): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>(
    "/auth/refresh/",
    {} // Body는 비워둠 - Cookie에서 자동으로 refresh token 전송됨
  );

  // 새 Access Token을 메모리에 저장
  tokenManager.setAccessToken(response.data.accessToken);

  return response.data;
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<{ user: User }>("/auth/me/");
  return response.data.user;
};

/**
 * 이메일 인증 상태 동기화
 */
export const syncEmailVerification = async (
  token: string
): Promise<{ message: string; email_verified: boolean }> => {
  const response = await apiClient.post<{
    message: string;
    email_verified: boolean;
  }>("/auth/sync-email-verification/", {
    token,
  });
  return response.data;
};

/**
 * 로그아웃
 * - Access Token 메모리에서 제거
 * - Refresh Token Cookie는 만료 처리 (백엔드에서)
 * - Firebase에서 로그아웃은 클라이언트에서 직접 처리
 */
export const logout = async (): Promise<void> => {
  // Access Token 메모리에서 제거
  tokenManager.clearAccessToken();

  // TODO: 백엔드에 로그아웃 API 추가 시 Cookie 만료 처리
  // await apiClient.post("/auth/logout/");
};
