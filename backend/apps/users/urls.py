"""
User 인증 관련 URL patterns
"""
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshView.as_view(), name='refresh'),
    path('me/', views.MeView.as_view(), name='me'),
]
