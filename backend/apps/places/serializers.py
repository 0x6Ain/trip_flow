from rest_framework import serializers
from .models import Place


class PlaceSerializer(serializers.ModelSerializer):
    """Place Serializer"""
    id = serializers.IntegerField(read_only=True)
    placeId = serializers.CharField(source='place_id')
    
    class Meta:
        model = Place
        fields = ['id', 'placeId', 'name', 'lat', 'lng', 'order']
        read_only_fields = ['id']


class PlaceCreateSerializer(serializers.Serializer):
    """Place 생성 Serializer"""
    placeId = serializers.CharField(max_length=255)
    name = serializers.CharField(max_length=255)
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class PlaceReorderItemSerializer(serializers.Serializer):
    """Place 순서 변경 아이템 Serializer"""
    id = serializers.IntegerField()
    order = serializers.FloatField()


class PlaceReorderSerializer(serializers.Serializer):
    """Place 순서 변경 Serializer"""
    places = PlaceReorderItemSerializer(many=True)


class PlaceReorderResponseSerializer(serializers.Serializer):
    """Place 순서 변경 응답 Serializer"""
    places = PlaceSerializer(many=True)
    routeSummary = serializers.DictField()


class PlaceSearchResultSerializer(serializers.Serializer):
    """Google Places 검색 결과 Serializer"""
    placeId = serializers.CharField()
    name = serializers.CharField()
    formattedAddress = serializers.CharField()
    location = serializers.DictField()
    types = serializers.ListField(child=serializers.CharField())
    rating = serializers.FloatField(required=False)
    userRatingsTotal = serializers.IntegerField(required=False)


class PlaceSearchResponseSerializer(serializers.Serializer):
    """Place 검색 응답 Serializer"""
    results = PlaceSearchResultSerializer(many=True)
