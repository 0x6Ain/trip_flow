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

from .models import Trip, TripMember
from .serializers import (
    TripCreateSerializer, TripListSerializer, TripSerializer, TripUpdateSerializer,
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
    
    def retrieve(self, request, *args, **kwargs):
        """Trip 상세 조회 (route 계산 포함)"""
        trip = self.get_object()
        
        # routeSegments는 prefetch_related로 자동 로드
        serializer = self.get_serializer(trip)
        
        # events 추가
        from apps.events.models import Event
        events = Event.objects.filter(trip=trip).order_by('order')
        
        response_data = serializer.data
        response_data['events'] = EventSerializer(events, many=True).data
        
        return Response(response_data)
    
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
    
    def destroy(self, request, *args, **kwargs):
        """Trip 삭제 (owner만 가능)"""
        trip = self.get_object()
        trip.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    # TripMember 관리 액션들
    
    @action(detail=True, methods=['get'], permission_classes=[TripMemberPermission])
    def members(self, request, pk=None):
        """Trip 멤버 목록"""
        trip = self.get_object()
        members = TripMember.objects.filter(trip=trip).select_related('user')
        serializer = TripMemberSerializer(members, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        request_body=TripMemberInviteSerializer,
        responses={201: TripMemberSerializer}
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
        request_body=TripMemberUpdateSerializer,
        responses={200: TripMemberSerializer}
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
