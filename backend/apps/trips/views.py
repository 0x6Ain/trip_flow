"""
Trip Views
"""
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .swagger_schemas import TripDayDetailResponseSchema

from .models import Trip, TripMember
from .serializers import (
    TripCreateSerializer, TripListSerializer, TripSerializer, TripUpdateSerializer,
    TripDayDetailSerializer,
    TripMemberSerializer, TripMemberInviteSerializer, TripMemberUpdateSerializer
)
from .permissions import TripMemberPermission, IsTripOwner
from apps.events.serializers import EventSerializer
from apps.users.authentication import JWTAuthentication


class TripViewSet(mixins.CreateModelMixin,
                  mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin,
                  mixins.DestroyModelMixin,
                  mixins.ListModelMixin,
                  viewsets.GenericViewSet):
    """Trip CRUD ViewSet"""
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    lookup_field = 'pk'
    pagination_class = None
    
    def get_queryset(self):
        """로그인한 사용자가 멤버인 Trip만 반환"""
        if not self.request.user.is_authenticated:
            return Trip.objects.none()
        
        # 사용자가 멤버인 Trip만 조회
        trip_ids = TripMember.objects.filter(
            user=self.request.user
        ).values_list('trip_id', flat=True)
        
        return Trip.objects.filter(id__in=trip_ids)
    
    def get_permissions(self):
        """액션별 권한 설정"""
        if self.action in ['retrieve', 'list']:
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update']:
            return [TripMemberPermission()]
        elif self.action == 'destroy':
            return [IsTripOwner()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TripCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TripUpdateSerializer
        elif self.action == 'list':
            return TripListSerializer
        return TripSerializer
    
    @swagger_auto_schema(
        operation_summary="Trip 생성",
        operation_description="새로운 여행 계획을 생성합니다. 생성자는 자동으로 owner로 등록됩니다.",
        request_body=TripCreateSerializer,
        responses={
            201: openapi.Response(description='Trip 생성 성공', schema=TripSerializer),
            400: '잘못된 요청'
        }
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Trip 생성 (자동으로 생성자를 owner로 추가)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        start_location = data['startLocation']
        
        # Trip 생성
        trip = Trip.objects.create(
            title=data['title'],
            city=data['city'],
            start_lat=start_location['lat'],
            start_lng=start_location['lng'],
            start_date=data.get('startDate'),
            total_days=data.get('totalDays', 1)
        )
        
        # 생성자를 owner로 추가
        TripMember.objects.create(
            trip=trip,
            user=request.user,
            role='owner'
        )
        
        response_serializer = TripSerializer(trip)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_summary="Trip 요약 조회",
        operation_description="Trip의 기본 정보(제목, 날짜, 총 일수 등)를 조회합니다. Events는 포함되지 않습니다.",
        responses={
            200: openapi.Response(description='조회 성공', schema=TripSerializer),
            404: 'Trip을 찾을 수 없음'
        }
    )
    def retrieve(self, request, *args, **kwargs):
        """Trip 요약 조회 (제목, 날짜, 총 일수 등)"""
        trip = self.get_object()
        serializer = self.get_serializer(trip)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Day 상세 조회",
        operation_description="""
특정 Day의 상세 정보를 조회합니다.

**특징:**
- Events에 nextRoute가 포함되어 있어 별도의 segments 조회 불필요
- 마지막 Event의 nextRoute는 null

**사용 예시:**
```
GET /trips/1/days?day=1  # Day 1 조회
GET /trips/1/days?day=2  # Day 2 조회
```
        """,
        manual_parameters=[
            openapi.Parameter(
                'day',
                openapi.IN_QUERY,
                description="조회할 Day (1 ~ totalDays)",
                type=openapi.TYPE_INTEGER,
                required=True,
                example=1
            )
        ],
        responses={
            200: openapi.Response(
                description='Day 상세 조회 성공',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    required=['tripId', 'title', 'day', 'date', 'events'],
                    properties={
                        'tripId': openapi.Schema(type=openapi.TYPE_INTEGER, description='Trip ID'),
                        'title': openapi.Schema(type=openapi.TYPE_STRING, description='Trip 제목'),
                        'day': openapi.Schema(type=openapi.TYPE_INTEGER, description='Day 번호'),
                        'date': openapi.Schema(type=openapi.TYPE_STRING, description='날짜 (YYYY-MM-DD)', nullable=True),
                        'events': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                required=['id', 'name', 'location', 'dayOrder'],
                                properties={
                                    'id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Event ID'),
                                    'name': openapi.Schema(type=openapi.TYPE_STRING, description='장소명'),
                                    'placeId': openapi.Schema(type=openapi.TYPE_STRING, description='Google Place ID'),
                                    'location': openapi.Schema(
                                        type=openapi.TYPE_OBJECT,
                                        properties={
                                            'lat': openapi.Schema(type=openapi.TYPE_NUMBER, format='double'),
                                            'lng': openapi.Schema(type=openapi.TYPE_NUMBER, format='double'),
                                        }
                                    ),
                                    'time': openapi.Schema(type=openapi.TYPE_STRING, description='시작 시간 (HH:MM)'),
                                    'durationMin': openapi.Schema(type=openapi.TYPE_INTEGER, description='체류 시간 (분)'),
                                    'memo': openapi.Schema(type=openapi.TYPE_STRING, description='메모'),
                                    'dayOrder': openapi.Schema(type=openapi.TYPE_STRING, description='Day 내 순서'),
                                    'nextRoute': openapi.Schema(
                                        type=openapi.TYPE_OBJECT,
                                        nullable=True,
                                        properties={
                                            'transport': openapi.Schema(type=openapi.TYPE_STRING, description='교통수단'),
                                            'durationMin': openapi.Schema(type=openapi.TYPE_INTEGER, description='이동 시간 (분)'),
                                            'distanceKm': openapi.Schema(type=openapi.TYPE_NUMBER, description='이동 거리 (km)'),
                                            'polyline': openapi.Schema(type=openapi.TYPE_STRING, description='경로 폴리라인'),
                                        }
                                    ),
                                }
                            ),
                            description='Events with next route'
                        ),
                    }
                ),
                examples={
                    'application/json': {
                        "tripId": 1,
                        "title": "서울 여행",
                        "day": 1,
                        "date": "2024-03-20",
                        "events": [
                            {
                                "id": 1,
                                "name": "인천공항",
                                "placeId": "ChIJ...",
                                "location": {"lat": 37.4602, "lng": 126.4407},
                                "time": "10:00",
                                "durationMin": 30,
                                "memo": "",
                                "dayOrder": "10.0000",
                                "nextRoute": {
                                    "transport": "TRANSIT",
                                    "durationMin": 45,
                                    "distanceKm": 15.2,
                                    "polyline": "..."
                                }
                            },
                            {
                                "id": 2,
                                "name": "호텔",
                                "placeId": "ChIJ...",
                                "location": {"lat": 37.5665, "lng": 126.9780},
                                "time": "12:00",
                                "durationMin": 60,
                                "memo": "",
                                "dayOrder": "20.0000",
                                "nextRoute": None
                            }
                        ]
                    }
                }
            ),
            400: 'day 파라미터 누락 또는 잘못된 값',
            404: 'Trip을 찾을 수 없음'
        }
    )
    @action(detail=True, methods=['get'], url_path='days')
    def days(self, request, pk=None):
        """
        Trip Day 상세 조회 (events + next_route 포함)
        
        Query Parameters:
        - day (required): 조회할 day (예: ?day=1)
        """
        trip = self.get_object()
        
        day_param = request.query_params.get('day')
        if not day_param:
            return Response(
                {'error': 'day parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            day = int(day_param)
        except (ValueError, TypeError):
            return Response(
                {'error': 'day must be an integer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if day < 1 or day > trip.total_days:
            return Response(
                {'error': f'day must be between 1 and {trip.total_days}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Day 상세 데이터 생성
        data = {
            'trip': trip,
            'day': day
        }
        
        serializer = TripDayDetailSerializer(data)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Trip 업데이트",
        operation_description="Trip의 기본 정보를 수정합니다. Editor 이상 권한 필요.",
        request_body=TripUpdateSerializer,
        responses={
            200: openapi.Response(description='업데이트 성공', schema=TripSerializer),
            403: '권한 없음',
            404: 'Trip을 찾을 수 없음'
        }
    )
    def partial_update(self, request, *args, **kwargs):
        """Trip 업데이트"""
        trip = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        if 'title' in data:
            trip.title = data['title']
        if 'city' in data:
            trip.city = data['city']
        if 'startLocation' in data:
            start_location = data['startLocation']
            trip.start_lat = start_location['lat']
            trip.start_lng = start_location['lng']
        if 'startDate' in data:
            trip.start_date = data['startDate']
        if 'totalDays' in data:
            trip.total_days = data['totalDays']
        
        trip.save()
        
        response_serializer = TripSerializer(trip)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Trip 삭제",
        operation_description="Trip을 삭제합니다. Owner만 가능합니다.",
        responses={
            204: '삭제 성공',
            403: '권한 없음 (Owner만 삭제 가능)',
            404: 'Trip을 찾을 수 없음'
        }
    )
    def destroy(self, request, *args, **kwargs):
        """Trip 삭제 (owner만 가능)"""
        trip = self.get_object()
        trip.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    # TripMember 관리 액션들
    
    @swagger_auto_schema(
        operation_summary="멤버 목록 조회",
        operation_description="Trip의 모든 멤버를 조회합니다.",
        tags=['trip-members'],
        responses={
            200: openapi.Response(description='멤버 목록 조회 성공', schema=TripMemberSerializer(many=True)),
            403: '권한 없음',
            404: 'Trip을 찾을 수 없음'
        }
    )
    @action(detail=True, methods=['get'], permission_classes=[TripMemberPermission])
    def members(self, request, pk=None):
        """Trip 멤버 목록"""
        trip = self.get_object()
        members = TripMember.objects.filter(trip=trip).select_related('user')
        serializer = TripMemberSerializer(members, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="멤버 초대",
        operation_description="""
Trip에 새로운 멤버를 초대합니다.

**권한:**
- Owner만 초대 가능

**역할:**
- `editor`: 편집 권한 (이벤트 추가/수정/삭제, 순서 변경 등)
- `viewer`: 읽기 전용

**요청 예시:**
```json
{
  "email": "friend@example.com",
  "role": "editor"
}
```
        """,
        tags=['trip-members'],
        request_body=TripMemberInviteSerializer,
        responses={
            201: openapi.Response(description='초대 성공', schema=TripMemberSerializer),
            400: '잘못된 요청 (이메일 형식, 이미 멤버인 경우 등)',
            403: '권한 없음',
            404: 'Trip 또는 사용자를 찾을 수 없음'
        }
    )
    @action(detail=True, methods=['post'], permission_classes=[IsTripOwner])
    def invite_member(self, request, pk=None):
        """Trip 멤버 초대 (owner만 가능)"""
        trip = self.get_object()
        serializer = TripMemberInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        role = serializer.validated_data.get('role', 'viewer')
        
        # 사용자 찾기
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': '해당 이메일의 사용자를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 이미 멤버인지 확인
        if TripMember.objects.filter(trip=trip, user=user).exists():
            return Response(
                {'error': '이미 멤버입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 멤버 추가
        member = TripMember.objects.create(
            trip=trip,
            user=user,
            role=role
        )
        
        response_serializer = TripMemberSerializer(member)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_summary="멤버 권한 변경",
        operation_description="""
멤버의 역할(권한)을 변경합니다.

**권한:**
- Owner만 가능

**가능한 역할:**
- `owner`: 모든 권한 (삭제 포함)
- `editor`: 편집 권한
- `viewer`: 읽기 전용

**요청 예시:**
```json
{
  "role": "editor"
}
```
        """,
        tags=['trip-members'],
        request_body=TripMemberUpdateSerializer,
        responses={
            200: openapi.Response(description='권한 변경 성공', schema=TripMemberSerializer),
            400: '잘못된 요청',
            403: '권한 없음 (Owner만 가능)',
            404: 'Trip 또는 멤버를 찾을 수 없음'
        }
    )
    @action(detail=True, methods=['patch'], url_path='members/(?P<user_id>[^/.]+)', permission_classes=[IsTripOwner])
    def update_member_role(self, request, pk=None, user_id=None):
        """멤버 권한 변경 (owner만 가능)"""
        trip = self.get_object()
        serializer = TripMemberUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        member = get_object_or_404(TripMember, trip=trip, user_id=user_id)
        member.role = serializer.validated_data['role']
        member.save()
        
        response_serializer = TripMemberSerializer(member)
        return Response(response_serializer.data)
    
    @swagger_auto_schema(
        operation_summary="멤버 제거",
        operation_description="""
Trip에서 멤버를 제거합니다.

**권한:**
- Owner만 가능

**제약:**
- Owner는 제거 불가
        """,
        tags=['trip-members'],
        responses={
            204: '제거 성공',
            400: '잘못된 요청 (Owner 제거 시도 등)',
            403: '권한 없음',
            404: 'Trip 또는 멤버를 찾을 수 없음'
        }
    )
    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)', permission_classes=[IsTripOwner])
    def remove_member(self, request, pk=None, user_id=None):
        """멤버 제거 (owner만 가능)"""
        trip = self.get_object()
        member = get_object_or_404(TripMember, trip=trip, user_id=user_id)
        
        # owner는 제거할 수 없음
        if member.role == 'owner':
            return Response(
                {'error': 'owner는 제거할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
