"""
Event Views
"""
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema

from apps.trips.models import Trip
from apps.trips.permissions import TripMemberPermission
from apps.users.authentication import JWTAuthentication
from .models import Event
from .serializers import (
    EventSerializer, EventCreateSerializer, EventUpdateSerializer,
    EventReorderSerializer, EventReorderResponseSerializer
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
        return Event.objects.filter(trip_id=trip_id)
    
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
    
    def create(self, request, trip_id=None):
        """Trip에 Event 추가"""
        trip = self.get_trip()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # order 계산 (마지막 order + 1)
        last_event = trip.events.order_by('-order').first()
        order = (last_event.order + 1) if last_event else 1
        
        # Event 생성
        event = Event.objects.create(
            trip=trip,
            order=order,
            place_id=data.get('placeId', ''),
            place_name=data.get('placeName', ''),
            lat=data.get('lat'),
            lng=data.get('lng'),
            address=data.get('address', ''),
            activity_type=data.get('activityType', ''),
            custom_title=data.get('customTitle', ''),
            day=data.get('day'),
            start_time=data.get('startTime', ''),
            duration_min=data.get('durationMin'),
            cost=data.get('cost'),
            currency=data.get('currency', 'KRW'),
            memo=data.get('memo', '')
        )
        
        # Note: RouteSegment는 별도로 계산/저장됨
        
        response_serializer = EventSerializer(event)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
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
    
    def partial_update(self, request, trip_id=None, event_id=None):
        """Event 부분 업데이트"""
        return self.update(request, trip_id, event_id)
    
    def destroy(self, request, trip_id=None, event_id=None):
        """Event 삭제"""
        trip = self.get_trip()
        event = get_object_or_404(Event, id=event_id, trip=trip)
        event.delete()
        
        # Note: RouteSegment는 별도로 계산/저장됨
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        request_body=EventReorderSerializer,
        responses={200: EventReorderResponseSerializer}
    )
    @action(detail=False, methods=['patch'])
    def reorder(self, request, trip_id=None):
        """Event 순서 변경"""
        trip = self.get_trip()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        events_data = serializer.validated_data['events']
        
        # 순서 업데이트
        for event_data in events_data:
            event = get_object_or_404(Event, id=event_data['id'], trip=trip)
            event.order = event_data['order']
            event.save(update_fields=['order', 'modified'])
        
        # Note: RouteSegment는 별도로 계산/저장됨
        
        # 업데이트된 events 조회
        updated_events = trip.events.all().order_by('order')
        
        response_data = {
            'events': EventSerializer(updated_events, many=True).data,
            'routeSummary': trip.route_summary
        }
        
        response_serializer = EventReorderResponseSerializer(response_data)
        return Response(response_serializer.data)
