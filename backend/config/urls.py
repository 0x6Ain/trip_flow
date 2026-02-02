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
from .swagger_permissions import IsAdminUserOrDebugMode

schema_view = get_schema_view(
    openapi.Info(
        title="Trip Flow API",
        default_version="v2.0",
        description="Django REST Framework 기반의 여행 계획 API\n\n"
                    "## 인증\n"
                    "Firebase Authentication을 사용합니다.\n\n"
                    "1. Firebase SDK로 로그인\n"
                    "2. POST /api/auth/firebase-login/ 호출하여 JWT 획득\n"
                    "3. Authorization: Bearer <access_token> 헤더로 API 호출\n\n"
                    "자세한 내용은 FIREBASE_JWT_AUTH.md 참고",
        contact=openapi.Contact(email="admin@tripflow.com"),
    ),
    public=True,
    permission_classes=(IsAdminUserOrDebugMode,),  # Dev에서는 인증 불필요, Prod에서는 Admin만
    authentication_classes=(SessionAuthentication,),
)

# Share Router 설정 (TODO: Implement SharedTripViewSet in v2.1)
# share_router = DefaultRouter()
# share_router.register(r'share', trip_views.SharedTripViewSet, basename='shared-trip')

urlpatterns = [
    path('_a/', admin.site.urls),
    path('api/', include('apps.urls')),
    # path('api/', include(share_router.urls)),  # TODO: Enable after implementing SharedTripViewSet
    
    # API Documentation
    # Dev 환경: 인증 불필요 (DEBUG=True)
    # Prod 환경: Admin 권한 필요 (DEBUG=False)
    path('_d/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('_d/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
