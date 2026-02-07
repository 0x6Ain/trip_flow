"""
User 인증 관련 URL patterns (Firebase + JWT Hybrid)
"""
from django.urls import path
from .views import RegisterView, LoginView, RefreshTokenView, LogoutView, MeView

urlpatterns = [
    # 회원가입 (Email, Google 등) → JWT 발급
    path('register/', RegisterView.as_view(), name='register'),
    
    # 로그인 (Email, Google 등) → JWT 발급
    path('login/', LoginView.as_view(), name='login'),
    
    # 로그아웃 (Refresh Token 쿠키 삭제)
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # JWT Refresh Token으로 새 Access Token 발급
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    
    # 현재 사용자 정보 (JWT Access Token 필요)
    path('me/', MeView.as_view(), name='me'),
]
