from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['id', 'trip', 'order', 'display_title', 'day', 'created']
    list_filter = ['day', 'created']
    search_fields = ['trip__title', 'place_name', 'custom_title']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'trip', 'order')
        }),
        ('장소 정보', {
            'fields': ('place_id', 'place_name', 'lat', 'lng', 'address')
        }),
        ('액티비티 정보', {
            'fields': ('activity_type', 'custom_title')
        }),
        ('일정 정보', {
            'fields': ('day', 'start_time', 'duration_min')
        }),
        ('기타', {
            'fields': ('memo', 'created', 'modified')
        }),
    )
