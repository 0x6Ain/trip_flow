"""
User 관련 Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """사용자 정보 Serializer"""
    providers = serializers.SerializerMethodField(help_text="연결된 모든 OAuth provider 목록")
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'profile_image', 'oauth_provider', 'providers', 'email_verified', 'date_joined', 'created_at']
        read_only_fields = ['id', 'date_joined', 'created_at', 'providers', 'email_verified']
    
    def get_providers(self, obj):
        """사용자의 모든 provider 목록 반환"""
        return obj.get_all_providers()


# Firebase 인증 관련 Serializers
class FirebaseRegisterRequestSerializer(serializers.Serializer):
    """Firebase 회원가입 요청 Serializer"""
    provider = serializers.ChoiceField(choices=['email', 'google'], required=True, help_text="인증 제공자")
    token = serializers.CharField(required=True, help_text="Firebase ID Token")
    email = serializers.EmailField(required=True, help_text="사용자 이메일")
    name = serializers.CharField(required=False, allow_blank=True, help_text="사용자 이름 (선택)")
    profileImage = serializers.URLField(required=False, allow_blank=True, help_text="프로필 이미지 URL (선택)")


class FirebaseLoginRequestSerializer(serializers.Serializer):
    """Firebase 로그인 요청 Serializer"""
    provider = serializers.ChoiceField(choices=['email', 'google'], required=True, help_text="인증 제공자")
    token = serializers.CharField(required=True, help_text="Firebase ID Token")


class TokenResponseSerializer(serializers.Serializer):
    """JWT 토큰 응답 Serializer"""
    message = serializers.CharField(help_text="응답 메시지")
    accessToken = serializers.CharField(help_text="JWT Access Token (30분 유효)")
    refreshToken = serializers.CharField(help_text="JWT Refresh Token (7일 유효)")


class RefreshTokenRequestSerializer(serializers.Serializer):
    """Refresh Token 요청 Serializer"""
    refreshToken = serializers.CharField(required=True, help_text="JWT Refresh Token")


class RefreshTokenResponseSerializer(serializers.Serializer):
    """Refresh Token 응답 Serializer"""
    message = serializers.CharField(help_text="응답 메시지")
    accessToken = serializers.CharField(help_text="새로운 JWT Access Token")


class UserResponseSerializer(serializers.Serializer):
    """사용자 정보 응답 Serializer"""
    user = UserSerializer(help_text="사용자 정보")


class ErrorResponseSerializer(serializers.Serializer):
    """에러 응답 Serializer"""
    error = serializers.CharField(help_text="에러 메시지")


class RegisterSerializer(serializers.ModelSerializer):
    """회원가입 Serializer"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "비밀번호가 일치하지 않습니다."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """로그인 Serializer"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
