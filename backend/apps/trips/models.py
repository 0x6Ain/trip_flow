from django.db import models
from django.conf import settings
from model_utils.models import TimeStampedModel


class Trip(TimeStampedModel):
    """여행 계획 모델"""
    
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255, verbose_name='Trip title')
    city = models.CharField(max_length=255, verbose_name='City')
    
    # Start Location (embedded)
    start_lat = models.DecimalField(max_digits=11, decimal_places=8, verbose_name='Start latitude')
    start_lng = models.DecimalField(max_digits=12, decimal_places=8, verbose_name='Start longitude')
    
    # Trip Schedule
    start_date = models.DateField(null=True, blank=True, verbose_name='Start date', help_text='YYYY-MM-DD')
    total_days = models.IntegerField(default=1, verbose_name='Total days')
    
    # Route Summary (embedded) - computed from route_segments
    total_duration_min = models.IntegerField(null=True, blank=True, verbose_name='Total duration (min)')
    total_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Total distance (km)')
    
    class Meta:
        db_table = 'trips'
        ordering = ['-created']
        indexes = [
            models.Index(fields=['created']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.id})"
    
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
    
    def update_route_summary(self):
        """route_segments로부터 총계 재계산"""
        segments = self.route_segments.all()
        self.total_duration_min = sum(s.duration_min for s in segments)
        self.total_distance_km = sum(s.distance_km for s in segments)
        self.save(update_fields=['total_duration_min', 'total_distance_km', 'modified'])


class TripMember(TimeStampedModel):
    """Trip-User N:M 관계 (협업 기능)"""
    
    ROLE_CHOICES = [
        ('owner', 'Owner'),      # 모든 권한 (삭제 포함)
        ('editor', 'Editor'),    # 편집 가능
        ('viewer', 'Viewer'),    # 읽기만 가능
    ]
    
    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trip_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='viewer')
    
    class Meta:
        db_table = 'trip_members'
        unique_together = [['trip', 'user']]
        indexes = [
            models.Index(fields=['trip', 'user']),
            models.Index(fields=['user', 'role']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.trip.title} ({self.role})"
