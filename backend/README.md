# Trip Flow Backend API

Django REST Framework 기반의 여행 계획 API 서버입니다.

## 📋 기술 스택

- **Framework**: Django 5.0.1, Django REST Framework 3.14.0
- **Database**: PostgreSQL
- **External APIs**: Google Maps API (Places, Directions)

## 🚀 설치 및 실행

### 1. 환경 설정

# 가상환경 생성
mkvirtualenv trip_flow

# 가상환경 활성화 (이후 사용시)
workon trip_flow

# 가상환경 비활성화
deactivate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

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

### 3. PostgreSQL 설정

```bash
# PostgreSQL 설치 (macOS)
brew install postgresql@16
brew services start postgresql@16

# 데이터베이스 생성
psql postgres
CREATE DATABASE trip_flow;
\q
```

### 4. 데이터베이스 마이그레이션

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. 관리자 계정 생성 (선택사항)

```bash
python manage.py createsuperuser
```

### 6. 서버 실행

```bash
python manage.py runserver
```

서버는 `http://localhost:8000`에서 실행됩니다.

### Base URL
- Development: `http://localhost:8000/api`

### API 문서
- **Swagger UI**: `http://localhost:8000/_d/swagger/`
- **ReDoc**: `http://localhost:8000/_d/redoc/`
- **Admin**: `http://localhost:8000/_a/`

## 🗄️ 데이터베이스 스키마

스키마 정보는 `/docs/schema.dbml`을 참고하세요.

### 주요 테이블
- `trips` - 여행 계획
- `places` - 여행지 장소
- `route_cache` - 루트 캐시
```

## 🧪 테스트

```bash
# 모든 테스트 실행
python manage.py test

# 특정 앱 테스트
python manage.py test trips
python manage.py test places
python manage.py test routes
```