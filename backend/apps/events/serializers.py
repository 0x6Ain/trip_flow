"""
Event Serializers
"""
from rest_framework import serializers
from drf_yasg.utils import swagger_serializer_method
from .models import Event
from core.serializers import CostSerializer, LocationSerializer, RouteSummarySerializer
from apps.routes.serializers import RouteSegmentModelSerializer


class EventSerializer(serializers.ModelSerializer):
    """Event 조회 Serializer"""
    id = serializers.IntegerField(read_only=True)
    location = serializers.SerializerMethodField()
    displayTitle = serializers.CharField(source='display_title', read_only=True)
    placeId = serializers.CharField(source='place_id', required=False, allow_blank=True)
    placeName = serializers.CharField(source='place_name', required=False, allow_blank=True)
    activityType = serializers.CharField(source='activity_type', required=False, allow_blank=True)
    customTitle = serializers.CharField(source='custom_title', required=False, allow_blank=True)
    startTime = serializers.CharField(source='start_time', required=False, allow_blank=True)
    durationMin = serializers.IntegerField(source='duration_min', required=False, allow_null=True)
    dayOrder = serializers.DecimalField(source='day_order', max_digits=10, decimal_places=4, read_only=True)
    globalOrder = serializers.IntegerField(source='global_order', read_only=True)
    costs = CostSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'order', 'globalOrder', 'dayOrder', 'placeId', 'placeName', 'lat', 'lng', 'address',
            'activityType', 'customTitle', 'day', 'startTime', 'durationMin',
            'memo', 'costs', 'location', 'displayTitle',
            'createdAt', 'updatedAt'
        ]
    
    def get_location(self, obj):
        return obj.location


class EventCreateSerializer(serializers.Serializer):
    """Event 생성 Serializer"""
    placeId = serializers.CharField(required=False, allow_blank=True)
    placeName = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    lng = serializers.DecimalField(max_digits=12, decimal_places=8, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    activityType = serializers.CharField(required=False, allow_blank=True)
    customTitle = serializers.CharField(required=False, allow_blank=True)
    day = serializers.IntegerField(required=False, allow_null=True)
    startTime = serializers.CharField(required=False, allow_blank=True)
    durationMin = serializers.IntegerField(required=False, allow_null=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    # Event 추가 직후 route_segments 자동 재계산 여부 (기본: true)
    recalculateRoutes = serializers.BooleanField(required=False, default=True)
    # 비용 정보 (프론트 호환성, 현재는 무시됨 - 추후 Cost 모델로 저장)
    cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    currency = serializers.CharField(required=False, allow_blank=True)


class EventUpdateSerializer(serializers.Serializer):
    """Event 수정 Serializer"""
    placeName = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    activityType = serializers.CharField(required=False, allow_blank=True)
    customTitle = serializers.CharField(required=False, allow_blank=True)
    day = serializers.IntegerField(required=False, allow_null=True)
    startTime = serializers.CharField(required=False, allow_blank=True)
    durationMin = serializers.IntegerField(required=False, allow_null=True)
    memo = serializers.CharField(required=False, allow_blank=True)


class EventReorderItemSerializer(serializers.Serializer):
    """순서 변경 항목 Serializer"""
    id = serializers.IntegerField()
    order = serializers.DecimalField(max_digits=10, decimal_places=4)  # day_order로 변경
    day = serializers.IntegerField(required=False)  # day 변경도 지원


class EventReorderSerializer(serializers.Serializer):
    """Event 순서 변경 Serializer"""
    events = EventReorderItemSerializer(many=True)
    recalculateRoutes = serializers.BooleanField(default=True)  # 경로 재계산 여부


class EventReorderResponseSerializer(serializers.Serializer):
    """Event 순서 변경 응답 Serializer"""
    events = EventSerializer(many=True)
    segments = serializers.ListField(required=False)  # RouteSegment 목록
    routeSummary = serializers.DictField()


class EventCreateResponseSerializer(EventSerializer):
    """
    Event 생성 응답 Serializer

    - 기존 Event 응답 필드는 유지하면서,
      route_segments 및 routeSummary를 함께 반환할 수 있습니다.
    """
    segments = RouteSegmentModelSerializer(many=True, required=False)
    routeSummary = RouteSummarySerializer(required=False)

    class Meta(EventSerializer.Meta):
        fields = list(EventSerializer.Meta.fields) + ['segments', 'routeSummary']


class EventWithNextRouteSerializer(serializers.ModelSerializer):
    """Event + next_route 포함 Serializer"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source='place_name', required=False)
    location = serializers.SerializerMethodField()
    placeId = serializers.CharField(source='place_id', required=False, allow_blank=True)
    time = serializers.CharField(source='start_time', required=False, allow_blank=True)
    durationMin = serializers.IntegerField(source='duration_min', required=False, allow_null=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    dayOrder = serializers.DecimalField(source='day_order', max_digits=10, decimal_places=4, read_only=True)
    nextRoute = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'placeId', 'location', 'time', 'durationMin',
            'memo', 'dayOrder', 'nextRoute'
        ]
    
    @swagger_serializer_method(serializer_or_field=LocationSerializer)
    def get_location(self, obj):
        return obj.location
    
    @swagger_serializer_method(serializer_or_field=serializers.DictField())
    def get_nextRoute(self, obj):
        """다음 이벤트로 가는 경로"""
        from apps.routes.models import RouteSegment
        
        trip = self.context.get('trip')
        if not trip:
            return None
        
        # obj 다음의 이벤트 찾기
        next_event = Event.objects.filter(
            trip=trip,
            day=obj.day,
            day_order__gt=obj.day_order
        ).order_by('day_order').first()
        
        # 같은 day에 다음 이벤트가 없으면 다음 day의 첫 이벤트
        if not next_event:
            next_event = Event.objects.filter(
                trip=trip,
                day=obj.day + 1
            ).order_by('day_order').first()
        
        if not next_event:
            return None  # 마지막 이벤트
        
        # 해당 segment 찾기
        segment = RouteSegment.objects.filter(
            trip=trip,
            from_event=obj,
            to_event=next_event
        ).first()
        
        if not segment:
            return None
        
        return {
            'travelMode': segment.travel_mode,
            'durationMin': segment.duration_min,
            'distanceKm': float(segment.distance_km),
            'polyline': segment.polyline
        }
