# 📋 API 명세서 (MVP v0.1)

## 1. 개요

### Base URL
```
Production: https://api.tripflow.app/api
Development: http://localhost:8000/api
```

### 인증
MVP에서는 로그인이 선택사항이므로, 인증 헤더는 옵셔널입니다.

```
Authorization: Bearer {token}  (Optional)
```

### 응답 형식
모든 API는 JSON 형식으로 응답합니다.

---

## 2. Trip API

### 2.1 Trip 생성
**POST** `/trips`

**Request Body**
```json
{
  "title": "도쿄 3일 여행",
  "city": "Tokyo, Japan",
  "startLocation": {
    "lat": 35.6762,
    "lng": 139.6503,
    "name": "나리타 공항"  // optional
  }
}
```

**Response** `201 Created`
```json
{
  "id": "abc123",
  "ownerType": "GUEST",
  "title": "도쿄 3일 여행",
  "city": "Tokyo, Japan",
  "startLocation": {
    "lat": 35.6762,
    "lng": 139.6503
  },
  "places": [],
  "routeSummary": {
    "totalDurationMin": 0,
    "totalDistanceKm": 0
  },
  "createdAt": "2026-01-17T10:30:00Z",
  "updatedAt": "2026-01-17T10:30:00Z",
  "expiresAt": null
}
```

**Notes**
- LocalStorage 우선 사용
- 서버 저장은 공유 시에만 필요

---

### 2.2 Trip 조회
**GET** `/trips/{tripId}`

**Response** `200 OK`
```json
{
  "id": "abc123",
  "ownerType": "GUEST",
  "title": "도쿄 3일 여행",
  "city": "Tokyo, Japan",
  "startLocation": {
    "lat": 35.6762,
    "lng": 139.6503
  },
  "places": [
    {
      "id": "p1",
      "placeId": "ChIJ...",
      "name": "센소지",
      "lat": 35.7148,
      "lng": 139.7967,
      "order": 1.0
    }
  ],
  "routeSummary": {
    "totalDurationMin": 180,
    "totalDistanceKm": 12.5
  },
  "createdAt": "2026-01-17T10:30:00Z",
  "updatedAt": "2026-01-17T10:35:00Z",
  "expiresAt": "2026-01-24T10:30:00Z"
}
```

**Error Cases**
- `404 Not Found`: Trip이 존재하지 않거나 만료됨
- `403 Forbidden`: 비공개 Trip에 접근 권한 없음

---

### 2.3 Trip 업데이트
**PATCH** `/trips/{tripId}`

**Request Body**
```json
{
  "title": "도쿄 4일 여행",  // optional
  "city": "Tokyo, Japan",   // optional
  "startLocation": {        // optional
    "lat": 35.6762,
    "lng": 139.6503
  }
}
```

**Response** `200 OK`
```json
{
  "id": "abc123",
  "title": "도쿄 4일 여행",
  ...
}
```

---

## 3. Place API

### 3.1 장소 검색 (Google Places)
**GET** `/places/search`

**Query Parameters**
- `query` (required): 검색어
- `location` (optional): `lat,lng` - 검색 중심 좌표
- `radius` (optional): 검색 반경 (미터)

**Example**
```
GET /places/search?query=센소지&location=35.6762,139.6503&radius=50000
```

**Response** `200 OK`
```json
{
  "results": [
    {
      "placeId": "ChIJ...",
      "name": "센소지",
      "formattedAddress": "2 Chome-3-1 Asakusa, Taito City, Tokyo",
      "location": {
        "lat": 35.7148,
        "lng": 139.7967
      },
      "types": ["tourist_attraction", "place_of_worship"],
      "rating": 4.5,
      "userRatingsTotal": 45000
    }
  ]
}
```

---

### 3.2 Trip에 장소 추가
**POST** `/trips/{tripId}/places`

**Request Body**
```json
{
  "placeId": "ChIJ...",
  "name": "센소지",
  "lat": 35.7148,
  "lng": 139.7967
}
```

**Response** `201 Created`
```json
{
  "id": "p1",
  "placeId": "ChIJ...",
  "name": "센소지",
  "lat": 35.7148,
  "lng": 139.7967,
  "order": 1.0
}
```

