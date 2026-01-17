from django.contrib import admin
from .models import RouteCache


@admin.register(RouteCache)
class RouteCacheAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_place_id', 'to_place_id', 'duration_min', 'distance_km', 'created', 'expires_at']
    list_filter = ['created', 'expires_at']
    search_fields = ['from_place_id', 'to_place_id']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('루트 정보', {
            'fields': ('id', 'from_place_id', 'to_place_id')
        }),
        ('거리/시간', {
            'fields': ('duration_min', 'distance_km', 'polyline')
        }),
        ('캐시 정보', {
            'fields': ('created', 'modified', 'expires_at')
        }),
    )
