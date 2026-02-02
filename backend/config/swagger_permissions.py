"""
Swagger/ReDoc 접근 권한 설정
Development 환경에서는 인증 불필요, Production에서는 Admin 권한 필요
"""
from rest_framework import permissions
from django.conf import settings


class IsAdminUserOrDebugMode(permissions.BasePermission):
    """
    개발 환경(DEBUG=True)에서는 모든 사용자 접근 허용
    프로덕션 환경(DEBUG=False)에서는 Admin 사용자만 접근 허용
    """
    
    def has_permission(self, request, view):
        # 개발 환경: 모든 사용자 접근 허용
        if settings.DEBUG:
            return True
        
        # 프로덕션 환경: Admin 사용자만 접근 허용
        return request.user and request.user.is_staff
