from django.db import models
from model_utils.models import TimeStampedModel


class RouteSegment(TimeStampedModel):
    """Trip의 Event 간 루트 구간"""
    
    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='route_segments')
    from_event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='segments_from', null=True, blank=True)
    to_event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='segments_to')
    
    # 루트 정보
    duration_min = models.IntegerField(verbose_name='Duration (minutes)')
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Distance (km)')
    polyline = models.TextField(blank=True, verbose_name='Encoded polyline')
    
    # 이동 수단
    TRAVEL_MODE_CHOICES = [
        ('WALKING', 'Walking'),
        ('TRANSIT', 'Transit'),
        ('DRIVING', 'Driving'),
        ('BICYCLING', 'Bicycling'),
    ]
    travel_mode = models.CharField(
        max_length=20,
        choices=TRAVEL_MODE_CHOICES,
        default='DRIVING',
        verbose_name='Travel mode'
    )
    
    # 사용자 설정 (선택적)
    departure_time = models.CharField(
        max_length=5,
        blank=True,
        verbose_name='Departure time',
        help_text='HH:MM format (사용자가 설정한 출발 시간)'
    )
    
    # Note: costs는 reverse FK로 자동 생성 (related_name='costs')
    
    class Meta:
        db_table = 'route_segments'
        ordering = ['from_event__order']
        indexes = [
            models.Index(fields=['trip']),
            models.Index(fields=['from_event', 'to_event']),
        ]
    
    def __str__(self):
        from_title = self.from_event.display_title if self.from_event else "Start"
        to_title = self.to_event.display_title
        return f"{from_title} → {to_title} ({self.travel_mode})"
