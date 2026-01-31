# 데이터베이스 마이그레이션 가이드

## 변경 사항

프론트엔드의 추가 기능을 지원하기 위해 다음 필드들이 추가되었습니다:

### Trip 모델

- `start_date` (DateField): 여행 시작 날짜
- `total_days` (IntegerField): 여행 전체 일수

### Place 모델

- `day` (IntegerField): 여행 Day (1-based)
- `visit_time` (CharField): 방문 시간 (HH:MM)
- `duration_min` (IntegerField): 머무는 시간 (분)
- `cost` (DecimalField): 비용
- `currency` (CharField): 통화 (KRW, USD, JPY, etc.)
- `memo` (TextField): 사용자 메모

### RouteSegment 모델 (신규)

- `trip` (ForeignKey): Trip 연결
- `from_place` (ForeignKey): 출발 장소
- `to_place` (ForeignKey): 도착 장소
- `travel_mode` (CharField): 이동 수단 (WALKING, TRANSIT, DRIVING, BICYCLING)
- `duration_min` (IntegerField): 소요 시간 (분)
- `distance_km` (DecimalField): 거리 (km)
- `polyline` (TextField): 경로선 (encoded)
- `departure_time` (CharField): 출발 시간 (HH:MM)

## 마이그레이션 실행

```bash
# 1. 가상환경 활성화
workon trip_flow

# 2. 마이그레이션 파일 생성
python manage.py makemigrations

# 3. 마이그레이션 실행
python manage.py migrate

# 4. (선택) 마이그레이션 상태 확인
python manage.py showmigrations
```

## 주의사항

1. **데이터 손실 없음**: 모든 새 필드는 `null=True` 또는 기본값을 가지므로 기존 데이터에 영향 없음
2. **백업 권장**: 프로덕션 환경에서는 마이그레이션 전 데이터베이스 백업 권장
3. **순서 중요**: Trip, Place 마이그레이션 후 RouteSegment 마이그레이션 실행

## API 엔드포인트 변경

### 신규 엔드포인트

- `POST /api/trips/{id}/route-segments/` - RouteSegment 생성
- `PATCH /api/trips/{id}/route-segments/{segment_id}/` - RouteSegment 업데이트
- `DELETE /api/trips/{id}/route-segments/{segment_id}/` - RouteSegment 삭제

### 수정된 엔드포인트

- `GET /api/trips/{id}/` - 응답에 `routeSegments` 배열 추가
- `POST /api/trips/{id}/places/` - 요청에 `day`, `visitTime`, `cost`, `currency`, `memo` 추가 가능
- `PATCH /api/trips/{id}/places/{place_id}/` - 요청에 새 필드 업데이트 가능

## 롤백

마이그레이션을 되돌리려면:

```bash
# 이전 마이그레이션으로 롤백
python manage.py migrate trips <previous_migration_name>
python manage.py migrate places <previous_migration_name>
python manage.py migrate routes <previous_migration_name>
```
