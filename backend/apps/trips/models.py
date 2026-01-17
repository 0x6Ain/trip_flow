from django.db import models
from django.utils import timezone
from model_utils.models import TimeStampedModel


class Trip(TimeStampedModel):
    """여행 계획 모델"""
    
    OWNER_TYPE_CHOICES = [
        ('GUEST', 'Guest'),
        ('USER', 'User'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    owner_type = models.CharField(max_length=10, choices=OWNER_TYPE_CHOICES, default='GUEST')
    owner_id = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    
    # Start Location (embedded)
    start_lat = models.DecimalField(max_digits=10, decimal_places=8)
    start_lng = models.DecimalField(max_digits=11, decimal_places=8)
    
    # Route Summary (embedded)
    total_duration_min = models.IntegerField(null=True, blank=True, help_text='총 소요 시간 (분)')
    total_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text='총 거리 (km)')
    
    expires_at = models.DateTimeField(null=True, blank=True, help_text='GUEST only - 7~14일 후')
    
    class Meta:
        db_table = 'trips'
        ordering = ['-created']
        indexes = [
            models.Index(fields=['owner_id']),
            models.Index(fields=['created']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.id})"
    
    def save(self, *args, **kwargs):
        # GUEST 타입이고 expires_at이 없으면 7일 후로 설정
        if self.owner_type == 'GUEST' and not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """만료 여부 확인"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def start_location(self):
        """시작 위치 반환"""
        return {
            'lat': float(self.start_lat),
            'lng': float(self.start_lng)
        }
    
    @property
    def route_summary(self):
        """루트 요약 반환"""
        return {
            'totalDurationMin': self.total_duration_min or 0,
            'totalDistanceKm': float(self.total_distance_km) if self.total_distance_km else 0
        }
