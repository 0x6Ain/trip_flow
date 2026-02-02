# Trip Flow Backend API

Django REST Framework 기반의 여행 계획 API 서버입니다.

## 📋 기술 스택

- **Framework**: Django 5.0.1, Django REST Framework 3.14.0
- **Database**: PostgreSQL
- **Authentication**: Firebase Authentication + JWT
- **External APIs**: 
  - Firebase Authentication (Email, Google OAuth)
  - Google Maps API (Places, Directions)

## 🚀 설치 및 실행

### 1. pyenv-virtualenv 설정 (권장)

pyenv와 pyenv-virtualenv 설치:
```bash
# Homebrew로 설치 (macOS)
brew install pyenv pyenv-virtualenv

# 또는 자동 설치 스크립트
curl https://pyenv.run | bash
```

환경 변수 설정 (`~/.zshrc` 또는 `~/.bashrc`에 추가):
```bash
# pyenv
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"

# pyenv-virtualenv
eval "$(pyenv virtualenv-init -)"
```

설정 후 터미널 재시작 또는:
```bash
source ~/.zshrc  # zsh 사용 시
source ~/.bashrc # bash 사용 시
```

Python 설치 및 가상환경 생성:
```bash
# Python 3.10.0 설치
pyenv install 3.10.0

# 가상환경 생성
pyenv virtualenv 3.10.0 trip-flow-backend

# 프로젝트 폴더에서 자동 활성화 설정
cd backend
pyenv local trip-flow-backend
# 이제 backend 폴더에 들어올 때마다 자동으로 활성화됩니다!
```

### 2. 패키지 설치

```bash
pip install -r requirements.txt
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_NAME=trip_flow
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

`.env.example`을 복사:
```bash
cp .env.example .env
# 그 후 .env 파일을 편집하여 실제 값 입력
```

### 4. PostgreSQL 설정

```bash
# PostgreSQL 설치 및 실행 (macOS)
brew install postgresql@16
brew services start postgresql@16

# 데이터베이스 생성
psql postgres -c "CREATE DATABASE trip_flow;"
```

### 5. 데이터베이스 마이그레이션

```bash
python manage.py migrate
python manage.py createcachetable
```

### 6. 관리자 계정 생성 (선택사항)

```bash
python manage.py createsuperuser
```

### 7. 서버 실행

```bash
python manage.py runserver
```

서버는 `http://localhost:8000`에서 실행됩니다.

## 📡 API 엔드포인트

### Base URL

- Development: `http://localhost:8000/api`

### API 문서

- **Swagger UI**: `http://localhost:8000/_d/swagger/`
  - 개발 환경 (DEBUG=True): 인증 불필요 ✅
  - 프로덕션 환경 (DEBUG=False): Admin 권한 필요 🔒
- **ReDoc**: `http://localhost:8000/_d/redoc/`
  - 동일한 권한 설정 적용
- **Admin**: `http://localhost:8000/_a/`

> **참고**: API 문서는 개발 환경에서는 자유롭게 접근 가능하지만, 프로덕션에서는 관리자만 접근할 수 있습니다.

### 주요 엔드포인트

#### 인증 (Firebase + JWT Hybrid)
- `POST /api/auth/register/` - 회원가입 (Email, Google) → JWT 발급
  - Body: `{ "provider": "email" | "google", "token": "<firebase_id_token>", "email": "...", "name": "..." }`
- `POST /api/auth/login/` - 로그인 (Email, Google) → JWT 발급
  - Body: `{ "provider": "email" | "google", "token": "<firebase_id_token>" }`
- `POST /api/auth/refresh/` - Refresh Token으로 Access Token 갱신
- `GET /api/auth/me/` - 현재 사용자 정보 (JWT 필요)

> **인증 방식**: Firebase Authentication 사용. 자세한 내용은 `AUTH_API_GUIDE.md` 참고

#### 여행 계획 (Trip)
- `GET /api/trips/` - 내 Trip 목록 조회
- `POST /api/trips/` - Trip 생성
- `GET /api/trips/{id}/` - Trip 상세 조회 (route_snapshot 포함)
- `PATCH /api/trips/{id}/` - Trip 수정
- `DELETE /api/trips/{id}/` - Trip 삭제

