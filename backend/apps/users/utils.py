"""
JWT 토큰 생성 및 검증 유틸리티
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.models import User


def generate_access_token(user):
    """Access Token 생성 (15분)"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(minutes=15),
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def generate_refresh_token(user):
    """Refresh Token 생성 (7일)"""
    payload = {
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def decode_token(token):
    """토큰 검증 및 디코드"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('토큰이 만료되었습니다.')
    except jwt.InvalidTokenError:
        raise Exception('유효하지 않은 토큰입니다.')
