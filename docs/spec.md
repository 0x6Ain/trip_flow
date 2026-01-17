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
  places: Place[]
  routeSummary: RouteSummary
  createdAt: datetime
  updatedAt: datetime
  expiresAt?: datetime   // guest only
}
```

### Place

```typescript
Place {
  id: string             // internal uuid
  placeId: string        // Google Places ID
  name: string
  lat: number
  lng: number
  order: number          // float
}
```

> **📌 중요**: `order`는 float 타입 필수 → drag & drop / 중간 삽입 대비

### RouteSummary

```typescript
RouteSummary {
  totalDurationMin: number
  totalDistanceKm: number
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

### 4-2. 장소 추가 (Places API)

**기능**
- Google Places 검색
- 선택 시 Place 추가

**제약**
- 최대 10개
- 중복 장소 추가 방지

**order 규칙**
- `last.order + 1.0`

---

### 4-3. 지도 화면 (Main View)

**구성**
- Google Maps
- Marker (label: 1, 2, 3…)
- PolyLine
- 하단 Summary Bar

**Summary Bar 예시**
```
🕒 3h 20m   🚶 5.6km
```

---

### 4-4. 장소 순서 변경

**UI**
- 리스트 Drag & Drop

**동작**
1. order 재계산
2. Local state 업데이트
3. Directions 재계산
4. 지도 갱신

---

### 4-5. 루트 계산

**API**
- Google Directions API

**계산 방식**
- `places[i] → places[i+1]`
- 구간별 요청
- 결과 캐싱

**RouteCache 구조**
```typescript
RouteCache {
  fromPlaceId: string
  toPlaceId: string
  duration: number
  distance: number
}
```

---

### 4-6. 루트 최적화 (제안형)

**Trigger**
- 버튼 클릭: `[더 나은 순서 제안]`

**입력**
- `startLocation`
- `places` (≤ 10)

**알고리즘**
- Nearest Neighbor
- 2-opt swap (1~2회)

**출력**
```typescript
OptimizedResult {
  places: Place[]
  totalDuration: number
  improvementPercent: number
}
```

**UX 예시**
```
현재: 4h 10m
제안: 3h 12m (↓ 23%)

[적용하기] [유지]
```

---

### 4-7. 저장 정책

**Guest**
- LocalStorage 저장
- 새로고침 유지
- ❌ 서버 저장 안 함

**서버 저장 조건**
- 공유 버튼 클릭 시

---

### 4-8. 공유 기능

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

---

## 8. 다음 확장 Spec (v0.2 힌트)

향후 추가 예정 기능:
- Day 단위 분리
- 일정 밀도 점수
- 로그인 + Trip 영구화
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