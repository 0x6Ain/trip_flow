"""
Firebase Authentication Backend
"""
import firebase_admin
from firebase_admin import credentials, auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

# Firebase Admin 초기화 (한 번만)
def initialize_firebase():
    """Firebase Admin SDK 초기화"""
    if not firebase_admin._apps:
        try:
            credentials_path = settings.FIREBASE_CONFIG.get('credentials_path')
            if credentials_path:
                print(f"🔥 Firebase Admin SDK 초기화 시작... (credentials: {credentials_path})")
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase Admin SDK 초기화 성공!")
            else:
                print("⚠️ Firebase credentials_path가 설정되지 않았습니다.")
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"❌ Firebase Admin SDK 초기화 실패: {e}")
            raise

# 초기화 실행
initialize_firebase()


class FirebaseAuthentication(BaseAuthentication):
    """
    Firebase ID Token 기반 인증
    Authorization: Bearer <firebase_id_token>
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        id_token = auth_header.split('Bearer ')[1]
        
        try:
            # Firebase ID token 검증
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token.get('email', '')
            name = decoded_token.get('name', '')
            
            # Firebase provider 확인
            firebase_provider = 'email'
            if 'firebase' in decoded_token:
                sign_in_provider = decoded_token['firebase'].get('sign_in_provider', 'email')
                if sign_in_provider == 'google.com':
                    firebase_provider = 'google'
            
            # 사용자 찾기 또는 생성
            user, created = User.objects.get_or_create(
                oauth_id=uid,
                defaults={
                    'email': email,
                    'username': email.split('@')[0] if email else uid,
                    'name': name,
                    'oauth_provider': firebase_provider,
                }
            )
            
            # 기존 사용자 정보 업데이트 (email, name이 변경될 수 있음)
            if not created:
                updated = False
                if user.email != email and email:
                    user.email = email
                    updated = True
                if user.name != name and name:
                    user.name = name
                    updated = True
                if updated:
                    user.save()
            
            return (user, None)
            
        except auth.InvalidIdTokenError:
            raise AuthenticationFailed('Invalid Firebase ID token')
        except auth.ExpiredIdTokenError:
            raise AuthenticationFailed('Firebase ID token expired')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
