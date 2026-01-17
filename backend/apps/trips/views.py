from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema

from .models import Trip
from .serializers import (
    TripCreateSerializer, TripSerializer, TripUpdateSerializer,
    ShareSerializer, ShareResponseSerializer
)


class TripViewSet(mixins.CreateModelMixin,
                  mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin,
                  GenericViewSet):
    """Trip CRUD ViewSet"""
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    lookup_field = 'pk'
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TripCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TripUpdateSerializer
        elif self.action == 'share':
            return ShareSerializer
        return TripSerializer
    
    def get_object(self):
        """만료된 Trip 체크"""
        obj = super().get_object()
        if obj.is_expired():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'error': {'code': 'TRIP_EXPIRED', 'message': 'Trip이 만료되었습니다.'}},
                code=status.HTTP_410_GONE
            )
        return obj
    
    def create(self, request, *args, **kwargs):
        """Trip 생성"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        start_location = data['startLocation']
        
        trip = Trip.objects.create(
            title=data['title'],
            city=data['city'],
            start_lat=start_location['lat'],
            start_lng=start_location['lng'],
            owner_type='GUEST'
        )
        
        response_serializer = TripSerializer(trip)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def partial_update(self, request, *args, **kwargs):
        """Trip 업데이트"""
        trip = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        if 'title' in data:
            trip.title = data['title']
        if 'city' in data:
            trip.city = data['city']
        if 'startLocation' in data:
            start_location = data['startLocation']
            trip.start_lat = start_location['lat']
            trip.start_lng = start_location['lng']
        
        trip.save()
        
        response_serializer = TripSerializer(trip)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        request_body=ShareSerializer,
        responses={201: ShareResponseSerializer}
    )
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Trip 공유 (스냅샷 생성)"""
        trip = self.get_object()
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            expiry_days = 7
        else:
            expiry_days = serializer.validated_data.get('expiryDays', 7)
        
        # expires_at 업데이트
        trip.expires_at = timezone.now() + timezone.timedelta(days=expiry_days)
        trip.save()
        
        # 공유 URL 생성
        share_url = f"https://tripflow.app/trip/{trip.id}"
        
        response_data = {
            'shareId': trip.id,
            'shareUrl': share_url,
            'expiresAt': trip.expires_at,
            'isPublic': True
        }
        
        response_serializer = ShareResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SharedTripViewSet(GenericViewSet):
    """공유된 Trip ViewSet"""
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    lookup_field = 'pk'
    lookup_url_kwarg = 'share_id'
    
    def get_object(self):
        """만료된 Trip 체크"""
        obj = super().get_object()
        if obj.is_expired():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'error': {'code': 'TRIP_EXPIRED', 'message': 'Trip이 만료되었습니다.'}},
                code=status.HTTP_410_GONE
            )
        return obj
    
    def retrieve(self, request, share_id=None):
        """공유된 Trip 조회"""
        trip = self.get_object()
        trip_serializer = TripSerializer(trip)
        
        response_data = {
            'trip': trip_serializer.data,
            'isReadOnly': True,
            'expiresAt': trip.expires_at.strftime('%Y-%m-%dT%H:%M:%SZ') if trip.expires_at else None
        }
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def copy(self, request, share_id=None):
        """공유된 Trip 복사"""
        original_trip = self.get_object()
        
        # 새로운 Trip 생성
        new_trip = Trip.objects.create(
            title=f"{original_trip.title} (복사본)",
            city=original_trip.city,
            start_lat=original_trip.start_lat,
            start_lng=original_trip.start_lng,
            owner_type='GUEST'
        )
        
        # Places 복사
        for place in original_trip.places.all():
            place.pk = None
            place.trip = new_trip
            place.save()
        
        serializer = TripSerializer(new_trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
