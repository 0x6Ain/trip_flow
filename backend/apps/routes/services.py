import requests
from django.conf import settings
from django.core.cache import cache
from .models import RouteCache
from django.utils import timezone
import math


class GoogleMapsService:
    """Google Maps API 서비스"""
    
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.places_api_url = 'https://maps.googleapis.com/maps/api/place'
        self.directions_api_url = 'https://maps.googleapis.com/maps/api/directions/json'
    
    def search_places(self, query, location=None, radius=None):
        """장소 검색 (Google Places API)"""
        url = f'{self.places_api_url}/textsearch/json'
        
        params = {
            'query': query,
            'key': self.api_key,
            'language': 'ko'
        }
        
        if location:
            params['location'] = location
        if radius:
            params['radius'] = radius
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'OK':
                results = []
                for place in data.get('results', []):
                    results.append({
                        'placeId': place.get('place_id'),
                        'name': place.get('name'),
                        'formattedAddress': place.get('formatted_address'),
                        'location': {
                            'lat': place['geometry']['location']['lat'],
                            'lng': place['geometry']['location']['lng']
                        },
                        'types': place.get('types', []),
                        'rating': place.get('rating'),
                        'userRatingsTotal': place.get('user_ratings_total')
                    })
                return {'results': results}
            else:
                return {'results': []}
        except Exception as e:
            print(f"Places API Error: {str(e)}")
            return {'results': []}
    
    def calculate_route(self, origin, destination):
        """
        두 지점 간 루트 계산 (Google Directions API)
        캐시를 먼저 확인하고, 없으면 API 호출
        """
        # origin, destination이 place_id 형태인 경우
        origin_key = origin if isinstance(origin, str) else f"{origin['lat']},{origin['lng']}"
        dest_key = destination if isinstance(destination, str) else f"{destination['lat']},{destination['lng']}"
        
        # 캐시 확인
        cache_key = f"route:{origin_key}:{dest_key}"
        cached_route = cache.get(cache_key)
        
        if cached_route:
            return cached_route
        
        # DB 캐시 확인 (place_id인 경우)
        if isinstance(origin, str) and isinstance(destination, str):
            db_cached = RouteCache.get_route(origin, destination)
            if db_cached:
                route_data = {
                    'durationMin': db_cached.duration_min,
                    'distanceKm': float(db_cached.distance_km),
                    'polyline': db_cached.polyline
                }
                cache.set(cache_key, route_data, 3600)  # 1시간
                return route_data
        
        # API 호출
        params = {
            'origin': origin_key,
            'destination': dest_key,
            'key': self.api_key,
            'mode': 'driving',
            'language': 'ko'
        }
        
        try:
            response = requests.get(self.directions_api_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'OK':
                route = data['routes'][0]['legs'][0]
                
                route_data = {
                    'durationMin': route['duration']['value'] // 60,
                    'distanceKm': round(route['distance']['value'] / 1000, 2),
                    'polyline': data['routes'][0]['overview_polyline']['points']
                }
                
                # 캐시 저장
                cache.set(cache_key, route_data, 3600)  # 1시간
                
                # DB 캐시 저장 (place_id인 경우)
                if isinstance(origin, str) and isinstance(destination, str):
                    RouteCache.objects.update_or_create(
                        from_place_id=origin,
                        to_place_id=destination,
                        defaults={
                            'duration_min': route_data['durationMin'],
                            'distance_km': route_data['distanceKm'],
                            'polyline': route_data['polyline'],
                            'expires_at': timezone.now() + timezone.timedelta(days=7)
                        }
                    )
                
                return route_data
            else:
                return None
        except Exception as e:
            print(f"Directions API Error: {str(e)}")
            return None


class RouteOptimizer:
    """루트 최적화 알고리즘"""
    
    def __init__(self, google_maps_service):
        self.maps_service = google_maps_service
    
    def calculate_distance(self, point1, point2):
        """두 지점 간 직선 거리 계산 (Haversine formula)"""
        lat1, lng1 = float(point1['lat']), float(point1['lng'])
        lat2, lng2 = float(point2['lat']), float(point2['lng'])
        
        R = 6371  # 지구 반경 (km)
        
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def nearest_neighbor(self, start_location, places):
        """Nearest Neighbor 알고리즘"""
        if not places:
            return []
        
        unvisited = places.copy()
        route = []
        current = start_location
        
        while unvisited:
            # 가장 가까운 장소 찾기
            nearest = min(
                unvisited,
                key=lambda p: self.calculate_distance(current, p)
            )
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        
        return route
    
    def two_opt_swap(self, route, i, k):
        """2-opt swap"""
        new_route = route[:i] + route[i:k+1][::-1] + route[k+1:]
        return new_route
    
    def calculate_route_distance(self, start_location, places):
        """전체 루트의 거리 계산"""
        if not places:
            return 0
        
        total_distance = 0
        current = start_location
        
        for place in places:
            total_distance += self.calculate_distance(current, place)
            current = place
        
        return total_distance
    
    def optimize(self, start_location, places, iterations=2):
        """
        루트 최적화
        1. Nearest Neighbor로 초기 루트 생성
        2. 2-opt swap으로 개선
        """
        if len(places) <= 1:
            return places
        
        # Nearest Neighbor로 초기 루트 생성
        route = self.nearest_neighbor(start_location, places)
        best_distance = self.calculate_route_distance(start_location, route)
        
        # 2-opt swap으로 개선
        for _ in range(iterations):
            improved = False
            for i in range(len(route) - 1):
                for k in range(i + 1, len(route)):
                    new_route = self.two_opt_swap(route, i, k)
                    new_distance = self.calculate_route_distance(start_location, new_route)
                    
                    if new_distance < best_distance:
                        route = new_route
                        best_distance = new_distance
                        improved = True
            
            if not improved:
                break
        
        return route