**Validation**
- 최대 10개 제한
- 중복 placeId 방지

**Error Cases**
- `400 Bad Request`: 
  - 이미 10개 장소가 있음
  - 중복된 placeId
- `404 Not Found`: Trip이 존재하지 않음

---

### 3.3 장소 순서 변경
**PATCH** `/trips/{tripId}/places/reorder`

**Request Body**
```json
{
  "places": [
    {
      "id": "p2",
      "order": 1.0
    },
    {
      "id": "p1",
      "order": 2.0
    },
    {
      "id": "p3",
      "order": 3.0
    }
  ]
}
```

**Response** `200 OK`
```json
{
  "places": [
    {
      "id": "p2",
      "placeId": "ChIJ...",
      "name": "도쿄 타워",
      "lat": 35.6586,
      "lng": 139.7454,
      "order": 1.0
    },
    ...
  ],
  "routeSummary": {
    "totalDurationMin": 165,
    "totalDistanceKm": 10.8
  }
}
```

**Notes**
- order는 float 값 사용 (중간 삽입 대비)
- 순서 변경 시 루트 자동 재계산

---

### 3.4 장소 삭제
**DELETE** `/trips/{tripId}/places/{placeId}`

**Response** `204 No Content`

---

## 4. Route API

### 4.1 루트 계산
**POST** `/trips/{tripId}/routes/calculate`

**Request Body**
```json
{
  "startLocation": {
    "lat": 35.6762,
    "lng": 139.6503
  },
  "places": [
    {
      "placeId": "ChIJ...",
      "lat": 35.7148,
      "lng": 139.7967
    },
    ...
  ]
}
```

**Response** `200 OK`
```json
{
  "routes": [
    {
      "fromPlaceId": "start",
      "toPlaceId": "ChIJ...",
      "durationMin": 45,
      "distanceKm": 15.3,
      "polyline": "encoded_polyline_string"
    },
    ...
  ],
  "summary": {
    "totalDurationMin": 180,
    "totalDistanceKm": 45.6
  }
}
```

**Notes**
- Google Directions API 사용
- 구간별(places[i] → places[i+1]) 요청
- 결과 캐싱 적용

---

### 4.2 루트 캐시 조회
**GET** `/routes/cache`

**Query Parameters**
- `fromPlaceId` (required)
- `toPlaceId` (required)

**Example**
```
GET /routes/cache?fromPlaceId=ChIJ1...&toPlaceId=ChIJ2...
```

**Response** `200 OK`
```json
{
  "fromPlaceId": "ChIJ1...",
  "toPlaceId": "ChIJ2...",
  "durationMin": 45,
  "distanceKm": 15.3,
  "polyline": "encoded_polyline_string",
  "cachedAt": "2026-01-17T10:30:00Z"
}
```

**Error Cases**
- `404 Not Found`: 캐시된 루트가 없음

---

## 5. Optimization API

### 5.1 루트 최적화 제안
**POST** `/trips/{tripId}/optimize`

**Request Body**
```json
{
  "startLocation": {
    "lat": 35.6762,
    "lng": 139.6503
  },
  "places": [
    {
      "id": "p1",
      "placeId": "ChIJ...",
      "lat": 35.7148,
      "lng": 139.7967
    },
    ...
  ]
}
```

**Response** `200 OK`
```json
{
  "original": {
    "totalDurationMin": 250,
    "totalDistanceKm": 35.5
  },
  "optimized": {
    "places": [
      {
        "id": "p2",
        "placeId": "ChIJ...",
        "name": "도쿄 타워",
        "lat": 35.6586,
        "lng": 139.7454,
        "order": 1.0
      },
      ...
    ],
    "totalDurationMin": 192,
    "totalDistanceKm": 28.3
  },
  "improvement": {
    "durationPercent": 23,
    "distancePercent": 20
  }
}
```

**Algorithm**
- Nearest Neighbor 기반
- 2-opt swap (1~2회)
- 최대 10개 장소 지원

---

### 5.2 최적화 결과 적용
**POST** `/trips/{tripId}/optimize/apply`

**Request Body**
```json
{
  "places": [
    {
      "id": "p2",
      "order": 1.0
    },
    {
      "id": "p1",
      "order": 2.0
    },
    ...
  ]
}
```

