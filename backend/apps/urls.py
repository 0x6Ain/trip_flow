from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.trips import views as trip_views
from apps.places import views as place_views
from apps.routes import views as route_views

# Main Router
router = DefaultRouter()
router.register(r'trips', trip_views.TripViewSet, basename='trip')

urlpatterns = [
    # Main Router URLs
    path('', include(router.urls)),
    
    # Place Search
    path('places/search/', place_views.PlaceSearchViewSet.as_view({
        'get': 'search'
    }), name='place-search'),
    
    # Trip Places - nested resource
    path('trips/<int:trip_id>/places/', place_views.TripPlaceViewSet.as_view({
        'post': 'create'
    }), name='trip-places-list'),
    path('trips/<int:trip_id>/places/reorder/', place_views.TripPlaceViewSet.as_view({
        'patch': 'reorder'
    }), name='trip-places-reorder'),
    path('trips/<int:trip_id>/places/<int:place_id>/', place_views.TripPlaceViewSet.as_view({
        'delete': 'destroy'
    }), name='trip-places-detail'),
    
    # Trip Routes - nested resource
    path('trips/<int:trip_id>/routes/calculate/', route_views.TripRouteViewSet.as_view({
        'post': 'calculate'
    }), name='trip-routes-calculate'),
    path('trips/<int:trip_id>/routes/optimize/', route_views.TripRouteViewSet.as_view({
        'post': 'optimize'
    }), name='trip-routes-optimize'),
    path('trips/<int:trip_id>/routes/optimize/apply/', route_views.TripRouteViewSet.as_view({
        'post': 'apply_optimization'
    }), name='trip-routes-apply-optimization'),
    
    # Route Cache
    path('routes/cache/', route_views.RouteCacheViewSet.as_view({
        'get': 'retrieve_cache'
    }), name='route-cache'),
]
