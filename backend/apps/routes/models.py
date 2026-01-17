from django.db import models
from django.utils import timezone
from model_utils.models import TimeStampedModel


class RouteCache(TimeStampedModel):
    """루트 캐시 모델 - Directions API 호출 최소화"""
    
    id = models.BigAutoField(primary_key=True)
    from_place_id = models.CharField(max_length=255, help_text='Google Places ID')
    to_place_id = models.CharField(max_length=255, help_text='Google Places ID')
    duration_min = models.IntegerField(help_text='소요 시간 (분)')
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, help_text='거리 (km)')
    polyline = models.TextField(blank=True, help_text='Encoded polyline string')
    
    expires_at = models.DateTimeField(help_text='캐시 만료 시간')
    
    class Meta:
        db_table = 'route_cache'
        ordering = ['-created']
        indexes = [
            models.Index(fields=['expires_at']),
        ]
        unique_together = [['from_place_id', 'to_place_id']]
    
    def __str__(self):
        return f"{self.from_place_id} → {self.to_place_id}"
    
    def save(self, *args, **kwargs):
        # expires_at이 없으면 7일 후로 설정
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """캐시 만료 여부 확인"""
        return timezone.now() > self.expires_at
    
    @classmethod
    def get_route(cls, from_place_id, to_place_id):
        """캐시된 루트 조회"""
        try:
            route = cls.objects.get(
                from_place_id=from_place_id,
                to_place_id=to_place_id,
                expires_at__gt=timezone.now()
            )
            return route
        except cls.DoesNotExist:
            return None
