from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.trips.models import Trip, TripMember
from apps.routes.models import RouteSegment


class EventCreateRecalculateRoutesTests(TestCase):
    @patch("apps.events.views.GoogleMapsService.calculate_route")
    def test_create_event_recalculates_segments_and_includes_polyline(self, mock_calculate_route):
        """
        A안: Event 생성 시 route_segments가 자동으로 저장되고,
        응답에 segments(polyline 포함) + routeSummary가 포함되는지 확인.
        """
        mock_calculate_route.return_value = {
            "durationMin": 12,
            "distanceKm": 3.4,
            "polyline": "encoded_polyline_points",
        }

        User = get_user_model()
        user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="pass1234!",
        )

        trip = Trip.objects.create(
            title="Test Trip",
            city="Test City",
            start_lat=37.5665,
            start_lng=126.9780,
            total_days=1,
        )
        TripMember.objects.create(trip=trip, user=user, role="owner")

        client = APIClient()
        client.force_authenticate(user=user)

        # 1) 첫 이벤트 추가: start -> e1 segment 생성
        resp1 = client.post(
            f"/api/trips/{trip.id}/events/",
            {
                "placeId": "place_1",
                "placeName": "Place 1",
                "lat": 37.57,
                "lng": 126.98,
                "day": 1,
                "recalculateRoutes": True,
            },
            format="json",
        )
        self.assertEqual(resp1.status_code, 201)
        self.assertIn("segments", resp1.data)
        self.assertIn("routeSummary", resp1.data)
        self.assertTrue(any(seg.get("polyline") for seg in resp1.data["segments"]))

        e1_id = resp1.data["id"]

        # 2) 두번째 이벤트 추가: e1 -> e2 segment 포함 총 2개 segment
        resp2 = client.post(
            f"/api/trips/{trip.id}/events/",
            {
                "placeId": "place_2",
                "placeName": "Place 2",
                "lat": 37.58,
                "lng": 126.99,
                "day": 1,
                "recalculateRoutes": True,
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, 201)
        self.assertIn("segments", resp2.data)

        segments = resp2.data["segments"]
        self.assertGreaterEqual(len(segments), 2)

        e2_id = resp2.data["id"]
        has_e1_to_e2 = any(
            seg.get("fromEventId") == e1_id and seg.get("toEventId") == e2_id
            for seg in segments
        )
        self.assertTrue(has_e1_to_e2)

        # DB에도 저장됐는지 확인
        self.assertTrue(
            RouteSegment.objects.filter(trip=trip, to_event_id=e2_id).exists()
        )

