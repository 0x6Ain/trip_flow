# 인증 시스템 빠른 시작

httpOnly Cookie 기반 인증 시스템을 빠르게 실행하는 가이드입니다.

## 🚀 1단계: 백엔드 설정

### 패키지 설치

```bash
cd backend

# 가상환경 활성화 (예: virtualenv, venv, pipenv 등)
# workon trip_flow  # virtualenvwrapper 사용 시
# source venv/bin/activate  # venv 사용 시

# 패키지 설치 (PyJWT 포함)
pip install -r requirements.txt
```

### 데이터베이스 마이그레이션

```bash
# 마이그레이션 생성 (users 앱 추가됨)
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate

# 슈퍼유저 생성 (선택사항)
python manage.py createsuperuser
```

### 서버 실행

```bash
python manage.py runserver
```

백엔드가 `http://localhost:8000`에서 실행됩니다.

## 🎨 2단계: 프론트엔드 설정

### 패키지 설치

```bash
cd frontend

# 패키지 설치
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

프론트엔드가 `http://localhost:5173`에서 실행됩니다.

## ✅ 3단계: 테스트

### 1. 회원가입

1. 브라우저에서 `http://localhost:5173` 접속
2. "회원가입" 버튼 클릭
3. 정보 입력 후 가입
4. 자동으로 로그인됨

### 2. 로그인 확인

홈페이지 우측 상단에 "안녕하세요, [사용자명]님" 표시 확인

### 3. 쿠키 확인 (개발자 도구)

1. F12 (개발자 도구) 열기
2. Application → Cookies → `http://localhost:5173`
3. `accessToken`과 `refreshToken` 확인
4. `HttpOnly` 플래그 확인

### 4. API 테스트

#### 현재 사용자 정보 조회

```bash
curl http://localhost:8000/api/auth/me/ \
  -H "Cookie: accessToken=YOUR_TOKEN_HERE"
```

또는 브라우저 콘솔에서:

```javascript
fetch('http://localhost:8000/api/auth/me/', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## 🔍 4단계: 자동 토큰 갱신 테스트

### 방법 1: 브라우저 콘솔

```javascript
// 15분 후 자동으로 토큰이 갱신되는지 확인
// API 호출 시 401 에러가 발생하면 자동으로 refresh 후 재시도

fetch('http://localhost:8000/api/trips/', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

### 방법 2: Access Token 만료 강제

1. 개발자 도구 → Application → Cookies
2. `accessToken` 삭제
3. 아무 API 호출
4. 자동으로 refresh 후 재시도되는지 확인

## 📊 5단계: 네트워크 확인

### Chrome DevTools

1. F12 → Network 탭
2. 로그인 요청 확인
3. Response Headers에서 `Set-Cookie` 확인:
   ```
   Set-Cookie: accessToken=...; Max-Age=900; HttpOnly; SameSite=Lax
   Set-Cookie: refreshToken=...; Max-Age=604800; HttpOnly; SameSite=Lax
   ```

## 🐛 문제 해결

### 쿠키가 설정되지 않는 경우

**증상**: 로그인 성공하지만 쿠키가 없음

**해결책**:
1. 백엔드 CORS 설정 확인:
   ```python
   # backend/config/settings.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",  # Vite 포트
   ]
   CORS_ALLOW_CREDENTIALS = True
   ```

2. 프론트엔드 API client 설정 확인:
   ```typescript
   // frontend/src/services/api.ts
   export const apiClient = axios.create({
     withCredentials: true,  // 필수!
   });
   ```

### 401 Unauthorized 에러

**증상**: 모든 API 호출에서 401 에러

**해결책**:
1. 쿠키 확인 (위 참고)
2. 백엔드 로그 확인:
   ```bash
   python manage.py runserver
   # 요청 로그에서 쿠키 전송 여부 확인
   ```

### CSRF 에러

**증상**: CSRF verification failed

**해결책**:
인증 API는 CSRF 토큰 불필요 (httpOnly Cookie 사용)
만약 에러 발생 시:
```python
# backend/apps/users/views.py
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    ...
```

## 🎯 다음 단계

인증 시스템이 정상 작동하면:

1. **Trip 저장 기능 추가**
   - 로그인 사용자만 서버에 저장
   - Guest는 로컬에만 저장

2. **소유자 필터링**
   - 자신의 Trip만 조회 가능

3. **공유 기능**
   - 공유 링크 생성
   - 읽기 전용 접근

자세한 내용은 `AUTH_GUIDE.md`를 참고하세요!
