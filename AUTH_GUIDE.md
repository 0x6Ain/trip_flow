# 인증 시스템 가이드

httpOnly Cookie 기반 JWT 인증 시스템 구현 가이드입니다.

## 🔐 보안 방식

- **Access Token**: httpOnly Cookie (15분)
- **Refresh Token**: httpOnly Cookie (7일)
- **CSRF 방어**: SameSite=Lax
- **XSS 방어**: httpOnly로 JavaScript 접근 차단

## 🚀 백엔드 API

### 1. 회원가입

```bash
POST /api/auth/register/
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "strongpassword123",
  "password_confirm": "strongpassword123",
  "first_name": "홍",
  "last_name": "길동"
}
```

**응답:**
```json
{
  "message": "회원가입이 완료되었습니다.",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "홍",
    "last_name": "길동",
    "date_joined": "2024-01-31T10:00:00Z"
  }
}
```

### 2. 로그인

```bash
POST /api/auth/login/
Content-Type: application/json

{
  "username": "testuser",
  "password": "strongpassword123"
}
```

**응답:**
```json
{
  "message": "로그인 성공",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**쿠키 설정:**
- `accessToken`: 15분 유효
- `refreshToken`: 7일 유효

### 3. 로그아웃

```bash
POST /api/auth/logout/
Cookie: accessToken=...; refreshToken=...
```

**응답:**
```json
{
  "message": "로그아웃되었습니다."
}
```

### 4. 토큰 갱신

```bash
POST /api/auth/refresh/
Cookie: refreshToken=...
```

**응답:**
```json
{
  "message": "토큰이 갱신되었습니다."
}
```

**쿠키 갱신:**
- 새로운 `accessToken` 발급

### 5. 현재 사용자 정보

```bash
GET /api/auth/me/
Cookie: accessToken=...
```

**응답:**
```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

## 💻 프론트엔드 사용법

### 1. 로그인

```typescript
import { login } from "@/services/api/authApi";
import { useAuthStore } from "@/stores/authStore";

const handleLogin = async () => {
  try {
    const response = await login({
      username: "testuser",
      password: "password123"
    });
    
    // 사용자 정보 저장
    useAuthStore.getState().setUser(response.user);
    
    // 쿠키는 자동으로 설정됨
    console.log("로그인 성공!");
  } catch (error) {
    console.error("로그인 실패:", error);
  }
};
```

### 2. 로그아웃

```typescript
import { logout } from "@/services/api/authApi";
import { useAuthStore } from "@/stores/authStore";

const handleLogout = async () => {
  try {
    await logout();
    useAuthStore.getState().clearAuth();
    console.log("로그아웃 성공!");
  } catch (error) {
    console.error("로그아웃 실패:", error);
  }
};
```

### 3. 자동 토큰 갱신

API Client에 인터셉터가 설정되어 있어 자동으로 처리됩니다:

```typescript
// 401 에러 발생 시 자동으로 토큰 갱신 시도
// 갱신 성공 시 원래 요청 재시도
// 갱신 실패 시 로그인 페이지로 리다이렉트
```

### 4. 인증이 필요한 API 호출

```typescript
import { apiClient } from "@/services/api";

// 쿠키가 자동으로 전송되므로 별도 설정 불필요
const response = await apiClient.get("/trips/");
```

## 🔧 설정

### 백엔드 환경변수

```bash
# .env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 프론트엔드 환경변수

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_MAPS_API_KEY=your-api-key
```

## 🧪 테스트

### cURL 예제

```bash
# 로그인
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' \
  -c cookies.txt

# 인증이 필요한 API 호출
curl -X GET http://localhost:8000/api/auth/me/ \
  -b cookies.txt

# 로그아웃
curl -X POST http://localhost:8000/api/auth/logout/ \
  -b cookies.txt
```

## 📚 보안 고려사항

### ✅ 구현된 보안 기능

1. **httpOnly Cookie**: JavaScript에서 접근 불가
2. **Secure Flag**: HTTPS에서만 전송 (Production)
3. **SameSite=Lax**: CSRF 공격 방어
4. **짧은 Access Token 수명**: 15분
5. **자동 토큰 갱신**: 사용자 경험 개선

### ⚠️ 추가 권장사항

1. **HTTPS 사용**: Production 환경에서 필수
2. **Rate Limiting**: 로그인 시도 제한
3. **강력한 비밀번호**: Django의 password validation 사용
4. **2FA**: 추가 보안 레이어 (선택사항)

## 🐛 트러블슈팅

### 쿠키가 전송되지 않는 경우

1. `withCredentials: true` 확인
2. CORS 설정에 `CORS_ALLOW_CREDENTIALS = True` 확인
3. `CORS_ALLOWED_ORIGINS`에 프론트엔드 URL 포함 확인

### 토큰 갱신 실패

1. Refresh token 만료 확인 (7일)
2. 브라우저 쿠키 확인
3. 네트워크 탭에서 쿠키 전송 확인

### 401 에러 무한 루프

1. `/auth/refresh/` 엔드포인트 제외 확인
2. `originalRequest._retry` 플래그 확인

## 📝 다음 단계

- [ ] Trip API에 인증 적용
- [ ] 소유자 기반 데이터 필터링
- [ ] 공유 기능 구현
- [ ] 권한 관리 (읽기 전용 vs 편집 가능)
