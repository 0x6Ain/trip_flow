from rest_framework import serializers
from core.serializers import LocationSerializer, RouteSummarySerializer
from .models import RouteSegment


class PlaceForRouteSerializer(serializers.Serializer):
    """루트 계산용 Place Serializer"""
    placeId = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class RouteCalculateRequestSerializer(serializers.Serializer):
    """루트 계산 요청 Serializer"""
    startLocation = LocationSerializer()
    places = PlaceForRouteSerializer(many=True)


class RouteSegmentModelSerializer(serializers.ModelSerializer):
    """RouteSegment 모델 Serializer"""
    id = serializers.IntegerField(read_only=True)
    fromEventId = serializers.IntegerField(source='from_event_id', allow_null=True)
    toEventId = serializers.IntegerField(source='to_event_id')
    durationMin = serializers.IntegerField(source='duration_min')
    distanceKm = serializers.DecimalField(source='distance_km', max_digits=10, decimal_places=2)
    travelMode = serializers.CharField(source='travel_mode')
    departureTime = serializers.CharField(source='departure_time', required=False, allow_blank=True)
    
    class Meta:
        model = RouteSegment
        fields = [
            'id', 'fromEventId', 'toEventId', 
            'durationMin', 'distanceKm', 'polyline', 'travelMode', 'departureTime'
        ]
        read_only_fields = ['id']


class RouteSegmentSerializer(serializers.Serializer):
    """루트 구간 Serializer (API 응답용 - 레거시)"""
    fromPlaceId = serializers.CharField()
    toPlaceId = serializers.CharField()
    durationMin = serializers.IntegerField()
    distanceKm = serializers.FloatField()
    polyline = serializers.CharField()
    travelMode = serializers.CharField(required=False)
    departureTime = serializers.CharField(required=False)




class RouteCalculateResponseSerializer(serializers.Serializer):
    """루트 계산 응답 Serializer"""
    routes = RouteSegmentSerializer(many=True)
    summary = RouteSummarySerializer()


class OptimizeRequestPlaceSerializer(serializers.Serializer):
    """최적화 요청용 Place Serializer"""
    id = serializers.CharField()
    placeId = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class OptimizeRequestSerializer(serializers.Serializer):
    """루트 최적화 요청 Serializer"""
    startLocation = LocationSerializer()
    places = OptimizeRequestPlaceSerializer(many=True)


class OptimizedPlaceSerializer(serializers.Serializer):
    """최적화된 Place Serializer"""
    id = serializers.CharField()
    placeId = serializers.CharField()
    name = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    order = serializers.FloatField()


class OptimizeResultSerializer(serializers.Serializer):
    """최적화 결과 Serializer"""
    places = OptimizedPlaceSerializer(many=True)
    totalDurationMin = serializers.IntegerField()
    totalDistanceKm = serializers.FloatField()


class OptimizeImprovementSerializer(serializers.Serializer):
    """최적화 개선도 Serializer"""
    durationPercent = serializers.IntegerField()
    distancePercent = serializers.IntegerField()


class OptimizeResponseSerializer(serializers.Serializer):
    """루트 최적화 응답 Serializer"""
    original = RouteSummarySerializer()
    optimized = OptimizeResultSerializer()
    improvement = OptimizeImprovementSerializer()


class OptimizeApplyPlaceSerializer(serializers.Serializer):
    """최적화 적용용 Event Serializer"""
    id = serializers.CharField()
    order = serializers.IntegerField()


class OptimizeApplySerializer(serializers.Serializer):
    """최적화 적용 Serializer"""
    events = OptimizeApplyPlaceSerializer(many=True, required=False)
    places = OptimizeApplyPlaceSerializer(many=True, required=False)  # 레거시 호환성
