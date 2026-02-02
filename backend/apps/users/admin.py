"""
User 모델 Admin 설정
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import UserOAuthProvider

User = get_user_model()


class UserOAuthProviderInline(admin.TabularInline):
    """User Admin에서 OAuth Provider를 인라인으로 표시"""
    model = UserOAuthProvider
    extra = 0
    fields = ['provider', 'oauth_id', 'created_at', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """커스텀 User 모델 Admin"""
    
    # 인라인 추가
    inlines = [UserOAuthProviderInline]
    
    # 목록 페이지에서 보여줄 필드
    list_display = [
        'email',
        'username',
        'name',
        'email_verified',
        'oauth_provider',
        'get_all_providers_display',
        'is_staff',
        'is_active',
        'created_at',
    ]
    
    # 검색 가능한 필드
    search_fields = ['email', 'username', 'name', 'oauth_id']
    
    # 필터 옵션
    list_filter = [
        'is_staff',
        'is_active',
        'is_superuser',
        'email_verified',
        'oauth_provider',
        'created_at',
    ]
    
    # 정렬 기준
    ordering = ['-created_at']
    
    # 상세 페이지 필드 구성
    fieldsets = (
        ('기본 정보', {
            'fields': ('email', 'username', 'name', 'password', 'email_verified')
        }),
        ('OAuth 정보', {
            'fields': ('oauth_provider', 'oauth_id', 'profile_image')
        }),
        ('권한', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),
        ('날짜', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')
        }),
    )
    
    # 추가 페이지 필드 구성
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email',
                'username',
                'name',
                'password1',
                'password2',
                'oauth_provider',
            ),
        }),
    )
    
    # 읽기 전용 필드
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'date_joined']
    
    def get_all_providers_display(self, obj):
        """모든 provider 표시"""
        providers = obj.get_all_providers()
        return ', '.join(providers) if providers else '-'
    get_all_providers_display.short_description = 'All Providers'


@admin.register(UserOAuthProvider)
class UserOAuthProviderAdmin(admin.ModelAdmin):
    """UserOAuthProvider Admin"""
    
    list_display = ['user', 'provider', 'oauth_id', 'created_at']
    list_filter = ['provider', 'created_at']
    search_fields = ['user__email', 'user__username', 'oauth_id']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('user', 'provider', 'oauth_id')
        }),
        ('날짜', {
            'fields': ('created_at', 'updated_at')
        }),
    )