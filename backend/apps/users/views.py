"""
User 인증 관련 Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.conf import settings

from .serializers import UserSerializer, RegisterSerializer, LoginSerializer
from .utils import generate_access_token, generate_refresh_token, decode_token
from .authentication import JWTAuthentication
from django.contrib.auth.models import User


class RegisterView(APIView):
    """회원가입"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': '회원가입이 완료되었습니다.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """로그인"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # 사용자 인증
        user = authenticate(username=username, password=password)
        if not user:
            return Response({
                'error': '아이디 또는 비밀번호가 올바르지 않습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 토큰 생성
        access_token = generate_access_token(user)
        refresh_token = generate_refresh_token(user)
        
        # Response 생성
        response = Response({
            'message': '로그인 성공',
            'user': UserSerializer(user).data
        })
        
        # httpOnly 쿠키 설정
        is_secure = not settings.DEBUG  # Production에서는 Secure 활성화
        
        response.set_cookie(
            key='accessToken',
            value=access_token,
            max_age=60 * 15,  # 15분
            httponly=True,
            secure=is_secure,
            samesite='Lax'  # CSRF 방어
        )
        
        response.set_cookie(
            key='refreshToken',
            value=refresh_token,
            max_age=60 * 60 * 24 * 7,  # 7일
            httponly=True,
            secure=is_secure,
            samesite='Lax'
        )
        
        return response


class LogoutView(APIView):
    """로그아웃"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request):
        response = Response({
            'message': '로그아웃되었습니다.'
        })
        
        # 쿠키 삭제
        response.delete_cookie('accessToken')
        response.delete_cookie('refreshToken')
        
        return response


class RefreshView(APIView):
    """토큰 갱신"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get('refreshToken')
        
        if not refresh_token:
            return Response({
                'error': 'Refresh token이 없습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Refresh token 검증
            payload = decode_token(refresh_token)
            
            if payload.get('type') != 'refresh':
                return Response({
                    'error': '유효하지 않은 토큰 타입입니다.'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # 사용자 조회
            user = User.objects.get(id=payload['user_id'])
            
            # 새 Access token 생성
            new_access_token = generate_access_token(user)
            
            response = Response({
                'message': '토큰이 갱신되었습니다.'
            })
            
            # 새 Access token 쿠키 설정
            is_secure = not settings.DEBUG
            response.set_cookie(
                key='accessToken',
                value=new_access_token,
                max_age=60 * 15,
                httponly=True,
                secure=is_secure,
                samesite='Lax'
            )
            
            return response
            
        except User.DoesNotExist:
            return Response({
                'error': '사용자를 찾을 수 없습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    """현재 로그인한 사용자 정보"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data
        })