#### Trip 멤버 관리
- `GET /api/trips/{id}/members/` - 멤버 목록
- `POST /api/trips/{id}/invite-member/` - 멤버 초대
- `PATCH /api/trips/{id}/members/{user_id}/` - 멤버 역할 변경
- `DELETE /api/trips/{id}/members/{user_id}/` - 멤버 제거

#### 이벤트 (Event)
- `POST /api/trips/{trip_id}/events/` - Event 추가
- `PATCH /api/trips/{trip_id}/events/{event_id}/` - Event 수정
- `DELETE /api/trips/{trip_id}/events/{event_id}/` - Event 삭제
- `PATCH /api/trips/{trip_id}/events/reorder/` - Event 순서 변경

#### 경로
- `POST /api/trips/{trip_id}/routes/calculate/` - 경로 계산
- `POST /api/trips/{trip_id}/routes/optimize/` - 경로 최적화

## 🗄️ 데이터베이스 스키마

스키마 정보는 `/docs/schema.dbml`을 참고하세요.

### 주요 테이블

- `trips` - 여행 계획
- `places` - 여행지 장소
- `route_segments` - 경로 세그먼트
- `route_cache` - 루트 캐시

## 🔐 인증 시스템

JWT 토큰 기반 httpOnly Cookie 인증을 사용합니다.

- **Access Token**: 15분 (httpOnly Cookie)
- **Refresh Token**: 7일 (httpOnly Cookie)
- **보안**: XSS 방어 (httpOnly), CSRF 방어 (SameSite)

자세한 내용은 [AUTH_GUIDE.md](../AUTH_GUIDE.md)를 참고하세요.

## 🧪 테스트

```bash
# 모든 테스트 실행
python manage.py test

# 특정 앱 테스트
python manage.py test trips
python manage.py test places
python manage.py test routes
python manage.py test users
```

## 🐛 문제 해결

### pyenv 명령어를 찾을 수 없는 경우

**증상**: `pyenv: command not found`

**해결책**:
```bash
# 1. pyenv 설치 확인
which pyenv

# 2. 없으면 설치
brew install pyenv pyenv-virtualenv

# 3. 환경 변수 확인 (~/.zshrc 또는 ~/.bashrc)
cat ~/.zshrc | grep pyenv

# 4. 없으면 추가 (위의 "가상환경 설정" 섹션 참고)
# 5. 터미널 재시작 또는 source ~/.zshrc
```

### Python 버전이 올바르지 않은 경우

**증상**: `python --version`이 3.10.0이 아닌 다른 버전을 표시

**해결책**:
```bash
# 1. pyenv가 PATH에 있는지 확인
which python
# 출력: /Users/사용자명/.pyenv/shims/python 이어야 함

# 2. .python-version 파일 확인
cat .python-version
# 출력: 3.10.0 또는 trip-flow-backend

# 3. 가상환경 목록 확인
pyenv virtualenvs

# 4. 가상환경 재설정
pyenv local trip-flow-backend
```

### PostgreSQL 연결 오류

**증상**: `connection to server ... failed`

**해결책**:
```bash
# PostgreSQL 실행 확인
brew services list

# 실행되지 않은 경우
brew services start postgresql@16

# 연결 테스트
psql -U postgres -d trip_flow
```

### 마이그레이션 충돌

**증상**: `Conflicting migrations detected`

**해결책**:
```bash
# 마이그레이션 파일 삭제 (주의! 개발 환경에서만)
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

# 데이터베이스 초기화 (데이터 손실 주의!)
python manage.py flush

# 마이그레이션 재생성
python manage.py makemigrations
python manage.py migrate
```

### 패키지를 찾을 수 없는 오류

**증상**: `No module named 'jwt'` 또는 `No module named 'django'`

**해결책**:
```bash
# 가상환경이 활성화되어 있는지 확인
pyenv version  # trip-flow-backend가 나와야 함

# backend 폴더로 이동 (자동 활성화)
cd /path/to/trip_flow/backend

# 패키지 재설치
pip install -r requirements.txt
```


## 📚 추가 문서

- [AUTH_GUIDE.md](../AUTH_GUIDE.md) - 인증 시스템 상세 가이드
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 배포 가이드
