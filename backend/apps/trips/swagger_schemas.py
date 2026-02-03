"""
Trip-related Swagger schemas
"""
from drf_yasg import openapi
from apps.events.schemas import EventWithNextRouteSchema

# TripDayDetail Response Schema
TripDayDetailResponseSchema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'tripId': openapi.Schema(
            type=openapi.TYPE_INTEGER,
            description='Trip ID',
            example=1
        ),
        'title': openapi.Schema(
            type=openapi.TYPE_STRING,
            description='Trip 제목',
            example='서울 여행'
        ),
        'day': openapi.Schema(
            type=openapi.TYPE_INTEGER,
            description='Day 번호',
            example=1
        ),
        'date': openapi.Schema(
            type=openapi.TYPE_STRING,
            description='날짜 (YYYY-MM-DD)',
            example='2024-03-20'
        ),
        'events': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=EventWithNextRouteSchema,
            description='Events with next route information'
        ),
    },
    required=['tripId', 'title', 'day', 'date', 'events']
)
