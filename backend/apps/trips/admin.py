from django.contrib import admin
from .models import Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'city', 'owner_type', 'created', 'expires_at']
    list_filter = ['owner_type', 'created']
    search_fields = ['id', 'title', 'city', 'owner_id']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'title', 'city', 'owner_type', 'owner_id')
        }),
        ('위치 정보', {
            'fields': ('start_lat', 'start_lng')
        }),
        ('루트 정보', {
            'fields': ('total_duration_min', 'total_distance_km')
        }),
        ('시간 정보', {
            'fields': ('created', 'modified', 'expires_at')
        }),
    )
