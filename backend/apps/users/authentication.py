"""
JWT 인증 클래스
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from .utils import decode_token


class JWTAuthentication(BaseAuthentication):
    """
    JWT 토큰 기반 인증
    쿠키에서 accessToken을 읽어서 검증
    """
    
    def authenticate(self, request):
        # 쿠키에서 access token 가져오기
        access_token = request.COOKIES.get('accessToken')
        
        if not access_token:
            return None
        
        try:
            payload = decode_token(access_token)
            
            # Access token 타입 확인
            if payload.get('type') != 'access':
                raise AuthenticationFailed('유효하지 않은 토큰 타입입니다.')
            
            # 사용자 조회
            user = User.objects.get(id=payload['user_id'])
            
            return (user, None)
            
        except User.DoesNotExist:
            raise AuthenticationFailed('사용자를 찾을 수 없습니다.')
        except Exception as e:
            raise AuthenticationFailed(str(e))
