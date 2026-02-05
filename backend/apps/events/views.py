"""
Event Views
"""
from decimal import Decimal
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db import models as django_models
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from concurrent.futures import ThreadPoolExecutor

from apps.trips.models import Trip
from apps.trips.permissions import TripMemberPermission
from apps.users.authentication import JWTAuthentication
from apps.routes.models import RouteSegment
from apps.routes.serializers import RouteSegmentModelSerializer
from apps.routes.services import GoogleMapsService
from .models import Event
from .serializers import (
    EventSerializer, EventCreateSerializer, EventUpdateSerializer,
    EventReorderSerializer, EventReorderResponseSerializer,
    EventCreateResponseSerializer
)


class TripEventViewSet(mixins.CreateModelMixin,
                       mixins.UpdateModelMixin,
                       mixins.DestroyModelMixin,
                       GenericViewSet):
    """Trip 내 Event 관리 ViewSet"""
    serializer_class = EventSerializer
    permission_classes = [TripMemberPermission]
    authentication_classes = [JWTAuthentication]
    lookup_url_kwarg = 'event_id'
    
    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return Event.objects.filter(trip_id=trip_id).order_by('day', 'day_order')
    
    def get_trip(self):
        """Trip 가져오기 및 권한 체크"""
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        self.check_object_permissions(self.request, trip)
        return trip
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return EventUpdateSerializer
        elif self.action == 'reorder':
            return EventReorderSerializer
        return EventSerializer
    
    @swagger_auto_schema(
        operation_summary="Event 추가",
        operation_description="""
Trip에 새로운 Event를 추가합니다. Day별 마지막에 자동으로 추가됩니다.

**추가 동작 (A안):**
- 기본적으로 Event 생성 직후 `route_segments`를 자동으로 재계산/저장합니다.
- 계산 결과로 Trip의 `routeSummary`(총 이동 시간/거리)도 함께 업데이트됩니다.

**주의:**
- Google Directions API 호출이 포함될 수 있어 응답이 느려질 수 있습니다.
- `recalculateRoutes=false`로 보내면 Event만 생성하고 segments는 건드리지 않습니다.
        """,
        tags=['events'],
        request_body=EventCreateSerializer,
        responses={
            201: openapi.Response(description='Event 생성 성공', schema=EventCreateResponseSerializer),
            400: '잘못된 요청',
            403: '권한 없음'
        }
    )
    def create(self, request, trip_id=None):
        """Trip에 Event 추가"""
        trip = self.get_trip()
        
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            # 디버깅 편의를 위한 로깅 (클라이언트에서 400이 나올 때 원인 확인용)
            print("❌ Event 생성 요청 검증 실패")
            print("  request.data =", request.data)
            print("  errors =", serializer.errors)
            raise
        
        data = serializer.validated_data
        recalculate = data.get('recalculateRoutes', True)
        
        # day 결정
        target_day = data.get('day') or trip.total_days or 1
        
        # day_order 계산 (해당 day의 마지막 order + 10)
        last_event_in_day = trip.events.filter(day=target_day).order_by('-day_order').first()
        day_order = (last_event_in_day.day_order + Decimal('10.0')) if last_event_in_day else Decimal('10.0')
        
        # global_order 계산
        last_event = trip.events.order_by('-global_order').first()
        global_order = (last_event.global_order + 1) if last_event else 1
        order = global_order  # 하위 호환
        
        # Event 생성
        event = Event.objects.create(
            trip=trip,
            order=order,
            global_order=global_order,
            day_order=day_order,
            place_id=data.get('placeId', ''),
            place_name=data.get('placeName', ''),
            lat=data.get('lat'),
            lng=data.get('lng'),
            address=data.get('address', ''),
            activity_type=data.get('activityType', ''),
            custom_title=data.get('customTitle', ''),
            day=target_day,
            start_time=data.get('startTime', ''),
            duration_min=data.get('durationMin'),
            memo=data.get('memo', '')
        )
        
        # TODO: cost와 currency는 추후 Cost 모델로 저장
        # if data.get('cost'):
        #     Cost.objects.create(
        #         event=event,
        #         amount=data.get('cost'),
        #         currency=data.get('currency', 'KRW')
        #     )
        
        # Event 생성 직후 segments 자동 재계산/저장 (A안)
        segments = None
        if recalculate:
            try:
                existing_segments_map = {
                    (seg.from_event_id, seg.to_event_id): seg
                    for seg in trip.route_segments.all()
                }
                # Event 생성 직후에는 생성된 Event가 아직 트랜잭션에 묶여있을 수 있어
                # (특히 테스트 환경에서) 별도 스레드에서 FK 조회가 실패할 수 있습니다.
                # 따라서 여기서는 병렬 처리 없이 순차 재계산합니다.
                segments = self._recalculate_segments_sequential(trip, existing_segments_map)
            except Exception as e:
                # Event는 생성되었으므로, segments 계산 실패는 best-effort로 처리
                print(f"❌ Event 생성 후 RouteSegment 재계산 실패: {e}")
                segments = list(trip.route_segments.all())

        response_data = EventSerializer(event).data
        if recalculate:
            response_data['segments'] = RouteSegmentModelSerializer(segments, many=True).data
            response_data['routeSummary'] = trip.route_summary

        return Response(response_data, status=status.HTTP_201_CREATED)

    def _recalculate_segments_sequential(self, trip, existing_segments_map):
        """
        Diff 기반 재계산을 하되, segments 생성은 순차적으로 수행합니다.

        - Event 생성 직후 호출되는 케이스에서 병렬 생성 시 FK 가시성 문제가 발생할 수 있어
          (특히 테스트/트랜잭션 환경) 안정성을 우선합니다.
        """
        all_events = list(Event.objects.filter(trip=trip).order_by('day', 'day_order'))
        needed_pairs = self._calculate_segment_pairs(all_events)

        needed_set = set(needed_pairs)
        existing_set = set(existing_segments_map.keys())

        to_delete = existing_set - needed_set
        to_create = needed_set - existing_set

        # 삭제
        if to_delete:
            delete_ids = [existing_segments_map[pair].id for pair in to_delete]
            RouteSegment.objects.filter(id__in=delete_ids).delete()

        # 생성 (순차)
        if to_create:
            google_maps = GoogleMapsService()
            events_map = {e.id: e for e in all_events}

            for from_id, to_id in to_create:
                from_event = events_map.get(from_id) if from_id else None
                to_event = events_map.get(to_id)

                if not to_event or not to_event.location:
                    continue

                from_location = trip.start_location if from_event is None else from_event.location
                if not from_location:
                    continue

                try:
                    route = google_maps.calculate_route(from_location, to_event.location)
                    if route:
                        RouteSegment.objects.create(
                            trip=trip,
                            from_event=from_event,
                            to_event=to_event,
                            duration_min=route['durationMin'],
                            distance_km=route['distanceKm'],
                            polyline=route.get('polyline', ''),
                            travel_mode='DRIVING'
                        )
                except Exception as e:
                    print(f"❌ Segment 생성 실패 ({from_id}, {to_id}): {e}")

        all_segments = list(trip.route_segments.all())
        self._update_trip_summary(trip, all_segments)
        return all_segments
    
    def update(self, request, trip_id=None, event_id=None):
        """Event 업데이트"""
        trip = self.get_trip()
        event = get_object_or_404(Event, id=event_id, trip=trip)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 필드 업데이트
        for field, value in serializer.validated_data.items():
            # camelCase를 snake_case로 변환
            field_name = field
            if field == 'placeName':
                field_name = 'place_name'
            elif field == 'activityType':
                field_name = 'activity_type'
            elif field == 'customTitle':
                field_name = 'custom_title'
            elif field == 'startTime':
                field_name = 'start_time'
            elif field == 'durationMin':
                field_name = 'duration_min'
            
            setattr(event, field_name, value)
        
        event.save()
        
        # Note: RouteSegment는 별도로 계산/저장됨
        
        response_serializer = EventSerializer(event)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Event 업데이트",
        operation_description="Event의 정보를 수정합니다.",
        tags=['events'],
        request_body=EventUpdateSerializer,
        responses={
            200: openapi.Response(description='업데이트 성공', schema=EventSerializer),
            403: '권한 없음',
            404: 'Event를 찾을 수 없음'
        }
    )
    def partial_update(self, request, trip_id=None, event_id=None):
        """Event 부분 업데이트"""
        return self.update(request, trip_id, event_id)
    
    @swagger_auto_schema(
        operation_summary="Event 삭제",
        operation_description="Event를 삭제합니다.",
        tags=['events'],
        responses={
            204: '삭제 성공',
            403: '권한 없음',
            404: 'Event를 찾을 수 없음'
        }
    )
    def destroy(self, request, trip_id=None, event_id=None):
        """Event 삭제"""
        trip = self.get_trip()
        event = get_object_or_404(Event, id=event_id, trip=trip)
        event.delete()
        
        # Note: RouteSegment는 별도로 계산/저장됨
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        operation_summary="Events 순서 변경",
        operation_description="""
Events의 순서를 변경하고 RouteSegments를 스마트하게 재계산합니다.

**특징:**
- Diff 기반으로 변경된 segments만 재계산 (성능 최적화)
- Day별 독립적 order 관리 (Decimal order)
- 자동 rebalance (gap < 0.0001 시)
- 병렬 API 호출로 빠른 재계산

**성능:**
- 40개 중 3개 변경 시 → 3개만 API 호출 (1-2초)
- 변경 안 된 segments는 재사용

**예시:**
```json
{
  "events": [
    { "id": 1, "order": 10.0, "day": 1 },
    { "id": 2, "order": 20.0, "day": 1 },
    { "id": 3, "order": 15.0, "day": 1 }  // 중간 삽입
  ],
  "recalculateRoutes": true
}
```
        """,
        tags=['events'],
        request_body=EventReorderSerializer,
        responses={
            200: openapi.Response(
                '순서 변경 성공',
                EventReorderResponseSerializer,
                examples={
                    'application/json': {
                        "events": [
                            {
                                "id": 1,
                                "order": 10,
                                "dayOrder": "10.0000",
                                "globalOrder": 1
                            }
                        ],
                        "segments": [
                            {
                                "id": 1,
                                "fromEventId": 1,
                                "toEventId": 2,
                                "durationMin": 20,
                                "distanceKm": "5.2"
                            }
                        ],
                        "routeSummary": {
                            "totalDurationMin": 20,
                            "totalDistanceKm": 5.2
                        }
                    }
                }
            ),
            400: '잘못된 요청',
            403: '권한 없음'
        }
    )
    @action(detail=False, methods=['patch'])
    def reorder(self, request, trip_id=None):
        """Event 순서 변경 + RouteSegment 스마트 재계산"""
        trip = self.get_trip()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        events_data = serializer.validated_data['events']
        recalculate = serializer.validated_data.get('recalculateRoutes', True)
        
        # 1. 변경 전 segments 매핑 (Diff 계산용)
        existing_segments_map = {
            (seg.from_event_id, seg.to_event_id): seg
            for seg in trip.route_segments.all()
        }
        
        # 2. 트랜잭션으로 순서 업데이트
        with transaction.atomic():
            for event_data in events_data:
                event = get_object_or_404(Event, id=event_data['id'], trip=trip)
                event.day_order = Decimal(str(event_data['order']))
                if 'day' in event_data:
                    event.day = event_data['day']
                # 하위 호환성을 위해 order도 업데이트
                event.order = int(event_data['order'])
                event.save(update_fields=['order', 'day_order', 'day', 'modified'])
            
            # 3. Global order 재계산
            self._recalculate_global_order(trip)
            
            # 4. Day별 rebalance 체크
            affected_days = set(event_data.get('day', 1) for event_data in events_data)
            for day in affected_days:
                self._check_and_rebalance_day(trip, day)
        
        # 5. RouteSegment 재계산 (선택적, Diff 기반)
        segments = []
        if recalculate:
            segments = self._smart_recalculate_segments(trip, existing_segments_map)
        else:
            segments = list(trip.route_segments.all())
        
        # 6. 응답
        updated_events = trip.events.all().order_by('day', 'day_order')
        
        response_data = {
            'events': EventSerializer(updated_events, many=True).data,
            'segments': RouteSegmentModelSerializer(segments, many=True).data,
            'routeSummary': trip.route_summary
        }
        
        return Response(response_data)
    
    def _recalculate_global_order(self, trip):
        """모든 day를 고려하여 global_order 계산"""
        all_events = Event.objects.filter(trip=trip).order_by('day', 'day_order')
        
        for idx, event in enumerate(all_events):
            event.global_order = idx + 1
            event.save(update_fields=['global_order'])
    
    def _check_and_rebalance_day(self, trip, day):
        """Day 내부 order gap 체크 및 rebalance"""
        events = list(Event.objects.filter(trip=trip, day=day).order_by('day_order'))
        
        if len(events) < 2:
            return
        
        MIN_GAP = Decimal('0.0001')
        needs_rebalance = False
        
        # Gap 체크
        for i in range(len(events) - 1):
            gap = events[i + 1].day_order - events[i].day_order
            if gap < MIN_GAP:
                needs_rebalance = True
                break
        
        if needs_rebalance:
            print(f"⚠️ Day {day} rebalancing triggered (gap < {MIN_GAP})")
            # 10, 20, 30... 으로 재배치
            for idx, event in enumerate(events):
                event.day_order = Decimal((idx + 1) * 10)
                event.order = (idx + 1) * 10  # 하위 호환
                event.save(update_fields=['day_order', 'order'])
    
    def _smart_recalculate_segments(self, trip, existing_segments_map):
        """Diff 기반으로 변경된 segments만 재계산"""
        # 1. 새 순서에서 필요한 segment pairs 계산
        all_events = list(Event.objects.filter(trip=trip).order_by('day', 'day_order'))
        needed_pairs = self._calculate_segment_pairs(all_events)
        
        needed_set = set(needed_pairs)
        existing_set = set(existing_segments_map.keys())
        
        # 2. Diff 계산
        to_delete = existing_set - needed_set
        to_create = needed_set - existing_set
        
        print(f"📊 RouteSegment diff:")
        print(f"  - 삭제: {len(to_delete)}개")
        print(f"  - 추가: {len(to_create)}개")
        print(f"  - 재사용: {len(needed_set & existing_set)}개")
        
        # 3. 삭제
        if to_delete:
            delete_ids = [existing_segments_map[pair].id for pair in to_delete]
            RouteSegment.objects.filter(id__in=delete_ids).delete()
        
        # 4. 생성 (병렬 처리)
        if to_create:
            self._create_segments_parallel(trip, list(to_create), all_events)
        
        # 5. 모든 segments 조회 및 Trip 요약 업데이트
        all_segments = list(trip.route_segments.all())
        self._update_trip_summary(trip, all_segments)
        
        return all_segments
    
    def _calculate_segment_pairs(self, events):
        """필요한 segment 쌍 리스트 생성"""
        pairs = []
        
        if events:
            # Start → 첫 이벤트
            if events[0].location:
                pairs.append((None, events[0].id))
            
            # 이벤트 간 (순서대로, day 무관)
            for i in range(len(events) - 1):
                if events[i].location and events[i + 1].location:
                    pairs.append((events[i].id, events[i + 1].id))
        
        return pairs
    
    def _create_segments_parallel(self, trip, pairs_to_create, events):
        """병렬로 segments 생성"""
        google_maps = GoogleMapsService()
        events_map = {e.id: e for e in events}
        
        def create_one_segment(pair):
            from_id, to_id = pair
            from_event = events_map.get(from_id) if from_id else None
            to_event = events_map.get(to_id)
            
            if not to_event or not to_event.location:
                return None
            
            from_location = trip.start_location if from_event is None else from_event.location
            if not from_location:
                return None
            
            try:
                route = google_maps.calculate_route(from_location, to_event.location)
                if route:
                    return RouteSegment.objects.create(
                        trip=trip,
                        from_event=from_event,
                        to_event=to_event,
                        duration_min=route['durationMin'],
                        distance_km=route['distanceKm'],
                        polyline=route.get('polyline', ''),
                        travel_mode='DRIVING'
                    )
            except Exception as e:
                print(f"❌ Segment 생성 실패 {pair}: {e}")
                return None
        
        # 병렬 처리 (최대 5개 동시)
        with ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(create_one_segment, pairs_to_create))
        
        return [seg for seg in results if seg is not None]
    
    def _update_trip_summary(self, trip, segments):
        """Trip 요약 정보 업데이트"""
        total_duration = sum(seg.duration_min for seg in segments)
        total_distance = sum(float(seg.distance_km) for seg in segments)
        
        trip.total_duration_min = total_duration
        trip.total_distance_km = total_distance
        trip.save(update_fields=['total_duration_min', 'total_distance_km', 'modified'])


