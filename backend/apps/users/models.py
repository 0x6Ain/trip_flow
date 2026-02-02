"""
User 모델
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """커스텀 User 모델 (OAuth + Email 로그인 지원)"""
    
    # email을 unique로 재정의
    email = models.EmailField(unique=True, verbose_name='Email address')
    
    # 추가 필드
    name = models.CharField(max_length=255, blank=True, verbose_name='Display name')
    profile_image = models.URLField(blank=True, verbose_name='Profile image URL')
    email_verified = models.BooleanField(default=False, verbose_name='Email verified')
    
    # OAuth 관련 (주로 사용하는 provider - 편의를 위해 유지)
    oauth_provider = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Primary OAuth provider',
        help_text='Primary provider: google, email, etc.'
    )
    oauth_id = models.CharField(
        max_length=255,
        blank=True,
        unique=True,
        null=True,
        verbose_name='Primary OAuth provider user ID'
    )
    
    # 여러 provider 지원 (JSON 형태) - 하위 호환성을 위해 유지
    oauth_providers = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='All OAuth providers (deprecated)',
        help_text='Use UserOAuthProvider model instead'
    )
    
    # 타임스탬프 (AbstractUser에 date_joined가 이미 있음)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['oauth_provider', 'oauth_id']),
        ]
    
    def __str__(self):
        return self.email or self.username
    
    @property
    def display_name(self):
        """표시할 이름 반환"""
        return self.name or self.username or self.email.split('@')[0]
    
    def add_oauth_provider(self, provider: str, oauth_id: str):
        """OAuth provider 추가 (1:N 테이블 사용)"""
        UserOAuthProvider.objects.update_or_create(
            user=self,
            provider=provider,
            defaults={'oauth_id': oauth_id}
        )
    
    def has_provider(self, provider: str) -> bool:
        """특정 provider가 등록되어 있는지 확인"""
        return self.oauth_provider_links.filter(provider=provider).exists()
    
    def get_oauth_id_for_provider(self, provider: str) -> str:
        """특정 provider의 oauth_id 반환"""
        try:
            provider_link = self.oauth_provider_links.get(provider=provider)
            return provider_link.oauth_id
        except UserOAuthProvider.DoesNotExist:
            return ''
    
    def get_all_providers(self):
        """사용자의 모든 provider 목록 반환"""
        return list(self.oauth_provider_links.values_list('provider', flat=True))


class UserOAuthProvider(models.Model):
    """사용자의 OAuth Provider 연결 정보 (1:N)"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='oauth_provider_links',
        verbose_name='User'
    )
    provider = models.CharField(
        max_length=50,
        verbose_name='OAuth provider',
        help_text='google, email, etc.'
    )
    oauth_id = models.CharField(
        max_length=255,
        verbose_name='OAuth provider user ID',
        help_text='Firebase UID for this provider'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Linked at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')
    
    class Meta:
        db_table = 'user_oauth_providers'
        verbose_name = 'User OAuth Provider'
        verbose_name_plural = 'User OAuth Providers'
        unique_together = [
            ('user', 'provider'),  # 한 사용자는 같은 provider를 한 번만
            ('provider', 'oauth_id'),  # 같은 provider의 같은 oauth_id는 한 번만
        ]
        indexes = [
            models.Index(fields=['user', 'provider']),
            models.Index(fields=['provider', 'oauth_id']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.provider} ({self.oauth_id})"
