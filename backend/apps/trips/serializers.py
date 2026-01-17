from rest_framework import serializers
from drf_yasg.utils import swagger_serializer_method
from core.serializers import LocationSerializer, RouteSummarySerializer
from .models import Trip
from apps.places.serializers import PlaceSerializer


class StartLocationSerializer(LocationSerializer):
    """시작 위치 Serializer (name 필드 추가)"""
    name = serializers.CharField(required=False, allow_blank=True)


class TripCreateSerializer(serializers.Serializer):
    """Trip 생성 Serializer"""
    title = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=255)
    startLocation = StartLocationSerializer()


class TripUpdateSerializer(serializers.Serializer):
    """Trip 업데이트 Serializer"""
    title = serializers.CharField(max_length=255, required=False)
    city = serializers.CharField(max_length=255, required=False)
    startLocation = StartLocationSerializer(required=False)


class TripSerializer(serializers.ModelSerializer):
    """Trip 조회 Serializer"""
    startLocation = serializers.SerializerMethodField()
    routeSummary = serializers.SerializerMethodField()
    places = PlaceSerializer(many=True, read_only=True)
    ownerType = serializers.CharField(source='owner_type')
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ')
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ')
    expiresAt = serializers.DateTimeField(source='expires_at', format='%Y-%m-%dT%H:%M:%SZ', allow_null=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'ownerType', 'title', 'city', 
            'startLocation', 'places', 'routeSummary',
            'createdAt', 'updatedAt', 'expiresAt'
        ]
    
    @swagger_serializer_method(serializer_or_field=LocationSerializer)
    def get_startLocation(self, obj):
        return obj.start_location
    
    @swagger_serializer_method(serializer_or_field=RouteSummarySerializer)
    def get_routeSummary(self, obj):
        return obj.route_summary


class ShareSerializer(serializers.Serializer):
    """Trip 공유 Serializer"""
    expiryDays = serializers.IntegerField(min_value=7, max_value=14, default=7)


class ShareResponseSerializer(serializers.Serializer):
    """Trip 공유 응답 Serializer"""
    shareId = serializers.CharField()
    shareUrl = serializers.CharField()
    expiresAt = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ')
    isPublic = serializers.BooleanField()
