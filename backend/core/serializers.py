from rest_framework import serializers


class LocationSerializer(serializers.Serializer):
    """위치 정보 Serializer (공통)"""
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class RouteSummarySerializer(serializers.Serializer):
    """루트 요약 Serializer (공통)"""
    totalDurationMin = serializers.IntegerField()
    totalDistanceKm = serializers.FloatField()
