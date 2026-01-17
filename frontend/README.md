# Trip Flow - Frontend

React + TypeScript + Vite로 구축된 Trip Flow MVP 프론트엔드입니다.

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS v4** - 스타일링
- **Zustand** - 상태 관리
- **React Router** - 라우팅
- **Google Maps API** - 지도 및 장소 검색
- **@dnd-kit** - 드래그 앤 드롭

## 시작하기

### 1. 환경 변수 설정

`.env` 파일을 생성하고 Google Maps API 키를 설정합니다:

```bash
cp .env.example .env
```

`.env` 파일:
```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_API_BASE_URL=http://localhost:8000/api
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── Map/            # 지도 관련 컴포넌트
│   ├── PlaceList/      # 장소 리스트 (드래그 앤 드롭)
│   ├── PlaceSearch/    # 장소 검색
│   ├── RouteSummary/   # 루트 요약 정보
│   └── OptimizationButton/ # 최적화 버튼
├── pages/              # 페이지 컴포넌트
│   ├── HomePage.tsx    # 여행 생성 페이지
│   ├── TripPlanPage.tsx # 메인 여행 계획 페이지
│   └── SharedTripPage.tsx # 공유된 여행 보기
├── services/           # API 서비스
│   ├── api.ts          # Axios 클라이언트
│   ├── tripService.ts  # Trip API
│   └── googleMapsService.ts # Google Maps API
├── stores/             # Zustand 스토어
│   └── tripStore.ts    # Trip 상태 관리
├── types/              # TypeScript 타입
│   └── trip.ts         # Trip 도메인 타입
├── utils/              # 유틸리티
│   └── optimization.ts # 루트 최적화 알고리즘
├── App.tsx             # 메인 앱 컴포넌트
├── main.tsx            # 엔트리 포인트
└── index.css           # 글로벌 스타일
```

## 주요 기능

### 1. 여행 생성
- 여행 제목, 도시, 시작 위치 설정
- 프리셋 도시 선택 가능

### 2. 장소 추가
- Google Places API를 통한 장소 검색
- 최대 10개 장소 추가 가능
- 중복 장소 방지

### 3. 지도 시각화
- Google Maps로 장소 시각화
- 순서대로 번호가 매겨진 마커
- Polyline으로 루트 표시

### 4. 드래그 앤 드롭
- 장소 순서를 드래그로 변경
- 실시간 루트 재계산

### 5. 루트 최적화
- Nearest Neighbor + 2-opt 알고리즘
- 최적화 제안 및 적용

### 6. LocalStorage 저장
- Guest 사용자는 LocalStorage에 자동 저장
- 새로고침 시에도 데이터 유지

### 7. 공유 (예정)
- 서버에 Trip 저장
- Read-only 공유 링크 생성

## Google Maps API 설정

### 필요한 API

1. **Maps JavaScript API**
2. **Places API** (Text Search, Place Details)
3. **Directions API**

### API 키 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. "API 및 서비스" > "라이브러리"에서 위 API 활성화
4. "사용자 인증 정보"에서 API 키 생성
5. API 키 제한 설정 (권장):
   - HTTP 리퍼러 제한
   - API 제한: Maps JavaScript API, Places API, Directions API

## 빌드

```bash
pnpm build
```

빌드 결과는 `dist/` 디렉토리에 생성됩니다.

## 프리뷰

```bash
pnpm preview
```

## 개발 가이드

### 새 컴포넌트 추가

```typescript
// src/components/MyComponent/MyComponent.tsx
interface MyComponentProps {
  // props 정의
}

export const MyComponent = ({ }: MyComponentProps) => {
  return <div>My Component</div>;
};
```

### 상태 관리 (Zustand)

```typescript
// stores/myStore.ts
import { create } from 'zustand';

interface MyState {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// 컴포넌트에서 사용
const { count, increment } = useMyStore();
```

### API 호출

```typescript
// services/myService.ts
import { apiClient } from './api';

export const myService = {
  getData: async () => {
    const response = await apiClient.get('/endpoint');
    return response.data;
  },
};
```

## 트러블슈팅

### Google Maps API 키 오류

- `.env` 파일이 제대로 설정되었는지 확인
- API 키가 활성화되었는지 확인
- API 키 제한 설정 확인

### LocalStorage 데이터 초기화

```javascript
// 브라우저 콘솔에서
localStorage.removeItem('trip-storage');
```

## 라이선스

MIT
