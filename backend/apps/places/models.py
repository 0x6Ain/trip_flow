from django.db import models
from model_utils.models import TimeStampedModel


class Place(TimeStampedModel):
    """여행지 장소 모델"""
    
    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='places')
    place_id = models.CharField(max_length=255, help_text='Google Places ID')
    name = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=10, decimal_places=8)
    lng = models.DecimalField(max_digits=11, decimal_places=8)
    order = models.DecimalField(max_digits=10, decimal_places=2, help_text='float for drag & drop')
    
    class Meta:
        db_table = 'places'
        ordering = ['order']
        indexes = [
            models.Index(fields=['trip']),
            models.Index(fields=['trip', 'order']),
            models.Index(fields=['place_id']),
        ]
        unique_together = [['trip', 'place_id']]
    
    def __str__(self):
        return f"{self.name} (order: {self.order})"
    
    @property
    def location(self):
        """위치 정보 반환"""
        return {
            'lat': float(self.lat),
            'lng': float(self.lng)
        }
