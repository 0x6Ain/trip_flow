"""
JWT Authentication Backend
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .jwt_utils import verify_access_token


class JWTAuthentication(BaseAuthentication):
    """
    JWT Access Token 기반 인증
    Authorization: Bearer <access_token>
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split('Bearer ')[1]
        
        try:
            user = verify_access_token(token)
            return (user, None)
        except Exception as e:
            raise AuthenticationFailed(str(e))
