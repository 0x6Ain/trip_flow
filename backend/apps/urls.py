from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

from apps.trips import views as trip_views
from apps.events import views as event_views
from apps.routes import views as route_views


def health_check(request):
    """헬스체크 엔드포인트"""
    return JsonResponse({'status': 'healthy'})

# Main Router
router = DefaultRouter()
router.register(r'trips', trip_views.TripViewSet, basename='trip')

urlpatterns = [
    # Health Check
    path('health/', health_check, name='health-check'),
    
    # Auth URLs
    path('auth/', include('apps.users.urls')),
    
    # Main Router URLs
    path('', include(router.urls)),
    
    # Trip Events - nested resource
    path('trips/<int:trip_id>/events/', event_views.TripEventViewSet.as_view({
        'post': 'create'
    }), name='trip-events-create'),
    path('trips/<int:trip_id>/events/reorder/', event_views.TripEventViewSet.as_view({
        'patch': 'reorder'
    }), name='trip-events-reorder'),
    path('trips/<int:trip_id>/events/<int:event_id>/', event_views.TripEventViewSet.as_view({
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='trip-events-detail'),
    
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
]
