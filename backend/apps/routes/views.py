from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.trips.models import Trip
from apps.events.models import Event
from apps.events.serializers import EventSerializer
from .serializers import (
    RouteCalculateRequestSerializer, RouteCalculateResponseSerializer,
    OptimizeRequestSerializer, OptimizeResponseSerializer,
    OptimizeApplySerializer,
    PlaceSearchQuerySerializer, PlaceSearchResponseSerializer
)
from .services import GoogleMapsService, RouteOptimizer


class PlaceSearchView(APIView):
    """
    장소 검색 API (서버 프록시)

    - Google Places API 키 보호를 위해 서버가 프록시 역할을 합니다.
    - 로그인 여부와 무관하게 사용할 수 있습니다.
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="장소 검색",
        operation_description="""
Google Places(Text Search)로 장소를 검색합니다.

**특징**
- API 키를 클라이언트에 노출하지 않기 위해 서버가 프록시로 호출합니다.
- 로그인 없이도 호출 가능합니다.

**예시**
`GET /places/search/?query=광화문&lat=37.5665&lng=126.9780&radius=20000`
        """,
        tags=['places'],
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, description='검색어', type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('lat', openapi.IN_QUERY, description='중심 위도', type=openapi.TYPE_NUMBER, required=False),
            openapi.Parameter('lng', openapi.IN_QUERY, description='중심 경도', type=openapi.TYPE_NUMBER, required=False),
            openapi.Parameter('radius', openapi.IN_QUERY, description='검색 반경(m)', type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={
            200: openapi.Response(description='검색 성공', schema=PlaceSearchResponseSerializer),
            400: '잘못된 요청'
        }
    )
    def get(self, request):
        serializer = PlaceSearchQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        query = data['query']
        lat = data.get('lat')
        lng = data.get('lng')
        radius = data.get('radius')

        location = None
        if lat is not None and lng is not None:
            location = f"{lat},{lng}"

        results = GoogleMapsService().search_places(query=query, location=location, radius=radius)
        return Response(results)


class TripRouteViewSet(GenericViewSet):
    """Trip 루트 관리 ViewSet"""
    
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
    
    @swagger_auto_schema(
        operation_summary="경로 계산",
        operation_description="""
Google Maps API를 사용하여 경로를 계산합니다.

**주의:** 
- 현재는 계산만 하고 DB에 저장하지 않습니다.
- Events reorder 시 자동으로 저장됩니다.

**요청 예시:**
```json
{
  "startLocation": {
    "lat": 37.5665,
    "lng": 126.9780
  },
  "places": [
    {
      "placeId": "ChIJ...",
      "lat": 37.5796,
      "lng": 126.9770
    }
  ]
}
```
        """,
        tags=['routes'],
        request_body=RouteCalculateRequestSerializer,
        responses={
            200: openapi.Response(description='경로 계산 성공', schema=RouteCalculateResponseSerializer),
            400: '잘못된 요청'
        }
    )
    @action(detail=False, methods=['post'])
    def calculate(self, request, trip_id=None):
        """루트 계산"""
        trip = self.get_trip()
        serializer = RouteCalculateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        start_location = data['startLocation']
        places = data['places']
        
        google_maps = GoogleMapsService()
        routes = []
        total_duration = 0
        total_distance = 0
        
        # 시작 지점 → 첫 번째 장소
        if places:
            first_route = google_maps.calculate_route(start_location, places[0])
            if first_route:
                routes.append({
                    'fromPlaceId': 'start',
                    'toPlaceId': places[0]['placeId'],
                    'durationMin': first_route['durationMin'],
                    'distanceKm': first_route['distanceKm'],
                    'polyline': first_route['polyline']
                })
                total_duration += first_route['durationMin']
                total_distance += first_route['distanceKm']
        
        # 장소 간 루트
        for i in range(len(places) - 1):
            from_place = places[i]
            to_place = places[i + 1]
            
            route = google_maps.calculate_route(
                from_place['placeId'],
                to_place['placeId']
            )
            
            if route:
                routes.append({
                    'fromPlaceId': from_place['placeId'],
                    'toPlaceId': to_place['placeId'],
                    'durationMin': route['durationMin'],
                    'distanceKm': route['distanceKm'],
                    'polyline': route['polyline']
                })
                total_duration += route['durationMin']
                total_distance += route['distanceKm']
        
        # Trip의 route summary 업데이트
        trip.total_duration_min = total_duration
        trip.total_distance_km = total_distance
        trip.save()
        
        response_data = {
            'routes': routes,
            'summary': {
                'totalDurationMin': total_duration,
                'totalDistanceKm': round(total_distance, 2)
            }
        }
        
        response_serializer = RouteCalculateResponseSerializer(response_data)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="경로 최적화",
        operation_description="""
