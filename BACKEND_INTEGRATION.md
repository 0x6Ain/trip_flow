# 백엔드 통합 가이드

프론트엔드와 백엔드를 통합하기 위한 변경 사항 및 사용 가이드입니다.

## 📋 변경 요약

### 1. 백엔드 확장

- ✅ Trip 모델: `start_date`, `total_days` 필드 추가
- ✅ Place 모델: `day`, `visit_time`, `duration_min`, `cost`, `currency`, `memo` 필드 추가
- ✅ RouteSegment 모델: 새로 생성 (장소 간 이동 경로 저장)
- ✅ Serializer: 모든 새 필드 지원

### 2. 프론트엔드 API 레이어

- ✅ `/frontend/src/services/api/types.ts` - 백엔드 API 타입 정의
- ✅ `/frontend/src/services/api/tripApi.ts` - Trip API 호출 함수
- ✅ `/frontend/src/services/api/converter.ts` - 프론트엔드↔백엔드 데이터 변환
- ✅ `/frontend/src/config/env.ts` - API_BASE_URL 설정 추가

### 3. 스키마 업데이트

- ✅ `/docs/schema.dbml` - 최신 스키마로 업데이트

## 🚀 시작하기

### 1. 백엔드 설정

```bash
cd backend

# 가상환경 활성화
workon trip_flow

# 마이그레이션 실행
python manage.py makemigrations
python manage.py migrate

# 서버 실행
python manage.py runserver
```

### 2. 프론트엔드 설정

```bash
cd frontend

# 환경 변수 설정 (.env 파일)
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_API_BASE_URL=http://localhost:8000/api

# 개발 서버 실행
npm run dev
```

## 💡 사용 예시

### Trip 생성 및 저장

```typescript
import { createTrip, addPlace, saveRouteSegment } from "@/services/api";
import { tripToApiTrip, apiTripToTrip } from "@/services/api/converter";

// 1. Trip 생성
const newTrip = await createTrip({
  title: "파리 여행",
  city: "Paris",
  startLocation: { lat: 48.8566, lng: 2.3522 },
});

// 2. Place 추가
const updatedTrip = await addPlace(newTrip.id!, {
  placeId: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
  name: "에펠탑",
  lat: 48.8584,
  lng: 2.2945,
  day: 1,
  visitTime: "09:00",
  durationMin: 120,
  cost: 30,
  currency: "EUR",
  memo: "사진 찍기",
});

// 3. RouteSegment 저장
await saveRouteSegment(updatedTrip.id!, {
  fromPlaceId: place1.id,
  toPlaceId: place2.id,
  travelMode: "DRIVING",
  durationMin: 20,
  distanceKm: 5.5,
  departureTime: "11:00",
});

// 4. 프론트엔드 Trip으로 변환
const frontendTrip = apiTripToTrip(updatedTrip);
```

### Zustand Store와 통합

```typescript
// tripStore.ts에서 사용 예시
import { createTrip, updatePlace } from "@/services/api";

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      // ... 기존 상태

      // 서버에 저장
      saveToServer: async () => {
        const trip = get().currentTrip;
        if (!trip) return;

        try {
          const apiTrip = await createTrip({
            title: trip.title,
            city: trip.city,
            startLocation: trip.cityLocation,
          });

          // 백엔드 Trip ID 저장
          set({
            currentTrip: {
              ...trip,
              id: apiTrip.id!.toString(),
            },
          });
        } catch (error) {
          console.error("Failed to save trip:", error);
        }
      },
    }),
    { name: "trip-storage" },
  ),
);
```

## 🔄 데이터 흐름

```
프론트엔드 (Zustand)
    ↓ 변환 (converter.ts)
API 레이어 (tripApi.ts)
    ↓ HTTP Request
백엔드 API (Django REST)
    ↓ Serializer
데이터베이스 (PostgreSQL)
```

## 📝 주요 타입 매핑

| 프론트엔드                 | 백엔드                       | 비고                                             |
| -------------------------- | ---------------------------- | ------------------------------------------------ |
| `Place.id` (string)        | `Place.id` (number)          | UUID → DB ID                                     |
| `Place.placeId`            | `Place.place_id`             | Google Places ID                                 |
| `RouteSegment.fromPlaceId` | `RouteSegment.from_place_id` | Google Place ID → DB Place ID                    |
| `TravelMode`               | `travel_mode`                | 동일한 값 (WALKING, TRANSIT, DRIVING, BICYCLING) |
| `visitTime` (HH:MM)        | `visit_time` (varchar)       | 시간 포맷 동일                                   |

## 🔧 다음 단계

1. **백엔드 Views 구현** - API 엔드포인트 로직 추가
2. **프론트엔드 Store 연동** - Zustand와 API 연결
3. **에러 핸들링** - API 오류 처리 로직 추가
4. **로딩 상태** - API 호출 중 로딩 표시
5. **테스트** - 통합 테스트 작성

## 📚 참고 문서

- [Backend API Documentation](http://localhost:8000/_d/swagger/)
- [Schema (DBML)](/docs/schema.dbml)
- [Migration Guide](/backend/MIGRATION_GUIDE.md)
- [Spec](/docs/spec.md)
