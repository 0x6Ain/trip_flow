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
            400: openapi.Response(description='잘못된 요청'),
            403: openapi.Response(description='권한 없음')
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
                            travel_mode=route.get('travelMode', 'DRIVING')
                        )
                except Exception as e:
                    print(f"❌ Segment 생성 실패 ({from_id}, {to_id}): {e}")

        all_segments = list(trip.route_segments.all())
        self._update_trip_summary(trip, all_segments)
        return all_segments
    
    def update(self, request, trip_id=None, event_id=None):
        """Event 업데이트"""
        from core.models import Cost
        
        trip = self.get_trip()
        event = get_object_or_404(Event, id=event_id, trip=trip)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        cost_amount = data.pop('cost', None)
        currency = data.pop('currency', 'KRW')
        
        # 필드 업데이트
        for field, value in data.items():
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
        
        # 비용 저장
        if cost_amount is not None:
            if cost_amount > 0:
                cost_obj, created = Cost.objects.get_or_create(
                    trip=trip,
                    event=event,
                    route_segment=None,
                    defaults={
                        'amount': cost_amount,
                        'currency': currency,
                        'category': 'ACTIVITY',
                        'description': f'{event.place_name} 비용'
                    }
                )
                if not created:
                    cost_obj.amount = cost_amount
                    cost_obj.currency = currency
                    cost_obj.save()
            else:
                Cost.objects.filter(trip=trip, event=event, route_segment=None).delete()
        
        response_serializer = EventSerializer(event)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Event 업데이트",
        operation_description="Event의 정보를 수정합니다.",
        tags=['events'],
        request_body=EventUpdateSerializer,
        responses={
            200: openapi.Response(description='업데이트 성공', schema=EventSerializer),
            403: openapi.Response(description='권한 없음'),
            404: openapi.Response(description='Event를 찾을 수 없음')
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
            204: openapi.Response(description='삭제 성공'),
            403: openapi.Response(description='권한 없음'),
            404: openapi.Response(description='Event를 찾을 수 없음')
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
            400: openapi.Response(description='잘못된 요청'),
            403: openapi.Response(description='권한 없음')
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
        """필요한 segment 쌍 리스트 생성 (각 day 내에서만 연결)"""
        pairs = []
        
        if not events:
            return pairs
        
        # Day별로 그룹화
        events_by_day = {}
        for event in events:
            day = event.day
            if day not in events_by_day:
                events_by_day[day] = []
            events_by_day[day].append(event)
        
        # 각 day별로 처리
        for day in sorted(events_by_day.keys()):
            day_events = events_by_day[day]
            
            if not day_events:
                continue
            
            # Start → 첫 이벤트 (Day 1의 첫 이벤트만)
            if day == 1 and day_events[0].location:
                pairs.append((None, day_events[0].id))
            
            # 같은 day 내의 이벤트 간 연결
            for i in range(len(day_events) - 1):
                if day_events[i].location and day_events[i + 1].location:
                    pairs.append((day_events[i].id, day_events[i + 1].id))
        
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

    @swagger_auto_schema(
        method='patch',
        operation_summary='Event 경로 정보 업데이트',
        operation_description='특정 Event의 다음 경로 정보(이동 수단, 출발 시간, 비용)를 업데이트합니다.',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'travelMode': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['DRIVING', 'WALKING', 'TRANSIT', 'BICYCLING'],
                    description='변경할 이동 수단'
                ),
                'departureTime': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='출발 시간 (HH:MM 형식)',
                    example='09:30'
                ),
                'cost': openapi.Schema(
                    type=openapi.TYPE_NUMBER,
                    description='교통비'
                ),
                'currency': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='통화 (KRW, USD, JPY, EUR 등)',
                    example='KRW',
                    default='KRW'
                )
            },
            required=[]
        ),
        responses={
            200: openapi.Response(
                description='경로 정보 업데이트 성공',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'tripId': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'title': openapi.Schema(type=openapi.TYPE_STRING),
                        'day': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'date': openapi.Schema(type=openapi.TYPE_STRING, format='date'),
                        'events': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
                    }
                )
            ),
            400: openapi.Response(description='잘못된 요청'),
            404: openapi.Response(description='Event를 찾을 수 없음'),
        }
    )
    @action(detail=True, methods=['patch'], url_path='route')
    def update_route(self, request, trip_id=None, event_id=None):
        """Event 경로 정보 업데이트 (이동 수단, 출발 시간, 비용)"""
        from core.models import Cost
        
        trip = self.get_trip()
        event = get_object_or_404(Event, id=event_id, trip=trip)
        
        travel_mode = request.data.get('travelMode')
        departure_time = request.data.get('departureTime')
        cost = request.data.get('cost')
        currency = request.data.get('currency', 'KRW')
        
        # 다음 이벤트 찾기
        next_event = Event.objects.filter(
            trip=trip,
            day=event.day,
            day_order__gt=event.day_order
        ).order_by('day_order').first()
        
        if not next_event:
            raise ValidationError({'detail': '다음 이벤트가 없어 경로를 변경할 수 없습니다.'})
        
        # 경로 세그먼트 찾기 또는 생성
        route_segment, created = RouteSegment.objects.get_or_create(
            trip=trip,
            from_event=event,
            to_event=next_event,
            defaults={'travel_mode': travel_mode or 'DRIVING'}
        )
        
        # 필드 업데이트
        updated = False
        if travel_mode and travel_mode in ['DRIVING', 'WALKING', 'TRANSIT', 'BICYCLING']:
            route_segment.travel_mode = travel_mode
            print(f"🚗 이동수단 변경: {travel_mode}")
            updated = True
        
        if departure_time is not None:
            route_segment.departure_time = departure_time if departure_time else ''
            print(f"🕐 출발시간 설정: '{departure_time}' (빈 문자열={departure_time == ''})")
            updated = True
        
        if updated:
            route_segment.save()
            print(f"✅ RouteSegment 저장 완료: id={route_segment.id}, departure_time='{route_segment.departure_time}'")
        
        # 비용 업데이트
        if cost is not None:
            print(f"💰 비용 업데이트: cost={cost}, currency={currency}")
            if cost > 0:
                # 기존 비용 찾기 또는 생성
                cost_obj, cost_created = Cost.objects.get_or_create(
                    trip=trip,
                    route_segment=route_segment,
                    defaults={
                        'amount': cost,
                        'currency': currency,
                        'category': 'TRANSPORTATION',
                        'description': f'{event.place_name} → {next_event.place_name} 이동 비용'
                    }
                )
                if not cost_created:
                    cost_obj.amount = cost
                    cost_obj.currency = currency
                    cost_obj.save()
                print(f"✅ 비용 저장 완료: id={cost_obj.id}, amount={cost_obj.amount}")
            else:
                # 비용이 0이면 기존 비용 삭제
                deleted_count = Cost.objects.filter(trip=trip, route_segment=route_segment).delete()[0]
                print(f"🗑️ 비용 삭제: {deleted_count}개")
        
        # Day 상세 정보 반환 (간단한 구조)
        day_events = Event.objects.filter(
            trip=trip,
            day=event.day
        ).order_by('day_order')
        
        events_data = []
        for ev in day_events:
            # 이벤트 비용 조회
            event_costs = Cost.objects.filter(trip=trip, event=ev)
            costs_data = [
                {
                    'id': c.id,
                    'amount': float(c.amount),
                    'currency': c.currency,
                    'category': c.category,
                    'description': c.description
                }
                for c in event_costs
            ]
            
            event_data = {
                'id': ev.id,
                'name': ev.place_name,
                'placeId': ev.place_id,
                'location': {
                    'lat': float(ev.lat) if ev.lat else 0,
                    'lng': float(ev.lng) if ev.lng else 0
                },
                'time': ev.start_time if ev.start_time else None,
                'durationMin': ev.duration_min,
                'memo': ev.memo or '',
                'dayOrder': str(ev.day_order),
                'nextRoute': None,
                'costs': costs_data
            }
            
            # 다음 경로 정보 추가
            next_route = RouteSegment.objects.filter(
                trip=trip,
                from_event=ev
            ).first()
            
            if next_route:
                route_data = {
                    'distanceKm': float(next_route.distance_km),
                    'durationMin': next_route.duration_min,
                    'travelMode': next_route.travel_mode,
                    'polyline': next_route.polyline or ''
                }
                
                # 출발 시간 추가
                if next_route.departure_time:
                    route_data['departureTime'] = next_route.departure_time
                    print(f"🕐 출발시간 포함: {next_route.departure_time}")
                
                # 비용 정보 추가
                from core.models import Cost
                route_cost = Cost.objects.filter(
                    trip=trip,
                    route_segment=next_route
                ).first()
                if route_cost:
                    route_data['cost'] = float(route_cost.amount)
                    route_data['currency'] = route_cost.currency
                    print(f"💰 비용 포함: {route_cost.amount} {route_cost.currency}")
                else:
                    print(f"⚠️ route_segment_id={next_route.id}에 대한 비용 없음")
                
                event_data['nextRoute'] = route_data
            
            events_data.append(event_data)
        
        day_detail = {
            'tripId': trip.id,
            'title': trip.title,
            'day': event.day,
            'date': None,
            'events': events_data
        }
        
        return Response(day_detail, status=status.HTTP_200_OK)


