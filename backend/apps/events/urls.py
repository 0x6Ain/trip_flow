"""
Event URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripEventViewSet

# Trip 내 Event 라우터
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
]
