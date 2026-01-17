from django.contrib import admin
from .models import Place


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'trip', 'order', 'created']
    list_filter = ['created']
    search_fields = ['name', 'place_id', 'trip__title']
    readonly_fields = ['id', 'created', 'modified']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'trip', 'place_id', 'name', 'order')
        }),
        ('위치 정보', {
            'fields': ('lat', 'lng')
        }),
        ('시간 정보', {
            'fields': ('created', 'modified')
        }),
    )
