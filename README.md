# Trip Flow

스마트한 여행 루트 계획 서비스 - MVP

## 개요

Trip Flow는 해외 여행 계획을 위한 웹 애플리케이션입니다. Google Maps API를 활용하여 장소들의 최적 루트를 제안하고 시각화합니다.

### 핵심 기능

- ✅ 장소 추가 및 지도 시각화
- ✅ 드래그 앤 드롭으로 순서 변경
- ✅ AI 루트 최적화 제안 (Nearest Neighbor + 2-opt)
- ✅ 총 소요시간 및 거리 표시
- ✅ 링크로 여행 공유
- ✅ 로그인 없이 전체 사용 가능 (Guest mode)

## 기술 스택

### Frontend
- **React 19** + **TypeScript**
- **Vite** - 빌드 도구
- **Tailwind CSS v4** - 스타일링
- **Zustand** - 상태 관리
- **React Router** - 라우팅
- **Google Maps API** - 지도/장소/루트
- **@dnd-kit** - 드래그 앤 드롭
- **pnpm** + **volta** - 패키지 관리

### Backend
- **Django 5.1** + **Python 3.12**
- **Django REST Framework**
- **PostgreSQL**

## 프로젝트 구조

```
trip_flow/
├── frontend/          # React 프론트엔드
│   ├── src/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── pages/        # 페이지
│   │   ├── services/     # API 서비스
│   │   ├── stores/       # 상태 관리
│   │   ├── types/        # TypeScript 타입
│   │   └── utils/        # 유틸리티
│   └── package.json
├── backend/           # Django 백엔드
│   ├── apps/
│   │   ├── trips/        # Trip 도메인
│   │   ├── places/       # Place 도메인
│   │   └── routes/       # Route 계산
│   ├── config/           # Django 설정
│   └── requirements.txt
└── docs/              # 문서
    ├── spec.md           # MVP 스펙
    ├── schema.dbml       # DB 스키마
    └── api-spec.md       # API 문서
```

## 시작하기

### 필수 요구사항

- Node.js 20+ (volta 사용 권장)
- pnpm 9+
- Python 3.12+
- PostgreSQL 14+
- Google Maps API Key

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/trip_flow.git
cd trip_flow
```

### 2. Frontend 설정

```bash
cd frontend

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 VITE_GOOGLE_MAPS_API_KEY 설정

# 개발 서버 실행
pnpm dev
```

Frontend는 http://localhost:5173 에서 실행됩니다.

### 3. Backend 설정

```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 DATABASE_URL 등 설정

# 마이그레이션
python manage.py migrate

# 개발 서버 실행
python manage.py runserver
```

Backend는 http://localhost:8000 에서 실행됩니다.

## Google Maps API 설정

### API 활성화

Google Cloud Console에서 다음 API를 활성화하세요:

1. **Maps JavaScript API**
2. **Places API** (Text Search, Place Details)
3. **Directions API**

### API 키 생성 및 제한

1. Google Cloud Console > "사용자 인증 정보" > "API 키 만들기"
2. API 키 제한 설정:
   - **애플리케이션 제한사항**: HTTP 리퍼러
   - **API 제한사항**: Maps JavaScript API, Places API, Directions API

### 비용 최적화

- **RouteCache**: 동일 구간 재계산 방지
- **Session Token**: Autocomplete 요청 최적화
- **최적화 제한**: Guest는 하루 3회 제한

예상 비용: 사용자당 $0.60~$1.70 (일반~파워 유저)

## 개발 가이드

### 디렉토리 구조 규칙

```
frontend/src/
  components/     # 재사용 가능한 UI 컴포넌트
    ComponentName/
      ComponentName.tsx
      index.ts (optional)
  pages/          # 라우트 페이지
    PageName.tsx
  services/       # API 클라이언트 및 외부 서비스
  stores/         # Zustand 상태 관리
  types/          # TypeScript 타입 정의
  utils/          # 유틸리티 함수
```

### 코드 스타일

```bash
# Frontend
cd frontend
pnpm lint          # ESLint 검사
pnpm type-check    # TypeScript 타입 체크

# Backend
cd backend
black .            # 코드 포맷팅
flake8            # Linting
```

## 배포

### Frontend (Vercel)

```bash
cd frontend
pnpm build
# dist/ 폴더를 Vercel에 배포
```

### Backend (Railway / Heroku)

```bash
cd backend
# requirements.txt 확인
# 환경 변수 설정
# PostgreSQL 데이터베이스 연결
```

## MVP 완료 기준

- [x] 프로젝트 구조 설정
- [x] 타입 정의 및 스토어 구현
- [x] 지도 및 장소 검색 UI
- [x] 드래그 앤 드롭 장소 순서 변경
- [x] 루트 최적화 알고리즘
- [x] 공유 기능 (백엔드 연동)
  - UUID 기반 공유 링크
  - 카카오톡, Facebook, Instagram 공유
  - QR 코드 생성
  - 로그인 없이 조회 가능
- [ ] E2E 테스트
- [ ] 배포

## 라이선스

MIT

## 기여

이슈 및 PR을 환영합니다!

## 문서

- [MVP Spec](./docs/spec.md) - 상세 기능 명세
- [DB Schema](./docs/schema.dbml) - 데이터베이스 스키마
- [API Spec](./docs/api-spec.md) - REST API 문서