**Response** `200 OK`
```json
{
  "places": [...],
  "routeSummary": {
    "totalDurationMin": 192,
    "totalDistanceKm": 28.3
  }
}
```

---

## 6. Share API

### 6.1 Trip 공유 (스냅샷 생성)
**POST** `/trips/{tripId}/share`

**Request Body**
```json
{
  "expiryDays": 7  // 7~14일 (optional, default: 7)
}
```

**Response** `201 Created`
```json
{
  "shareId": "abc123xyz",
  "shareUrl": "https://tripplan.app/trip/abc123xyz",
  "expiresAt": "2026-01-24T10:30:00Z",
  "isPublic": true
}
```

**Notes**
- Trip 스냅샷을 서버에 저장
- Read-only 공유 링크 생성
- Guest Trip의 경우 expiresAt 설정 필수

---

### 6.2 공유된 Trip 조회
**GET** `/share/{shareId}`

**Response** `200 OK`
```json
{
  "trip": {
    "id": "abc123xyz",
    "title": "도쿄 3일 여행",
    "city": "Tokyo, Japan",
    "startLocation": {...},
    "places": [...],
    "routeSummary": {...}
  },
  "isReadOnly": true,
  "expiresAt": "2026-01-24T10:30:00Z"
}
```

**Permissions**
- 보기: ⭕
- 수정: ❌
- 복사: ⭕ (새로운 Trip으로)

---

### 6.3 공유된 Trip 복사
**POST** `/share/{shareId}/copy`

**Response** `201 Created`
```json
{
  "id": "new123",
  "ownerType": "GUEST",
  "title": "도쿄 3일 여행 (복사본)",
  ...
}
```

---

## 7. Error Responses

### 표준 에러 형식
```json
{
  "error": {
    "code": "PLACE_LIMIT_EXCEEDED",
    "message": "Trip에는 최대 10개의 장소만 추가할 수 있습니다.",
    "details": {
      "currentCount": 10,
      "maxCount": 10
    }
  }
}
```

### 공통 에러 코드
| Code | Status | Description |
|------|--------|-------------|
| `TRIP_NOT_FOUND` | 404 | Trip이 존재하지 않음 |
| `TRIP_EXPIRED` | 410 | Trip이 만료됨 (Guest) |
| `PLACE_LIMIT_EXCEEDED` | 400 | 장소 개수 초과 (10개 제한) |
| `DUPLICATE_PLACE` | 400 | 중복된 장소 |
| `INVALID_ORDER` | 400 | 잘못된 order 값 |
| `ROUTE_CALCULATION_FAILED` | 500 | 루트 계산 실패 |
| `GOOGLE_API_ERROR` | 502 | Google API 오류 |

---

## 8. Rate Limiting

MVP에서는 간단한 Rate Limiting 적용:

- Guest: 시간당 100 requests
- User: 시간당 300 requests

**Response Headers**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642426800
```

**429 Too Many Requests**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "retryAfter": 3600
  }
}
```

---

## 9. 비기능 요구사항

### 성능 목표
- 장소 추가 후 지도 반영: ≤ 500ms
- 루트 계산 응답: ≤ 2s
- API 응답 시간: p95 ≤ 300ms

### 비용 최적화
- Directions API 호출 최소화를 위한 캐싱
- 동일 순서 재계산 방지
- Batch 요청 지원 고려

---

## 10. MVP 구현 우선순위

### Phase 1: 핵심 기능
1. Trip 생성/조회 (LocalStorage 기반)
2. 장소 검색 및 추가
3. 루트 계산 및 지도 표시
4. 장소 순서 변경

### Phase 2: 최적화
5. 루트 최적화 제안
6. 루트 캐싱

### Phase 3: 공유
7. Trip 공유 기능
8. 공유 Trip 조회/복사

---

## 11. 기술 스택 권장사항

### Backend
- Framework: FastAPI (Python) 또는 Express (Node.js)
- Database: PostgreSQL (서버 저장용)
- Cache: Redis (루트 캐싱)

### Frontend
- Framework: React 또는 Next.js
- Maps: Google Maps JavaScript API
- State: Zustand 또는 Redux
- Storage: LocalStorage API

### External APIs
- Google Places API
- Google Directions API
- Google Maps JavaScript API
