from rest_framework import serializers
from drf_yasg.utils import swagger_serializer_method
from core.serializers import LocationSerializer, RouteSummarySerializer
from .models import Trip, TripMember
from apps.routes.serializers import RouteSegmentModelSerializer


class StartLocationSerializer(LocationSerializer):
    """시작 위치 Serializer (name 필드 추가)"""
    name = serializers.CharField(required=False, allow_blank=True)


class TripCreateSerializer(serializers.Serializer):
    """Trip 생성 Serializer"""
    title = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=255)
    startLocation = StartLocationSerializer()
    startDate = serializers.DateField(required=False, allow_null=True)
    totalDays = serializers.IntegerField(default=1)


class TripUpdateSerializer(serializers.Serializer):
    """Trip 업데이트 Serializer"""
    title = serializers.CharField(max_length=255, required=False)
    city = serializers.CharField(max_length=255, required=False)
    startLocation = StartLocationSerializer(required=False)
    startDate = serializers.DateField(required=False, allow_null=True)
    totalDays = serializers.IntegerField(required=False)


class TripListSerializer(serializers.ModelSerializer):
    """Trip 목록 조회 Serializer (간단한 정보만)"""
    totalDays = serializers.IntegerField(source='total_days')
    startDate = serializers.DateField(source='start_date', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ')
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ')
    
    class Meta:
        model = Trip
        fields = ['id', 'title', 'city', 'totalDays', 'startDate', 'createdAt', 'updatedAt']


class TripSerializer(serializers.ModelSerializer):
    """Trip 요약 Serializer (상세 정보 제외)"""
    startLocation = serializers.SerializerMethodField()
    startDate = serializers.DateField(source='start_date', required=False, allow_null=True)
    totalDays = serializers.IntegerField(source='total_days')
    createdAt = serializers.DateTimeField(source='created', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    updatedAt = serializers.DateTimeField(source='modified', format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'title', 'city', 
            'startLocation', 'startDate', 'totalDays',
            'createdAt', 'updatedAt'
        ]
    
    @swagger_serializer_method(serializer_or_field=LocationSerializer)
    def get_startLocation(self, obj):
        return obj.start_location
    
    @swagger_serializer_method(serializer_or_field=RouteSummarySerializer)
    def get_routeSummary(self, obj):
        return obj.route_summary


class TripDayDetailSerializer(serializers.Serializer):
    """Trip Day 상세 Serializer (events + next_route 포함)"""
    tripId = serializers.IntegerField(source='trip.id', help_text='Trip ID')
    title = serializers.CharField(source='trip.title', help_text='Trip 제목')
    day = serializers.IntegerField(help_text='Day 번호')
    date = serializers.SerializerMethodField(help_text='날짜 (YYYY-MM-DD)')
    events = serializers.SerializerMethodField(help_text='Events with next route (array)')
    
    def get_date(self, obj):
        """해당 day의 날짜 계산"""
        trip = obj['trip']
        day = obj['day']
        
        if trip.start_date:
            from datetime import timedelta
            day_date = trip.start_date + timedelta(days=day - 1)
            return day_date.strftime('%Y-%m-%d')
        return None
    
    @swagger_serializer_method(serializer_or_field='apps.events.serializers.EventWithNextRouteSerializer')
    def get_events(self, obj):
        """Day의 events (next_route 포함)"""
        from apps.events.serializers import EventWithNextRouteSerializer
        
        trip = obj['trip']
        day = obj['day']
        
        events = trip.events.filter(day=day).order_by('day_order')
        return EventWithNextRouteSerializer(
            events, 
            many=True,
            context={'trip': trip}
        ).data


class TripMemberSerializer(serializers.ModelSerializer):
    """TripMember Serializer"""
    userId = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    name = serializers.CharField(source='user.display_name', read_only=True)
    
    class Meta:
        model = TripMember
        fields = ['id', 'userId', 'email', 'name', 'role']
        read_only_fields = ['id', 'userId', 'email', 'name']


class TripMemberInviteSerializer(serializers.Serializer):
    """Trip 멤버 초대 Serializer"""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['editor', 'viewer'], default='viewer')


class TripMemberUpdateSerializer(serializers.Serializer):
    """Trip 멤버 권한 변경 Serializer"""
    role = serializers.ChoiceField(choices=['owner', 'editor', 'viewer'])


class ShareSerializer(serializers.Serializer):
    """Trip 공유 Serializer"""
    expiryDays = serializers.IntegerField(min_value=7, max_value=14, default=7)


class ShareResponseSerializer(serializers.Serializer):
    """Trip 공유 응답 Serializer"""
    shareId = serializers.CharField()
    shareUrl = serializers.CharField()
    expiresAt = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ')
    isPublic = serializers.BooleanField()
