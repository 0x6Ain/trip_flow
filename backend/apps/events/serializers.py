"""
Event Serializers
"""
from rest_framework import serializers
from .models import Event
from core.serializers import CostSerializer


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
    costs = CostSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'order', 'placeId', 'placeName', 'lat', 'lng', 'address',
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
    lat = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    lng = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    activityType = serializers.CharField(required=False, allow_blank=True)
    customTitle = serializers.CharField(required=False, allow_blank=True)
    day = serializers.IntegerField(required=False, allow_null=True)
    startTime = serializers.CharField(required=False, allow_blank=True)
    durationMin = serializers.IntegerField(required=False, allow_null=True)
    memo = serializers.CharField(required=False, allow_blank=True)


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
    order = serializers.IntegerField()


class EventReorderSerializer(serializers.Serializer):
    """Event 순서 변경 Serializer"""
    events = EventReorderItemSerializer(many=True)


class EventReorderResponseSerializer(serializers.Serializer):
    """Event 순서 변경 응답 Serializer"""
    events = EventSerializer(many=True)
    routeSummary = serializers.DictField()
