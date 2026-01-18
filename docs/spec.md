# Trip Flow MVP SPEC (v0.1)

**Scope**: 개인 프로젝트 → 사용자 검증

---

## 1. 시스템 전제

### Target
- **플랫폼**: Web (PC / Mobile Web)
- **여행 범위**: 해외 여행
- **사용 시점**: 사전 계획 중심

### 핵심 가치
- ❌ 장소 나열
- ✅ 루트 판단 가능
- ✅ 순서 최적화 제안

---

## 2. 사용자 상태 정의

### UserType

```typescript
type UserType = "GUEST" | "USER"
```

- **GUEST**: 로그인 없음
- **USER**: 로그인 있음 (MVP에서는 선택)

---

## 3. Trip 도메인 스펙

### Trip

```typescript
Trip {
  id: string            // 공유용 short id
  ownerType: UserType
  title: string
  city: string
  startLocation: {
    lat: number
    lng: number
  }
  items: TripItem[]      // 여행 구성 요소 (Flight, Place, Route)
  routeSummary: RouteSummary
  createdAt: datetime
  updatedAt: datetime
  expiresAt?: datetime   // guest only
}
```

### TripItem (부모 테이블)

```typescript
TripItem {
  id: string             // internal uuid (PK)
  tripId: string         // FK to Trip
  itemType: ItemType     // 항목 타입
  order: number          // float - 여행 일정 순서
  createdAt: datetime
}

type ItemType = 
  | "FLIGHT"      // 항공편
  | "PLACE"       // 방문 장소
  | "ROUTE"       // 이동 경로
```

> **📌 Class Table Inheritance 패턴**: 
> - TripItem이 공통 부모 테이블
> - Flight, Place, Route가 자식 테이블 (itemId로 연결)
> - Cost는 TripItem.id를 참조하여 모든 항목에 비용 추가 가능

### Flight (자식 테이블)

```typescript
Flight {
  itemId: string         // PK, FK to TripItem.id
  flightNo: string       // 항공편명
  airline: string        // 항공사
  depAirportCode: string // 출발 공항 코드 (IATA)
  arrAirportCode: string // 도착 공항 코드 (IATA)
  depTime: datetime      // 출발 시간
  arrTime: datetime      // 도착 시간
}
```

### Place (자식 테이블)

```typescript
Place {
  itemId: string         // PK, FK to TripItem.id
  placeId: string        // Google Places ID
  name: string
  lat: number
  lng: number
  address?: string       // 주소
}
```

### Route (자식 테이블)

```typescript
Route {
  itemId: string         // PK, FK to TripItem.id
  fromItemId: string     // 출발 TripItem (Place or Flight)
  toItemId: string       // 도착 TripItem (Place or Flight)
  transportation: TransportType
  durationMin: number    // 소요 시간 (분)
  distanceKm: number     // 거리 (km)
  polyline?: string      // 경로선 (encoded)
}

type TransportType = 
  | "WALK"       // 도보
  | "TRANSIT"    // 대중교통
  | "DRIVING"    // 자동차
  | "TAXI"       // 택시
```

### Cost (비용 테이블)

```typescript
Cost {
  id: string             // internal uuid (PK)
  itemId: string         // FK to TripItem.id
  amount: number         // USD
  category: string       // 카테고리 (자유 입력 or 선택)
  note?: string          // 추가 메모
  createdAt: datetime
}
```

> **카테고리 예시**:
> - Flight: "항공권", "수하물", "좌석 업그레이드"
> - Place: "입장료", "식사", "쇼핑", "액티비티"
> - Route: "택시", "버스", "지하철", "렌터카"

### RouteSummary

```typescript
RouteSummary {
  totalDurationMin: number   // 총 이동 시간 (Route 합계)
  totalDistanceKm: number    // 총 이동 거리 (Route 합계)
  totalCost: number          // 전체 비용 (모든 Cost 합계)
  itemCount: {
    flights: number          // Flight 개수
    places: number           // Place 개수
    routes: number           // Route 개수
  }
}
```

