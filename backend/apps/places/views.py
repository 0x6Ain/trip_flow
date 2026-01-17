from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.shortcuts import get_object_or_404
from django.db.models import Max
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.trips.models import Trip
from .models import Place
from .serializers import (
    PlaceSerializer, PlaceCreateSerializer, PlaceReorderSerializer,
    PlaceReorderResponseSerializer, PlaceSearchResponseSerializer
)
from apps.routes.services import GoogleMapsService


class PlaceSearchViewSet(GenericViewSet):
    """장소 검색 ViewSet"""
    serializer_class = PlaceSearchResponseSerializer
    
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, description='검색어', type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('location', openapi.IN_QUERY, description='중심 좌표 (lat,lng)', type=openapi.TYPE_STRING),
            openapi.Parameter('radius', openapi.IN_QUERY, description='검색 반경 (미터)', type=openapi.TYPE_INTEGER),
        ],
        responses={200: PlaceSearchResponseSerializer}
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """장소 검색 (Google Places API)"""
        query = request.query_params.get('query')
        location = request.query_params.get('location')
        radius = request.query_params.get('radius')
        
        if not query:
            return Response(
                {'error': {'code': 'MISSING_QUERY', 'message': '검색어가 필요합니다.'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        google_maps = GoogleMapsService()
        results = google_maps.search_places(query, location, radius)
        
        serializer = PlaceSearchResponseSerializer(results)
        return Response(serializer.data)


class TripPlaceViewSet(mixins.CreateModelMixin,
                       mixins.DestroyModelMixin,
                       GenericViewSet):
    """Trip 내 장소 관리 ViewSet"""
    serializer_class = PlaceSerializer
    lookup_url_kwarg = 'place_id'
    
    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return Place.objects.filter(trip_id=trip_id)
    
    def get_trip(self):
        """Trip 가져오기 및 만료 체크"""
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        
        if trip.is_expired():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'error': {'code': 'TRIP_EXPIRED', 'message': 'Trip이 만료되었습니다.'}},
                code=status.HTTP_410_GONE
            )
        return trip
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PlaceCreateSerializer
        elif self.action == 'reorder':
            return PlaceReorderSerializer
        return PlaceSerializer
    
    def create(self, request, trip_id=None):
        """Trip에 장소 추가"""
        trip = self.get_trip()
        
        # 최대 10개 제한
        if trip.places.count() >= 10:
            return Response(
                {
                    'error': {
                        'code': 'PLACE_LIMIT_EXCEEDED',
                        'message': 'Trip에는 최대 10개의 장소만 추가할 수 있습니다.',
                        'details': {'currentCount': 10, 'maxCount': 10}
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        place_id = data['placeId']
        
        # 중복 체크
        if trip.places.filter(place_id=place_id).exists():
            return Response(
                {
                    'error': {
                        'code': 'DUPLICATE_PLACE',
                        'message': '이미 추가된 장소입니다.'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # order 계산 (마지막 order + 1.0)
        max_order = trip.places.aggregate(Max('order'))['order__max']
        order = (max_order or 0) + 1.0
        
        # Place 생성
        place = Place.objects.create(
            trip=trip,
            place_id=place_id,
            name=data['name'],
            lat=data['lat'],
            lng=data['lng'],
            order=order
        )
        
        response_serializer = PlaceSerializer(place)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, trip_id=None, place_id=None):
        """장소 삭제"""
        trip = self.get_trip()
        place = get_object_or_404(Place, id=place_id, trip=trip)
        place.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        request_body=PlaceReorderSerializer,
        responses={200: PlaceReorderResponseSerializer}
    )
    @action(detail=False, methods=['patch'])
    def reorder(self, request, trip_id=None):
        """장소 순서 변경"""
        trip = self.get_trip()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        places_data = serializer.validated_data['places']
        
        # 순서 업데이트
        for place_data in places_data:
            place = get_object_or_404(Place, id=place_data['id'], trip=trip)
            place.order = place_data['order']
            place.save()
        
        # 업데이트된 places 조회
        updated_places = trip.places.all().order_by('order')
        
        # 루트 재계산 (TODO: 실제 Google Directions API 호출)
        # 현재는 기본값 반환
        response_data = {
            'places': PlaceSerializer(updated_places, many=True).data,
            'routeSummary': trip.route_summary
        }
        
        response_serializer = PlaceReorderResponseSerializer(response_data)
        return Response(response_serializer.data)
