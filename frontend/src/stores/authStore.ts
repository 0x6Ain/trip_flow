/**
 * 인증 상태 관리 Store
 *
 * 주의: Access Token은 메모리에만 저장 (tokenManager 사용)
 *       Refresh Token은 HttpOnly Cookie에 저장
 *       사용자 정보만 localStorage에 persist
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  profile_image?: string;
  oauth_provider?: string;
  providers?: string[]; // 연결된 모든 OAuth provider 목록
  email_verified?: boolean; // 이메일 인증 여부
  date_joined?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log("💾 localStorage 복원 완료:", {
          hasUser: !!state?.user,
          email: state?.user?.email,
        });
        state?.setHasHydrated(true);
      },
    }
  )
);
