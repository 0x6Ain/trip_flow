from django.contrib import admin
from .models import Trip, TripMember


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'city', 'created', 'modified']
    list_filter = ['created']
    search_fields = ['id', 'title', 'city']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'title', 'city')
        }),
        ('위치 정보', {
            'fields': ('start_lat', 'start_lng')
        }),
        ('일정 정보', {
            'fields': ('start_date', 'total_days')
        }),
        ('루트 요약', {
            'fields': ('total_duration_min', 'total_distance_km'),
            'description': 'route_segments로부터 자동 계산됩니다.'
        }),
        ('시간 정보', {
            'fields': ('created', 'modified')
        }),
    )


@admin.register(TripMember)
class TripMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'trip', 'user', 'role', 'created']
    list_filter = ['role', 'created']
    search_fields = ['trip__title', 'user__email', 'user__username']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'trip', 'user', 'role')
        }),
        ('시간 정보', {
            'fields': ('created', 'modified')
        }),
    )
