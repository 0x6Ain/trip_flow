"""
Shared Trip Views (공유 여행 전용)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Trip, TripMember
from .serializers import TripSerializer, TripDayDetailSerializer, TripMemberSerializer


class SharedTripViewSet(viewsets.GenericViewSet):
    """
    공유된 Trip 전용 ViewSet
    
    - share_id(UUID)를 사용하여 공개된 Trip 조회 및 참여
    - 일반 Trip API와 분리된 별도 리소스
    """
    permission_classes = [AllowAny]
    lookup_field = 'share_id'
    lookup_url_kwarg = 'share_id'
    
    def get_queryset(self):
        """is_shared=True인 Trip만 조회"""
        return Trip.objects.filter(is_shared=True)
    
    def get_object(self):
        """share_id로 Trip 조회"""
        share_id = self.kwargs.get('share_id')
        try:
            return Trip.objects.get(share_id=share_id, is_shared=True)
        except Trip.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('공유된 여행을 찾을 수 없습니다.')
    
    @swagger_auto_schema(
        operation_summary="공유 ID로 Trip 조회",
        operation_description="""
share_id를 사용하여 공개된 Trip을 조회합니다.

**특징:**
- 인증 불필요 (누구나 조회 가능)
- is_shared=True인 Trip만 조회 가능
        """,
        tags=['shared-trips'],
        responses={
            200: openapi.Response(description='Trip 조회 성공', schema=TripSerializer),
            404: openapi.Response(description='공유된 여행을 찾을 수 없음')
        }
    )
    def retrieve(self, request, share_id=None):
        """
        공유 ID로 Trip 조회 (인증 불필요, 읽기 전용)
        """
        trip = self.get_object()
        serializer = TripSerializer(trip)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="공유 ID로 Day 상세 조회",
        operation_description="""
share_id를 사용하여 공개된 Trip의 특정 Day 상세 정보를 조회합니다.

**특징:**
- 인증 불필요 (누구나 조회 가능)
- is_shared=True인 Trip만 조회 가능
- Events와 next_route 포함
        """,
        tags=['shared-trips'],
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
            200: openapi.Response(description='Day 상세 조회 성공', schema=TripDayDetailSerializer),
            400: openapi.Response(description='day 파라미터 누락 또는 잘못된 값'),
            404: openapi.Response(description='공유된 여행을 찾을 수 없음')
        }
    )
    @action(detail=True, methods=['get'], url_path='days')
    def days(self, request, share_id=None):
        """
        공유 ID로 Trip의 Day 상세 조회 (인증 불필요, 읽기 전용)
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
        operation_summary="공유 ID로 여행에 참여하기",
        operation_description="""
share_id를 사용하여 공개된 Trip에 멤버로 참여합니다.

**특징:**
- 로그인 필수
- is_shared=True인 Trip만 참여 가능
- 'editor' 역할로 추가
- 이미 멤버인 경우 기존 정보 반환

**invite-member와의 차이:**
- invite-member: owner가 이메일로 특정 사용자 초대
- members (POST): 공유 링크를 받은 누구나 스스로 참여
        """,
        tags=['shared-trips'],
        responses={
            200: openapi.Response(
                description='참여 성공 (새로 추가되거나 기존 멤버)',
                examples={
                    'application/json': {
                        'tripId': 123,
                        'message': '여행에 참여했습니다.',
                        'role': 'editor',
                        'isNewMember': True
                    }
                }
            ),
            401: openapi.Response(description='인증되지 않음'),
            404: openapi.Response(description='공유된 여행을 찾을 수 없음')
        }
    )
    @action(detail=True, methods=['post'], url_path='members', permission_classes=[IsAuthenticated])
    def members(self, request, share_id=None):
        """
        공유 ID로 Trip에 참여하기 (로그인 필요)
        """
        trip = self.get_object()
        user = request.user
        
        # 이미 멤버인지 확인
        existing_member = TripMember.objects.filter(trip=trip, user=user).first()
        if existing_member:
            return Response({
                'tripId': trip.id,
                'message': '이미 이 여행의 멤버입니다.',
                'role': existing_member.role,
                'isNewMember': False
            })
        
        # 새 멤버 추가 (editor 역할로)
        member = TripMember.objects.create(
            trip=trip,
            user=user,
            role='editor'
        )
        
        return Response({
            'tripId': trip.id,
            'message': '여행에 참여했습니다.',
            'role': member.role,
            'isNewMember': True
        })