---

## 4. 주요 기능별 SPEC

### 4-1. 여행 생성

**기능**
- Trip 생성
- 시작 위치 지정 (공항 / 숙소)

**조건**
- ❌ 로그인 불필요
- Trip은 Local에 먼저 생성

---

### 4-2. TripItem 추가

**4-2-1. Flight 추가**

**기능**
- 항공편 정보 입력 (수동)
- 출발/도착 공항, 시간 입력

**입력 항목**
- 항공편명, 항공사
- 출발 공항 코드 (IATA)
- 도착 공항 코드 (IATA)
- 출발/도착 시간

**order 규칙**
- 여행 시작 시점: `order = 0.0`
- 여행 종료 시점: `last.order + 1.0`

---

**4-2-2. Place 추가 (Places API)**

**기능**
- Google Places 검색
- 선택 시 TripItem(Place) 생성

**제약**
- Place는 최대 10개 권장
- 중복 장소 추가 방지 (placeId 기준)

**order 규칙**
- `last.order + 1.0`

---

**4-2-3. Route 자동 생성**

**Trigger**
- Place 추가 시 자동
- Place 순서 변경 시 자동

**동작**
1. 연속된 Place 간 Route 생성
2. Directions API 호출 (or RouteCache 사용)
3. Route TripItem 자동 삽입
4. order = `(prevPlace.order + nextPlace.order) / 2`

---

### 4-3. 지도 화면 (Main View)

**구성**
- Google Maps
- Marker (label: 1, 2, 3…)
- PolyLine
- 하단 Summary Bar

**Summary Bar 예시**
```
🕒 3h 20m   🚶 5.6km   💰 $1,245
```

> - 비용 정보가 없는 경우 💰 표시 생략
> - 클릭 시 비용 상세 팝오버 표시 (Flight/Place/Route별 구분)

---

### 4-4. TripItem 순서 변경

**UI**
- 리스트 Drag & Drop
- Flight, Place, Route 모두 순서 변경 가능

**동작**
1. TripItem.order 재계산
2. Local state 업데이트
3. Route 항목 재계산 (필요시)
4. 지도 갱신

**제약**
- Route는 from/to 관계가 있어 순서 변경 시 주의 필요
- Place 순서 변경 시 연결된 Route도 함께 고려

---

### 4-5. Route 계산 및 생성

**API**
- Google Directions API

**계산 방식**
- 연속된 Place 간 자동 계산
- `Place[i] → Place[i+1]`
- 구간별 요청
- 결과 캐싱 (RouteCache)

**Route TripItem 생성**
1. Directions API 호출
2. duration, distance, polyline 저장
3. Route TripItem 생성
4. order = `(fromPlace.order + toPlace.order) / 2`

**RouteCache 구조**
```typescript
RouteCache {
  fromPlaceId: string    // Google Places ID
  toPlaceId: string      // Google Places ID
  duration: number       // minutes
  distance: number       // km
  polyline?: string      // encoded polyline
}
```

> **📌 참고**: Route 테이블과 RouteCache는 다른 목적
> - **Route**: Trip의 실제 이동 경로 (TripItem)
> - **RouteCache**: Directions API 결과 캐싱 (최적화용)

---

### 4-6. Place 순서 최적화 (제안형)

**Trigger**
- 버튼 클릭: `[더 나은 순서 제안]`

**입력**
- `startLocation`
- Place TripItems (≤ 10)

**알고리즘**
- Nearest Neighbor
- 2-opt swap (1~2회)

**출력**
```typescript
OptimizedResult {
  items: TripItem[]      // 재정렬된 Place + Route
  totalDuration: number
  totalDistance: number
  improvementPercent: number
}
```

**동작**
1. Place만 추출하여 최적화
2. 최적화된 순서로 TripItem.order 재계산
3. Route TripItem 재생성
4. 개선율 계산