TSP(Traveling Salesman Problem) 알고리즘으로 최적의 방문 순서를 제안합니다.

**특징:**
- 2-opt 알고리즘 사용
- 최대 10개 장소까지 최적화 가능
- 거리 및 시간 개선율 제공

**요청 예시:**
```json
{
  "startLocation": {
    "lat": 37.5665,
    "lng": 126.9780
  },
  "places": [
    {
      "id": 1,
      "placeId": "ChIJ...",
      "lat": 37.5796,
      "lng": 126.9770
    }
  ]
}
```

**응답 예시:**
```json
{
  "original": {
    "totalDurationMin": 120,
    "totalDistanceKm": 25.5
  },
  "optimized": {
    "places": [...],
    "totalDurationMin": 90,
    "totalDistanceKm": 18.3
  },
  "improvement": {
    "durationPercent": 25,
    "distancePercent": 28
  }
}
```
        """,
        tags=['routes'],
        request_body=OptimizeRequestSerializer,
        responses={
            200: openapi.Response(description='최적화 제안 성공', schema=OptimizeResponseSerializer),
            400: '잘못된 요청 (10개 초과 등)'
        }
    )
    @action(detail=False, methods=['post'])
    def optimize(self, request, trip_id=None):
        """루트 최적화 제안"""
        trip = self.get_trip()
        serializer = OptimizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        start_location = data['startLocation']
        places = data['places']
        
        if len(places) > 10:
            return Response(
                {'error': {'code': 'TOO_MANY_PLACES', 'message': '최대 10개의 장소만 최적화할 수 있습니다.'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 현재 순서 계산
        google_maps = GoogleMapsService()
        optimizer = RouteOptimizer(google_maps)
        
        original_distance = optimizer.calculate_route_distance(start_location, places)
        
        # 최적화
        optimized_places = optimizer.optimize(start_location, places, iterations=2)
        optimized_distance = optimizer.calculate_route_distance(start_location, optimized_places)
        
        # 개선율 계산
        if original_distance > 0:
            distance_improvement = int(((original_distance - optimized_distance) / original_distance) * 100)
        else:
            distance_improvement = 0
        
        # 최적화된 places에 order 부여
        optimized_places_with_order = []
        for idx, place in enumerate(optimized_places):
            optimized_places_with_order.append({
                'id': place['id'],
                'placeId': place['placeId'],
                'name': place.get('name', ''),
                'lat': place['lat'],
                'lng': place['lng'],
                'order': float(idx + 1)
            })
        
        # 대략적인 시간 계산 (거리 * 3분/km)
        original_duration = int(original_distance * 3)
        optimized_duration = int(optimized_distance * 3)
        duration_improvement = int(((original_duration - optimized_duration) / original_duration) * 100) if original_duration > 0 else 0
        
        response_data = {
            'original': {
                'totalDurationMin': original_duration,
                'totalDistanceKm': round(original_distance, 2)
            },
            'optimized': {
                'places': optimized_places_with_order,
                'totalDurationMin': optimized_duration,
                'totalDistanceKm': round(optimized_distance, 2)
            },
            'improvement': {
                'durationPercent': max(0, duration_improvement),
                'distancePercent': max(0, distance_improvement)
            }
        }
        
        response_serializer = OptimizeResponseSerializer(response_data)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="최적화 결과 적용",
        operation_description="""
제안된 최적화 결과를 실제로 적용합니다.

**요청 예시:**
```json
{
  "events": [
    { "id": 1, "order": 10 },
    { "id": 2, "order": 20 },
    { "id": 3, "order": 30 }
  ]
}
```
        """,
        tags=['routes'],
        request_body=OptimizeApplySerializer,
        responses={
            200: '최적화 적용 성공',
            400: '잘못된 요청',
            403: '권한 없음'
        }
    )
    @action(detail=False, methods=['post'], url_path='optimize/apply')
    def apply_optimization(self, request, trip_id=None):
        """최적화 결과 적용"""
        trip = self.get_trip()
        serializer = OptimizeApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        events_data = serializer.validated_data.get('events') or serializer.validated_data.get('places', [])
        
        # 순서 업데이트
        for event_data in events_data:
            event = get_object_or_404(Event, id=event_data['id'], trip=trip)
            event.order = event_data['order']
            event.save()
        
        # 업데이트된 events 조회
        updated_events = trip.events.all().order_by('order')
        
        response_data = {
            'events': EventSerializer(updated_events, many=True).data,
            'routeSummary': trip.route_summary
        }
        
        return Response(response_data)
