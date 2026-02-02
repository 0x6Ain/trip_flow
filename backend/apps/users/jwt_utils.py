"""
JWT Token 생성 및 검증 유틸리티
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

# JWT Secret Key (settings에서 가져오기)
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = 'HS256'

# Token 만료 시간
ACCESS_TOKEN_LIFETIME = timedelta(minutes=30)  # 30분
REFRESH_TOKEN_LIFETIME = timedelta(days=7)     # 7일


def generate_access_token(user):
    """
    Access Token 생성
    """
    payload = {
        'user_id': user.id,
        'email': user.email,
        'type': 'access',
        'exp': datetime.utcnow() + ACCESS_TOKEN_LIFETIME,
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def generate_refresh_token(user):
    """
    Refresh Token 생성
    """
    payload = {
        'user_id': user.id,
        'type': 'refresh',
        'exp': datetime.utcnow() + REFRESH_TOKEN_LIFETIME,
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token):
    """
    Token 디코딩 및 검증
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')


def verify_access_token(token):
    """
    Access Token 검증 및 사용자 반환
    """
    payload = decode_token(token)
    
    if payload.get('type') != 'access':
        raise Exception('Invalid token type')
    
    user_id = payload.get('user_id')
    if not user_id:
        raise Exception('Invalid token payload')
    
    try:
        user = User.objects.get(id=user_id)
        return user
    except User.DoesNotExist:
        raise Exception('User not found')
