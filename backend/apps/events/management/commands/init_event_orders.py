"""
기존 Event 데이터의 day_order와 global_order 초기화 스크립트
"""
from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.events.models import Event


class Command(BaseCommand):
    help = '기존 Event 데이터의 day_order와 global_order 초기화'

    def handle(self, *args, **options):
        self.stdout.write('🔄 Event order 초기화 시작...')
        
        # Trip별로 처리
        from apps.trips.models import Trip
        trips = Trip.objects.all()
        
        total_updated = 0
        
        for trip in trips:
            self.stdout.write(f'\n📦 Trip: {trip.title} (ID: {trip.id})')
            
            # 1. Global order 초기화 (day, order 순으로 정렬)
            all_events = Event.objects.filter(trip=trip).order_by('day', 'order')
            
            for idx, event in enumerate(all_events):
                event.global_order = idx + 1
                event.save(update_fields=['global_order'])
            
            # 2. Day별 day_order 초기화 (10, 20, 30...)
            days = set(e.day for e in all_events if e.day)
            
            for day in sorted(days):
                day_events = Event.objects.filter(trip=trip, day=day).order_by('order')
                
                for idx, event in enumerate(day_events):
                    event.day_order = Decimal((idx + 1) * 10)
                    event.save(update_fields=['day_order'])
                
                self.stdout.write(f'  ✅ Day {day}: {len(day_events)}개 이벤트 초기화')
                total_updated += len(day_events)
        
        self.stdout.write(self.style.SUCCESS(f'\n✨ 완료! 총 {total_updated}개 이벤트 초기화됨'))
