/**
 * Auth API 서비스
 */
import { apiClient } from "../api";
import type { User } from "../../stores/authStore";

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

/**
 * 회원가입
 */
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/register/", data);
  return response.data;
};

/**
 * 로그인
 */
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/login/", data);
  return response.data;
};

/**
 * 로그아웃
 */
export const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout/");
};

/**
 * 토큰 갱신
 */
export const refreshToken = async (): Promise<void> => {
  await apiClient.post("/auth/refresh/");
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<{ user: User }>("/auth/me/");
  return response.data.user;
};
