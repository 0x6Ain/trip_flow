from rest_framework import serializers
from .models import Cost


class LocationSerializer(serializers.Serializer):
    """위치 정보 Serializer"""
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class RouteSummarySerializer(serializers.Serializer):
    """루트 요약 Serializer"""
    totalDurationMin = serializers.IntegerField()
    totalDistanceKm = serializers.FloatField()


class CostSerializer(serializers.ModelSerializer):
    """비용 Serializer"""
    id = serializers.IntegerField(read_only=True)
    tripId = serializers.IntegerField(source='trip_id', read_only=True)
    eventId = serializers.IntegerField(source='event_id', required=False, allow_null=True)
    routeSegmentId = serializers.IntegerField(source='route_segment_id', required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    category = serializers.CharField(max_length=20)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    isEstimate = serializers.BooleanField(source='is_estimate', required=False, default=False)
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    
    class Meta:
        model = Cost
        fields = [
            'id', 'tripId', 'eventId', 'routeSegmentId',
            'amount', 'currency', 'category', 'description', 
            'isEstimate', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'tripId', 'createdAt', 'updatedAt']


class CostCreateSerializer(serializers.Serializer):
    """비용 생성 Serializer (trip_id는 context에서, event_id 또는 route_segment_id 필수)"""
    eventId = serializers.IntegerField(required=False, allow_null=True)
    routeSegmentId = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3, default='KRW')
    category = serializers.ChoiceField(choices=Cost.CATEGORY_CHOICES, default='OTHER')
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    isEstimate = serializers.BooleanField(required=False, default=False)
    
    def validate(self, data):
        """eventId 또는 routeSegmentId 중 하나는 필수"""
        if not data.get('eventId') and not data.get('routeSegmentId'):
            raise serializers.ValidationError(
                "eventId 또는 routeSegmentId 중 하나는 필수입니다."
            )
        if data.get('eventId') and data.get('routeSegmentId'):
            raise serializers.ValidationError(
                "eventId와 routeSegmentId를 동시에 지정할 수 없습니다."
            )
        return data