**UX 예시**
```
현재: 4h 10m, 12.5km
제안: 3h 12m, 9.8km (↓ 23% 시간, ↓ 22% 거리)

[적용하기] [유지]
```

**적용 시 동작**
1. Place order 업데이트
2. 기존 Route TripItem 삭제
3. 새 Route TripItem 생성
4. 지도 갱신

---

### 4-7. 비용 관리 (통합)

**개요**
- 모든 TripItem(Flight, Place, Route)에 비용 추가 가능
- Cost 테이블로 통합 관리
- 카테고리는 자유 입력 (추천 목록 제공)

**비용 추가 대상**
```
Flight (항공편)
├─ 항공권
├─ 수하물 추가
└─ 좌석 업그레이드

Place (장소)
├─ 입장료/티켓
├─ 식사
├─ 액티비티
└─ 쇼핑

Route (이동)
├─ 택시
├─ 버스/지하철
└─ 렌터카
```

**제약**
- TripItem당 비용 항목 개수 제한 없음
- USD 기준
- 양수만 입력 가능
- 소수점 2자리까지

**UI 구조**

각 TripItem 카드 내부:
```
✈️ KE901 (인천 → 파리)
├─ 비용 목록
│  ├─ [항공권] $ 850
│  ├─ [수하물] $ 50
│  └─ [+ 비용 추가]
└─ 소계: $900

📍 에펠탑
├─ 비용 목록
│  ├─ [입장료] $ 30
│  ├─ [식사] $ 45 "정상 레스토랑"
│  └─ [+ 비용 추가]
└─ 소계: $75

🚗 에펠탑 → 루브르
├─ 비용 목록
│  ├─ [택시] $ 15
│  └─ [+ 비용 추가]
└─ 소계: $15
```

**상호작용**
1. TripItem 카드에서 `[+ 비용 추가]` 클릭
2. 카테고리 입력 (자유 입력 or 추천 선택)
3. 금액 입력
4. 메모 입력 (선택)
5. 저장 → 목록에 추가
6. 각 비용 항목 개별 수정/삭제 가능

**계산**
- TripItem별 소계 자동 계산
- 전체 총 비용 = 모든 Cost의 합계
- RouteSummary에 반영

**전체 예시**
```
여행 일정 및 비용

✈️ KE901 (인천 → 파리)
   - [항공권] $ 850
   - [수하물] $ 50
   소계: $900

📍 에펠탑
   - [입장료] $ 30
   - [식사] $ 45
   소계: $75

🚗 에펠탑 → 루브르 (택시)
   - [택시 요금] $ 15
   소계: $15

📍 루브르 박물관
   - [티켓] $ 18
   - [오디오 가이드] $ 7
   소계: $25

─────────────────
총 예산: $1,015
```

**카테고리 추천 목록 (참고용)**

Flight 관련:
- 항공권, 수하물, 좌석 업그레이드, 기내식

Place 관련:
- 입장료, 티켓, 식사, 음료, 액티비티, 쇼핑, 기념품

Route 관련:
- 택시, 버스, 지하철, 렌터카, 주차비, 통행료

---

### 4-8. 저장 정책

**Guest**
- LocalStorage 저장
- 새로고침 유지
- ❌ 서버 저장 안 함

**서버 저장 조건**
- 공유 버튼 클릭 시

---

### 4-9. 공유 기능

**방식**
- Read-only Public URL
- `/trip/{shortId}`

**서버 동작**
- Trip snapshot 저장
- expiresAt 설정 (7~14일)

**공유 페이지 권한**

| 액션 | 가능 여부 |
|------|-----------|
| 보기 | ✅ |
| 수정 | ❌ |
| 복사 | ✅ |
---

## 5. 비기능 요구사항 (MVP 기준)

### 성능
- 장소 추가 후 지도 반영 ≤ 500ms
- 루트 계산 중 로딩 표시

### 비용
- Directions API 호출 최소화
- 동일 순서 재계산 금지

---

## 6. 제외 항목 (Explicit Out)

