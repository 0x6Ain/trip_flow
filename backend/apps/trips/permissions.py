"""
Trip 관련 권한 클래스
"""
from rest_framework import permissions
from .models import TripMember


class TripMemberPermission(permissions.BasePermission):
    """TripMember 권한 체크"""
    
    def has_permission(self, request, view):
        """인증 확인"""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """객체별 권한 확인"""
        # Trip 객체에 대한 권한 확인
        from .models import Trip
        from apps.events.models import Event
        
        if isinstance(obj, Trip):
            trip = obj
        elif isinstance(obj, Event):
            trip = obj.trip
        else:
            trip = obj.trip if hasattr(obj, 'trip') else None
        
        if not trip:
            return False
        
        # 멤버 확인
        try:
            membership = TripMember.objects.get(
                trip=trip,
                user=request.user
            )
        except TripMember.DoesNotExist:
            return False
        
        # 읽기 권한 (viewer, editor, owner 모두 가능)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 삭제 권한은 owner만
        if request.method == 'DELETE':
            return membership.role == 'owner'
        
        # 쓰기 권한 (editor, owner)
        if membership.role in ['editor', 'owner']:
            return True
        
        return False


class IsTripOwner(permissions.BasePermission):
    """Trip owner만 허용"""
    
    def has_permission(self, request, view):
        """인증 확인"""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Trip owner 확인"""
        from .models import Trip
        
        if isinstance(obj, Trip):
            trip = obj
        else:
            trip = obj.trip if hasattr(obj, 'trip') else None
        
        if not trip:
            return False
        
        try:
            membership = TripMember.objects.get(
                trip=trip,
                user=request.user
            )
            return membership.role == 'owner'
        except TripMember.DoesNotExist:
            return False
