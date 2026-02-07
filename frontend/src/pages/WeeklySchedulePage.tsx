import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { WeeklyScheduleView } from "../components/WeeklySchedule/WeeklyScheduleView";
import { PlaceDetailModal } from "../components/PlaceDetailModal/PlaceDetailModal";
import { RouteSegmentModal } from "../components/RouteSegmentModal/RouteSegmentModal";
import { getTripSummary, getDayDetail, type TripSummary, type DayDetail } from "../services/api/tripApi";
import type { Place, RouteSegment } from "../types/trip";

export const WeeklySchedulePage = () => {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const { currentTrip, updateSegmentTravelMode, updateSegmentDepartureTime, trips, currentTripId } =
    useTripStore();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{
    fromPlace: Place;
    toPlace: Place;
    segment: RouteSegment;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverLoadError, setServerLoadError] = useState<string | null>(null);
  
  // Server mode state
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [allDayDetails, setAllDayDetails] = useState<DayDetail[]>([]);

  // Load trip from server if tripId is provided
  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    const loadTripFromServer = async () => {
      setIsLoading(true);
      setServerLoadError(null);

      try {
        console.log(`🔍 WeeklySchedule: Trip 요약 조회 /trips/${tripId}/`);
        const summary = await getTripSummary(parseInt(tripId, 10));
        setTripSummary(summary);
        console.log(`✅ Trip 요약 조회 성공:`, summary);

        // Load all days
        console.log(`🔍 모든 Day 상세 조회 중... (총 ${summary.totalDays}일)`);
        const dayDetailsPromises = Array.from({ length: summary.totalDays }, (_, i) =>
          getDayDetail(parseInt(tripId, 10), i + 1)
        );
        const dayDetails = await Promise.all(dayDetailsPromises);
        setAllDayDetails(dayDetails);
        console.log(`✅ 모든 Day 상세 조회 완료:`, {
          totalDays: summary.totalDays,
          totalEvents: dayDetails.reduce((sum, d) => sum + (d.events?.length || 0), 0),
          eventsWithTime: dayDetails.reduce((sum, d) => sum + (d.events?.filter(e => e.time).length || 0), 0),
          sampleEvents: dayDetails.flatMap(d => d.events || []).slice(0, 3),
        });
      } catch (error: any) {
        console.error("❌ Trip 로드 실패:", error);
        setServerLoadError(
          error.response?.data?.message || "Trip을 불러올 수 없습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadTripFromServer();
  }, [tripId]);

  // Find trip from trips array if currentTrip is not set (for non-server mode)
  const localTrip = currentTrip || (currentTripId ? trips.find(t => t.id === currentTripId) : null);

  // Determine which trip to use
  const trip = tripId && tripSummary ? (() => {
    const convertedPlaces = allDayDetails.flatMap((day, dayIndex) =>
      (day.events || []).map((event, eventIndex) => ({
        id: event.id.toString(),
        placeId: event.placeId,
        name: event.name,
        lat: event.location.lat,
        lng: event.location.lng,
        day: dayIndex + 1,
        order: eventIndex,
        visitTime: event.time || undefined,
        durationMin: event.durationMin || undefined,
      }))
    );
    
    const convertedSegments = allDayDetails.flatMap(day =>
      (day.events || [])
        .map((event, index, events) => {
          if (!event.nextRoute || index === events.length - 1) return null;
          return {
            fromPlaceId: event.id.toString(),
            toPlaceId: events[index + 1].id.toString(),
            durationMin: event.nextRoute.durationMin,
            distanceKm: event.nextRoute.distanceKm,
            travelMode: event.nextRoute.travelMode as any,
            departureTime: event.nextRoute.departureTime || undefined,
          };
        })
        .filter((segment): segment is NonNullable<typeof segment> => segment !== null)
    );
    
    console.log("📦 서버 데이터 변환 완료:", {
      totalPlaces: convertedPlaces.length,
      placesWithTime: convertedPlaces.filter(p => p.visitTime).length,
      totalSegments: convertedSegments.length,
      samplePlaces: convertedPlaces.slice(0, 3),
    });
    
    return {
      id: tripSummary.id.toString(),
      title: tripSummary.title,
      startDate: tripSummary.startDate,
      totalDays: tripSummary.totalDays,
      places: convertedPlaces,
      routeSegments: convertedSegments,
      travelMode: "DRIVING" as any,
    };
  })() : localTrip;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {tripId ? "서버에서 여행 데이터 로드 중..." : "로딩 중..."}
          </p>
        </div>
      </div>
    );
  }

  if (serverLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">로드 실패</h2>
          <p className="text-gray-600 mb-4">{serverLoadError}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            여행을 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 mb-2">여행 계획을 먼저 생성해주세요.</p>
          <div className="text-xs text-gray-500 mb-4">
            <p>tripId: {tripId || "없음"}</p>
            <p>currentTripId: {currentTripId || "없음"}</p>
            <p>저장된 여행 수: {trips.length}개</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  const handleSegmentTravelModeChange = async (
    fromPlaceId: string,
    toPlaceId: string,
    mode: string
  ) => {
    updateSegmentTravelMode(fromPlaceId, toPlaceId, mode as any);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleSegmentClick = (
    fromPlace: Place,
    toPlace: Place,
    segment: RouteSegment
  ) => {
    setSelectedSegment({ fromPlace, toPlace, segment });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {trip.title}
            </h1>
            <p className="text-sm text-gray-600">주간 스케줄</p>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="p-6 flex-1 flex">
        <div className="w-full max-h-[calc(100vh-120px)]">
          <WeeklyScheduleView
            startDate={trip.startDate}
            places={trip.places}
            routeSegments={trip.routeSegments}
            onPlaceClick={handlePlaceClick}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {/* Route Segment Modal */}
      {selectedSegment && (
        <RouteSegmentModal
          fromPlace={selectedSegment.fromPlace}
          toPlace={selectedSegment.toPlace}
          segment={selectedSegment.segment}
          defaultTravelMode={trip.travelMode}
          onClose={() => setSelectedSegment(null)}
          onTravelModeChange={handleSegmentTravelModeChange}
          onDepartureTimeChange={updateSegmentDepartureTime}
        />
      )}
    </div>
  );
};
