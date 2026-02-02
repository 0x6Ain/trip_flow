from django.contrib import admin
from .models import Cost


@admin.register(Cost)
class CostAdmin(admin.ModelAdmin):
    list_display = ['id', 'trip', 'get_related_object', 'category', 'amount', 'currency', 'is_estimate', 'created']
    list_filter = ['category', 'currency', 'is_estimate', 'created']
    search_fields = ['description', 'amount', 'trip__title']
    readonly_fields = ['id', 'created', 'modified']
    raw_id_fields = ['trip', 'event', 'route_segment']
    
    fieldsets = (
        ('연결 정보', {
            'fields': ('id', 'trip', 'event', 'route_segment')
        }),
        ('비용 정보', {
            'fields': ('amount', 'currency', 'category', 'description', 'is_estimate')
        }),
        ('시간 정보', {
            'fields': ('created', 'modified')
        }),
    )
    
    def get_related_object(self, obj):
        """연결된 객체 표시"""
        return obj.related_object_name
    get_related_object.short_description = 'Related To'
