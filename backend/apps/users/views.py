"""
User 인증 관련 Views (Firebase + JWT Hybrid)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Firebase Admin SDK 초기화 보장을 위해 firebase_auth를 먼저 import
from . import firebase_auth as fb_module
from firebase_admin import auth as firebase_auth

from .serializers import (
    UserSerializer,
    FirebaseRegisterRequestSerializer,
    FirebaseLoginRequestSerializer,
    TokenResponseSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    UserResponseSerializer,
    ErrorResponseSerializer,
)
from .authentication import JWTAuthentication
from .jwt_utils import generate_access_token, generate_refresh_token, decode_token
from .models import UserOAuthProvider
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class RegisterView(APIView):
    """
    회원가입 API
    
    POST /api/auth/register/
    Body: {
        "provider": "email" | "google",
        "token": "<firebase_id_token>",
        "email": "user@example.com",     // required
        "name": "홍길동",                 // optional
        "profileImage": "https://..."    // optional
    }
    Response: { "accessToken": "...", "refreshToken": "..." }
    
    프론트엔드 흐름:
    1. Firebase SDK로 회원가입 (createUserWithEmailAndPassword 또는 Google 로그인)
    2. Firebase user 객체에서 정보 추출
    3. Firebase ID Token 획득
    4. 백엔드 호출: POST /api/auth/register/ { provider, token, email, name, profileImage }
    5. 사용자 정보가 필요하면: GET /api/auth/me/ (Authorization: Bearer <accessToken>)
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="회원가입",
        operation_description="""
        Firebase 인증을 통한 회원가입 API
        
        프론트엔드에서 Firebase SDK로 먼저 회원가입을 완료하고, 
        Firebase ID Token을 획득한 후 이 API를 호출합니다.
        
        성공 시 JWT Access Token과 Refresh Token을 반환합니다.
        사용자 정보가 필요한 경우 GET /api/auth/me/ 를 호출하세요.
        """,
        tags=['auth'],
        request_body=FirebaseRegisterRequestSerializer,
        responses={
            201: openapi.Response(
                description="회원가입 성공",
                schema=TokenResponseSerializer,
                examples={
                    'application/json': {
                        'message': '회원가입 성공',
                        'accessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        'refreshToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                }
            ),
            400: openapi.Response(
                description="잘못된 요청",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'provider, token, and email are required'
                    }
                }
            ),
            401: openapi.Response(
                description="Firebase 토큰 인증 실패",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'Invalid Firebase ID token'
                    }
                }
            )
        }
    )
    def post(self, request):
        provider = request.data.get('provider')
        token = request.data.get('token')
        email = request.data.get('email')
        name = request.data.get('name')
        profile_image = request.data.get('profileImage', '')
        
        # 필수 필드 검증
        if not provider or not token or not email:
            return Response({
                'error': 'provider, token, and email are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if provider not in ['email', 'google']:
            return Response({
                'error': 'Invalid provider. Supported: email, google'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Firebase ID Token 검증
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token['uid']
            token_email = decoded_token.get('email', '')
            email_verified = decoded_token.get('email_verified', False)
            
            # 이메일 일치 확인
            if email != token_email:
                return Response({
                    'error': 'Email mismatch between request and token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 이미 가입된 사용자인지 확인 (email 기준)
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                providers_list = existing_user.get_all_providers()
                return Response({
                    'error': f'User with this email already exists (registered with {", ".join(providers_list)}). Please use /api/auth/login/ instead.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # oauth_id로도 확인 (혹시 모를 중복 방지)
            if UserOAuthProvider.objects.filter(provider=provider, oauth_id=uid).exists():
                return Response({
                    'error': 'User already exists. Please use /api/auth/login/ instead.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 새 사용자 생성
            user = User.objects.create(
                oauth_id=uid,
                email=email,
                username=email.split('@')[0],
                name=name or email.split('@')[0],
                profile_image=profile_image,
                oauth_provider=provider,
                email_verified=email_verified,  # Firebase 이메일 인증 상태 저장
            )
            
            # UserOAuthProvider 생성
            UserOAuthProvider.objects.create(
                user=user,
                provider=provider,
                oauth_id=uid
            )
            
            # JWT 토큰 생성
            access_token = generate_access_token(user)
            refresh_token = generate_refresh_token(user)
            
            response = Response({
                'message': '회원가입 성공',
                'accessToken': access_token,
                'refreshToken': refresh_token,  # 모바일 앱용 (body)
            }, status=status.HTTP_201_CREATED)
            
            # 웹 브라우저용: HttpOnly Cookie 설정
            response.set_cookie(
                key='refreshToken',
                value=refresh_token,
                httponly=True,  # JavaScript에서 접근 불가 (XSS 방어)
                secure=not settings.DEBUG,  # Production에서만 HTTPS 강제
                samesite='Lax',  # CSRF 방어
                max_age=7 * 24 * 60 * 60,  # 7일
                path='/',
            )
            
            return response
            
        except firebase_auth.InvalidIdTokenError:
            return Response({
                'error': 'Invalid Firebase ID token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except firebase_auth.ExpiredIdTokenError:
            return Response({
                'error': 'Firebase ID token expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({
                'error': f'Registration failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    로그인 API
    
    POST /api/auth/login/
    Body: {
        "provider": "email" | "google",
        "token": "<firebase_id_token>"
    }
    Response: { "accessToken": "...", "refreshToken": "..." }
    
    프론트엔드 흐름:
    1. Firebase SDK로 로그인 (signInWithEmailAndPassword 또는 Google 로그인)
    2. Firebase ID Token 획득
    3. 백엔드 호출: POST /api/auth/login/ { provider, token }
    4. 사용자 정보가 필요하면: GET /api/auth/me/ (Authorization: Bearer <accessToken>)
    
    참고: 사용자 정보는 Firebase Token에서 자동으로 추출됩니다.
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="로그인",
        operation_description="""
        Firebase 인증을 통한 로그인 API
        
        프론트엔드에서 Firebase SDK로 먼저 로그인을 완료하고, 
        Firebase ID Token을 획득한 후 이 API를 호출합니다.
        
        성공 시 JWT Access Token과 Refresh Token을 반환합니다.
        사용자 정보가 필요한 경우 GET /api/auth/me/ 를 호출하세요.
        """,
        tags=['auth'],
        request_body=FirebaseLoginRequestSerializer,
        responses={
            200: openapi.Response(
                description="로그인 성공",
                schema=TokenResponseSerializer,
                examples={
                    'application/json': {
                        'message': '로그인 성공',
                        'accessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        'refreshToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                }
            ),
            400: openapi.Response(
                description="잘못된 요청",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'provider and token are required'
                    }
                }
            ),
            401: openapi.Response(
                description="Firebase 토큰 인증 실패",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'Invalid Firebase ID token'
                    }
                }
            ),
            404: openapi.Response(
                description="사용자를 찾을 수 없음",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'User not found. Please register first at /api/auth/register/'
                    }
                }
            )
        }
    )
    def post(self, request):
        provider = request.data.get('provider')
        token = request.data.get('token')
        
        if not provider or not token:
            return Response({
                'error': 'provider and token are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if provider not in ['email', 'google']:
            return Response({
                'error': 'Invalid provider. Supported: email, google'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Firebase ID Token 검증
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token['uid']
            token_email = decoded_token.get('email', '')
            token_name = decoded_token.get('name', '')
            token_picture = decoded_token.get('picture', '')
            email_verified = decoded_token.get('email_verified', False)
            
            # 사용자 조회 (UserOAuthProvider를 통해)
            user = None
            oauth_provider_link = None
            
            # 1. UserOAuthProvider에서 현재 provider와 uid로 조회
            try:
                oauth_provider_link = UserOAuthProvider.objects.select_related('user').get(
                    provider=provider,
                    oauth_id=uid
                )
                user = oauth_provider_link.user
                print(f"✅ {provider}로 사용자 {user.email} 찾음")
                
            except UserOAuthProvider.DoesNotExist:
                # 2. 못 찾으면 email로 사용자를 찾아서 새 provider 추가
                if token_email:
                    try:
                        user = User.objects.get(email=token_email)
                        print(f"➕ 사용자 {user.email}에 {provider} provider 추가")
                        
                        # 새 provider 연결 추가
                        oauth_provider_link = UserOAuthProvider.objects.create(
                            user=user,
                            provider=provider,
                            oauth_id=uid
                        )
                        
                    except User.DoesNotExist:
                        pass
            
            if not user:
                return Response({
                    'error': 'User not found. Please register first at /api/auth/register/'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 주 provider를 현재 로그인한 provider로 업데이트
            if user.oauth_provider != provider or user.oauth_id != uid:
                user.oauth_provider = provider
                user.oauth_id = uid
                user.save()
            
            # 이메일 provider는 이메일 인증 필수 (Firebase Token의 최신 값으로 체크)
            if provider == 'email' and not email_verified:
                return Response({
                    'error': 'Email verification required. Please check your email and verify your account.',
                    'email_verified': False
                }, status=status.HTTP_403_FORBIDDEN)
            
            # DB에 이메일 인증 상태 동기화 (체크 통과 후)
            if user.email_verified != email_verified:
                user.email_verified = email_verified
                user.save()
                print(f"🔄 사용자 {user.email}의 이메일 인증 상태 업데이트: {email_verified}")
            
            # 사용자 정보 업데이트 (Firebase Token에서)
            updated = False
            if token_email and user.email != token_email:
                user.email = token_email
                updated = True
            if token_name and user.name != token_name:
                user.name = token_name
                updated = True
            if token_picture and user.profile_image != token_picture:
                user.profile_image = token_picture
                updated = True
            if updated:
                user.save()
            
            # JWT 토큰 생성
            access_token = generate_access_token(user)
            refresh_token = generate_refresh_token(user)
            
            response = Response({
                'message': '로그인 성공',
                'accessToken': access_token,
                'refreshToken': refresh_token,  # 모바일 앱용 (body)
            }, status=status.HTTP_200_OK)
            
            # 웹 브라우저용: HttpOnly Cookie 설정
            response.set_cookie(
                key='refreshToken',
                value=refresh_token,
                httponly=True,  # JavaScript에서 접근 불가 (XSS 방어)
                secure=not settings.DEBUG,  # Production에서만 HTTPS 강제
                samesite='Lax',  # CSRF 방어
                max_age=7 * 24 * 60 * 60,  # 7일
                path='/',
            )
            
            return response
            
        except firebase_auth.InvalidIdTokenError:
            return Response({
                'error': 'Invalid Firebase ID token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except firebase_auth.ExpiredIdTokenError:
            return Response({
                'error': 'Firebase ID token expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({
                'error': f'Authentication failed: {str(e)}'
            }, status=status.HTTP_401_UNAUTHORIZED)


class RefreshTokenView(APIView):
    """
    Refresh Token으로 새 Access Token 발급
    
    POST /api/auth/refresh/
    Body: { "refreshToken": "<refresh_token>" }
    Response: { "accessToken": "..." }
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Access Token 갱신",
        operation_description="""
        Refresh Token을 사용하여 새로운 Access Token을 발급받습니다.
        
        Access Token이 만료되었을 때 사용합니다.
        Refresh Token은 7일간 유효하며, 새 Access Token은 30분간 유효합니다.
        """,
        request_body=RefreshTokenRequestSerializer,
        responses={
            200: openapi.Response(
                description="토큰 갱신 성공",
                schema=RefreshTokenResponseSerializer,
                examples={
                    'application/json': {
                        'message': 'Token refreshed',
                        'accessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                }
            ),
            400: openapi.Response(
                description="잘못된 요청",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'refreshToken is required'
                    }
                }
            ),
            401: openapi.Response(
                description="토큰 인증 실패",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'Invalid token type'
                    }
                }
            )
        }
    )
    def post(self, request):
        # 1순위: Cookie에서 확인 (웹 브라우저)
        refresh_token = request.COOKIES.get('refreshToken')
        
        # 2순위: Body에서 확인 (모바일 앱)
        if not refresh_token:
            refresh_token = request.data.get('refreshToken')
        
        if not refresh_token:
            return Response({
                'error': 'refreshToken is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Refresh Token 검증
            payload = decode_token(refresh_token)
            
            if payload.get('type') != 'refresh':
                return Response({
                    'error': 'Invalid token type'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # 사용자 조회
            user = User.objects.get(id=payload['user_id'])
            
            # 새 Access Token 생성
            new_access_token = generate_access_token(user)
            
            return Response({
                'message': 'Token refreshed',
                'accessToken': new_access_token,
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    """
    현재 로그인한 사용자 정보 (JWT Token 필요)
    
    GET /api/auth/me/
    Headers: Authorization: Bearer <access_token>
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    @swagger_auto_schema(
        operation_summary="현재 사용자 정보 조회",
        operation_description="""
        JWT Access Token을 사용하여 현재 로그인한 사용자의 정보를 조회합니다.
        
        Authorization 헤더에 Bearer 토큰을 포함해야 합니다.
        """,
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="JWT Access Token (Bearer <token>)",
                type=openapi.TYPE_STRING,
                required=True,
            )
        ],
        responses={
            200: openapi.Response(
                description="사용자 정보 조회 성공",
                schema=UserResponseSerializer,
                examples={
                    'application/json': {
                        'user': {
                            'id': 1,
                            'username': 'user123',
                            'email': 'user@example.com',
                            'first_name': '홍길동',
                            'last_name': '',
                            'date_joined': '2024-01-01T00:00:00Z'
                        }
                    }
                }
            ),
            401: openapi.Response(
                description="인증 실패",
                schema=ErrorResponseSerializer,
                examples={
                    'application/json': {
                        'error': 'Authentication credentials were not provided.'
                    }
                }
            )
        }
    )
    def get(self, request):
        """
        현재 사용자 정보를 조회하면서 Firebase의 최신 이메일 인증 상태를 동기화합니다.
        """
        user = request.user
        
        # Firebase에서 최신 사용자 정보 가져오기 (이메일 인증 상태 동기화)
        try:
            # 사용자의 Firebase UID 가져오기
            oauth_provider = user.oauth_providers.filter(provider='email').first() or \
                           user.oauth_providers.filter(provider='google').first()
            
            if oauth_provider and oauth_provider.provider_user_id:
                try:
                    # Firebase에서 최신 사용자 정보 가져오기
                    firebase_user = firebase_auth.get_user(oauth_provider.provider_user_id)
                    
                    # 이메일 인증 상태가 변경되었으면 DB 업데이트
                    if user.email_verified != firebase_user.email_verified:
                        user.email_verified = firebase_user.email_verified
                        user.save(update_fields=['email_verified'])
                        print(f"✅ 이메일 인증 상태 동기화 완료: {user.email} -> {firebase_user.email_verified}")
                except Exception as e:
                    # Firebase 조회 실패 시 로그만 남기고 계속 진행
                    print(f"⚠️ Firebase 사용자 정보 조회 실패: {str(e)}")
        except Exception as e:
            # OAuth provider 조회 실패 시 로그만 남기고 계속 진행
            print(f"⚠️ OAuth provider 조회 실패: {str(e)}")
        
        return Response({
            'user': UserSerializer(user).data
        })


class SyncEmailVerificationView(APIView):
    """
    이메일 인증 상태 동기화 API
    
    POST /api/auth/sync-email-verification/
    Body: { "token": "<firebase_id_token>" }
    
    Firebase에서 이메일 인증을 완료한 후, 백엔드 DB에 동기화합니다.
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="이메일 인증 상태 동기화",
        operation_description="""
        Firebase에서 이메일 인증을 완료한 후, 백엔드 DB에 인증 상태를 동기화합니다.
        
        이메일 인증 완료 페이지에서 자동으로 호출됩니다.
        """,
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['token'],
            properties={
                'token': openapi.Schema(type=openapi.TYPE_STRING, description='Firebase ID Token'),
            }
        ),
        responses={
            200: openapi.Response(
                description="이메일 인증 상태 동기화 성공",
                examples={
                    'application/json': {
                        'message': 'Email verification synced successfully',
                        'email_verified': True
                    }
                }
            ),
            400: openapi.Response(
                description="잘못된 요청",
                schema=ErrorResponseSerializer,
            ),
            404: openapi.Response(
                description="사용자를 찾을 수 없음",
                schema=ErrorResponseSerializer,
            )
        }
    )
    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response({
                'error': 'token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Firebase ID Token 검증
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token['uid']
            email_verified = decoded_token.get('email_verified', False)
            token_email = decoded_token.get('email', '')
            
            # 사용자 조회 (UserOAuthProvider를 통해)
            oauth_provider_link = UserOAuthProvider.objects.filter(oauth_id=uid).first()
            
            if not oauth_provider_link:
                # email로 찾기
                if token_email:
                    user = User.objects.filter(email=token_email).first()
                    if not user:
                        return Response({
                            'error': 'User not found'
                        }, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response({
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                user = oauth_provider_link.user
            
            # 이메일 인증 상태 업데이트
            if user.email_verified != email_verified:
                user.email_verified = email_verified
                user.save()
                print(f"✅ 사용자 {user.email}의 이메일 인증 상태 업데이트: {email_verified}")
            
            return Response({
                'message': 'Email verification synced successfully',
                'email_verified': email_verified
            }, status=status.HTTP_200_OK)
            
        except firebase_auth.InvalidIdTokenError:
            return Response({
                'error': 'Invalid Firebase ID token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except firebase_auth.ExpiredIdTokenError:
            return Response({
                'error': 'Firebase ID token expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({
                'error': f'Sync failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
