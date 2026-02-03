"""
Event 모델 (Place 대체)
"""
from django.db import models
from model_utils.models import TimeStampedModel


class Event(TimeStampedModel):
    """여행 이벤트 모델 (장소 방문 + 액티비티)"""
    
    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='events')
    
    # 순서 관리 (Day별 독립적 관리)
    order = models.IntegerField(verbose_name='Event order', help_text='전역 순서 (deprecated, global_order 사용)')
    global_order = models.IntegerField(
        default=0,
        verbose_name='Global order',
        help_text='전체 trip에서의 순서 (자동 계산)',
        db_index=True
    )
    day_order = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=10.0,
        verbose_name='Order within day',
        help_text='Day 내부 순서 (10, 20, 30...)'
    )
    
    # 유연한 이벤트 정의 (모두 optional)
    place_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Google Places ID',
        help_text='Google Places API place_id'
    )
    place_name = models.CharField(max_length=255, blank=True, verbose_name='Place name')
    lat = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        null=True,
        blank=True,
        verbose_name='Latitude'
    )
    lng = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        verbose_name='Longitude'
    )
    address = models.TextField(blank=True, verbose_name='Address')
    
    # 액티비티 정보
    activity_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Activity type',
        help_text='SURFING, DINING, SHOPPING, SIGHTSEEING, etc.'
    )
    custom_title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Custom title',
        help_text='User-defined event title'
    )
    
    # 스케줄
    day = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Day',
        help_text='Trip day (1-based)'
    )
    start_time = models.CharField(
        max_length=5,
        blank=True,
        verbose_name='Start time',
        help_text='HH:MM format'
    )
    duration_min = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Duration (minutes)',
        help_text='How long to stay'
    )
    
    # 메모
    memo = models.TextField(blank=True, verbose_name='Memo')
    
    # Note: costs는 reverse FK로 자동 생성 (related_name='costs')
    
    class Meta:
        db_table = 'events'
        ordering = ['day', 'day_order']
        indexes = [
            models.Index(fields=['trip', 'order']),
            models.Index(fields=['trip', 'day', 'day_order']),
            models.Index(fields=['trip', 'global_order']),
            models.Index(fields=['place_id']),
        ]
    
    def __str__(self):
        if self.custom_title:
            return f"{self.custom_title} (order: {self.order})"
        elif self.place_name:
            if self.activity_type:
                return f"{self.place_name} - {self.activity_type} (order: {self.order})"
            return f"{self.place_name} (order: {self.order})"
        return f"Event {self.order}"
    
    @property
    def location(self):
        """위치 정보 반환"""
        if self.lat and self.lng:
            return {
                'lat': float(self.lat),
                'lng': float(self.lng)
            }
        return None
    
    @property
    def display_title(self):
        """표시할 제목"""
        if self.custom_title:
            return self.custom_title
        elif self.place_name:
            if self.activity_type:
                return f"{self.place_name} - {self.activity_type}"
            return self.place_name
        return f"Event {self.order}"
