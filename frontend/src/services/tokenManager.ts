/**
 * Token Manager - Access Token을 메모리에만 저장
 *
 * Refresh Token은 HttpOnly Cookie에 저장되므로 여기서 관리하지 않음
 * 새로고침 시 Access Token이 사라지지만, Cookie의 Refresh Token으로 자동 재발급
 */

let accessToken: string | null = null;

export const tokenManager = {
  /**
   * Access Token 설정
   */
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },

  /**
   * Access Token 가져오기
   */
  getAccessToken: (): string | null => {
    return accessToken;
  },

  /**
   * Access Token 제거
   */
  clearAccessToken: () => {
    accessToken = null;
  },

  /**
   * Access Token 존재 여부 확인
   */
  hasAccessToken: (): boolean => {
    return !!accessToken;
  },
};
