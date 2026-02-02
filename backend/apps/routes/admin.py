from django.contrib import admin
from .models import RouteSegment


@admin.register(RouteSegment)
class RouteSegmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'trip', 'from_event', 'to_event', 'duration_min', 'distance_km', 'travel_mode', 'departure_time', 'created']
    list_filter = ['travel_mode', 'created']
    search_fields = ['trip__title']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'trip', 'from_event', 'to_event')
        }),
        ('루트 정보', {
            'fields': ('duration_min', 'distance_km', 'polyline', 'travel_mode', 'departure_time')
        }),
        ('시간 정보', {
            'fields': ('created', 'modified')
        }),
    )
