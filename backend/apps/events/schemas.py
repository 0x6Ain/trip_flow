"""
Event-related Swagger schemas
"""
from drf_yasg import openapi

# NextRoute schema for swagger
NextRouteSchema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'transport': openapi.Schema(type=openapi.TYPE_STRING, description='교통수단 (DRIVING, TRANSIT, WALKING 등)'),
        'durationMin': openapi.Schema(type=openapi.TYPE_INTEGER, description='이동 시간 (분)'),
        'distanceKm': openapi.Schema(type=openapi.TYPE_NUMBER, description='이동 거리 (km)'),
        'polyline': openapi.Schema(type=openapi.TYPE_STRING, description='경로 폴리라인'),
    },
    description='다음 장소까지의 경로 정보'
)

# EventWithNextRoute schema for swagger
EventWithNextRouteSchema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Event ID'),
        'name': openapi.Schema(type=openapi.TYPE_STRING, description='장소명'),
        'placeId': openapi.Schema(type=openapi.TYPE_STRING, description='Google Place ID'),
        'location': openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'lat': openapi.Schema(type=openapi.TYPE_NUMBER),
                'lng': openapi.Schema(type=openapi.TYPE_NUMBER),
            }
        ),
        'time': openapi.Schema(type=openapi.TYPE_STRING, description='시작 시간 (HH:MM)'),
        'durationMin': openapi.Schema(type=openapi.TYPE_INTEGER, description='체류 시간 (분)'),
        'memo': openapi.Schema(type=openapi.TYPE_STRING, description='메모'),
        'dayOrder': openapi.Schema(type=openapi.TYPE_STRING, description='Day 내 순서'),
        'nextRoute': NextRouteSchema,
    },
    description='Event with next route information'
)