MVP에서 제외되는 기능들:
- ❌ 로그인 필수
- ❌ Day 분리
- ❌ 리뷰 / 소셜
- ❌ 추천 알고리즘
- ❌ 결제

---

## 7. MVP 완료 기준 (Definition of Done)

- [ ] 장소 5개 이상 추가 가능
- [ ] 지도에서 루트 판단 가능
- [ ] 최적화 제안이 체감됨
- [ ] 링크 공유 가능
- [ ] 로그인 없이 전체 사용 가능
- [ ] TripItem(Flight/Place/Route)별 비용 입력 가능
- [ ] 전체 예산 자동 계산 및 표시

---

## 8. 다음 확장 Spec (v0.2 힌트)

향후 추가 예정 기능:
- Day 단위 분리 (TripItem.order를 day별로 그룹핑)
- 숙박(Accommodation) TripItem 타입 추가
- 일정 밀도 점수
- 로그인 + Trip 영구화
- 비용 카테고리 통계/분석
- Pro 기능 플래그

---

## 9. Google Maps API 비용 계산

### 사용 API 목록
- **Maps JavaScript API** (지도 표시)
- **Places API** (장소 검색)
- **Directions API** (루트 계산)

### API 단가 (2026년 기준)

| API | 항목 | 단가 (USD) |
|-----|------|-----------|
| Maps JS API | Map loads | $0.007 / load |
| Places API | Autocomplete | $0.017 / session |
| Places API | Place Details | $0.017 / request |
| Directions API | Route calculation | $0.005 / request |

---

### 시나리오 1: 일반 사용자 (1회 여행 계획)

**행동 패턴**
- 장소 7개 추가
- 장소 검색 15회
- 순서 변경 3회
- 최적화 제안 2회

**비용 계산**
- Map loads: 1회 = $0.007
- Autocomplete: 15회 = $0.255
- Place Details: 7회 = $0.119
- Directions 기본: 6회 = $0.030
- Directions 순서변경: 18회 = $0.090
- Directions 최적화: 24회 = $0.120

**사용자당 비용: ~$0.62**

---

### 시나리오 2: 파워 유저

**행동 패턴**
- 장소 10개 추가 (최대)
- 장소 검색 30회
- 순서 변경 8회
- 최적화 제안 5회

**비용 계산**
- Map loads: 1회 = $0.007
- Autocomplete: 30회 = $0.510
- Place Details: 15회 = $0.255
- Directions 전체: 180회 = $0.900

**사용자당 비용: ~$1.67**

---

### 월간 운영 비용 추정 (1,000명)

| 사용자 구성 | 비율 | 인원 | 비용 |
|------------|------|------|------|
| 일반 사용자 | 70% | 700 | $434.70 |
| 파워 유저 | 20% | 200 | $334.40 |
| 조회만 (공유) | 10% | 100 | $0.70 |

**월 총 비용: ~$770**

---

### 비용 최적화 전략 (구현 필수)

**✅ 이미 적용**
- RouteCache 구현 (4-5 참조)
- 동일 순서 재계산 금지 (5절 참조)

**🔧 추가 구현 필요**
- Autocomplete Session Token 사용
- 최적화 제안 횟수 제한 (Guest: 하루 3회)
- Guest Trip 만료 후 자동 삭제

---

### 비용 모니터링 체크리스트

**출시 전 필수 설정**

**Google Cloud 결제 알림**
- 일일 $30 초과
- 월 $500 초과

**API 할당량 제한**
- Directions API: 1,000 req/day
- Places API: 2,000 req/day

**무료 혜택**
- Google Cloud 신규 크레딧: $200
- Maps JS API 무료 할당량: 월 $200

---

### 예상 비용 범위

| 사용자 규모 | 월 비용 | 비고 |
|------------|---------|------|
| ~100명 | $60-80 | 무료 범위 내 |
| ~500명 | $300-400 | 크레딧으로 충분 |
| ~1,000명 | $700-900 | 실제 과금 시작 |