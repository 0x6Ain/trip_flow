"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.trips import views as trip_views
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework.authentication import SessionAuthentication

schema_view = get_schema_view(
    openapi.Info(
        title="Trip Flow API",
        default_version="v1",
        description="Django REST Framework 기반의 여행 계획 API",
    ),
    public=True,
    permission_classes=(permissions.IsAdminUser,),
    authentication_classes=(SessionAuthentication,),
)

# Share Router 설정
share_router = DefaultRouter()
share_router.register(r'share', trip_views.SharedTripViewSet, basename='shared-trip')

urlpatterns = [
    path('_a/', admin.site.urls),
    path('api/', include('apps.urls')),
    path('api/', include(share_router.urls)),
    
    # API Documentation (Admin only)
    path('_d/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('_d/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
