from django.db import models
from django.db.models import Q, CheckConstraint
from model_utils.models import TimeStampedModel


class Cost(TimeStampedModel):
    """통합 비용 관리 모델 (Trip에 속하며 Event 또는 RouteSegment에 연결)"""
    
    # 반드시 Trip에 속함
    trip = models.ForeignKey(
        'trips.Trip',
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name='Trip'
    )
    
    # Event 또는 RouteSegment 중 하나에 연결 (nullable)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='costs',
        null=True,
        blank=True,
        verbose_name='Event',
        help_text='이 비용이 연결된 이벤트'
    )
    route_segment = models.ForeignKey(
        'routes.RouteSegment',
        on_delete=models.CASCADE,
        related_name='costs',
        null=True,
        blank=True,
        verbose_name='Route Segment',
        help_text='이 비용이 연결된 이동 구간'
    )
    
    # 비용 정보
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Amount',
        help_text='비용 금액'
    )
    currency = models.CharField(
        max_length=3,
        default='KRW',
        verbose_name='Currency',
        help_text='통화 (KRW, USD, JPY, EUR, etc.)'
    )
    
    # 카테고리 및 설명
    CATEGORY_CHOICES = [
        ('ENTRANCE', 'Entrance Fee'),        # 입장료
        ('FOOD', 'Food & Beverage'),         # 식음료
        ('TRANSPORTATION', 'Transportation'), # 교통비
        ('ACCOMMODATION', 'Accommodation'),  # 숙박비
        ('SHOPPING', 'Shopping'),            # 쇼핑
        ('ACTIVITY', 'Activity'),            # 액티비티
        ('OTHER', 'Other'),                  # 기타
    ]
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='OTHER',
        verbose_name='Category',
        help_text='비용 카테고리'
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Description',
        help_text='비용 상세 설명'
    )
    
    # 메타 정보
    is_estimate = models.BooleanField(
        default=False,
        verbose_name='Is estimate',
        help_text='예상 비용 여부 (실제 지출이 아닌 경우)'
    )
    
    class Meta:
        db_table = 'costs'
        ordering = ['created']
        indexes = [
            models.Index(fields=['trip']),
            models.Index(fields=['event']),
            models.Index(fields=['route_segment']),
            models.Index(fields=['category']),
        ]
        constraints = [
            CheckConstraint(
                check=Q(event__isnull=False) | Q(route_segment__isnull=False),
                name='cost_must_have_event_or_segment'
            )
        ]
        verbose_name = 'Cost'
        verbose_name_plural = 'Costs'
    
    def __str__(self):
        return f"{self.get_category_display()}: {self.amount} {self.currency}"
    
    @property
    def related_object_name(self):
        """연결된 객체 이름 반환"""
        if self.event:
            return f"Event: {self.event}"
        elif self.route_segment:
            return f"RouteSegment: {self.route_segment}"
        return "N/A"


# Re-export for convenience
__all__ = ['TimeStampedModel', 'Cost']
