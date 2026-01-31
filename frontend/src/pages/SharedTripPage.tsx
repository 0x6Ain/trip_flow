import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Trip } from "../types/trip";
import { tripService } from "../services/tripService";
import { MapView } from "../components/Map/MapView";
import { RouteSummary } from "../components/RouteSummary/RouteSummary";
import { useTripStore } from "../stores/tripStore";

export const SharedTripPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const createTrip = useTripStore((state) => state.createTrip);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      navigate("/");
      return;
    }

    // Load trip from server
    tripService.getTrip(tripId)
      .then((loadedTrip) => {
        setTrip(loadedTrip);
      })
      .catch((err) => {
        console.error("Failed to load trip:", err);
        setError("여행을 불러올 수 없습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tripId, navigate]);

  const handleCopy = () => {
    if (!trip) return;

    // Get city location with fallback
    const cityLocation = trip.cityLocation || 
      (trip.places.length > 0 
        ? { lat: trip.places[0].lat, lng: trip.places[0].lng }
        : { lat: 0, lng: 0 });

    // Copy trip to local storage and navigate to plan page
    createTrip(trip.title + " (복사본)", trip.city, cityLocation);
    navigate("/plan");
  };

  // Get map center with fallback
  const getMapCenter = () => {
    if (!trip) return { lat: 0, lng: 0 };
    if (trip.cityLocation) return trip.cityLocation;
    if (trip.places.length > 0) {
      return { lat: trip.places[0].lat, lng: trip.places[0].lng };
    }
    return { lat: 0, lng: 0 };
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">여행을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">여행을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">{error || "링크가 만료되었거나 잘못된 주소입니다."}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            새 여행 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
              <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                읽기 전용
              </span>
            </div>
            <p className="text-sm text-gray-500">{trip.city}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              새 여행
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              이 여행 복사하기
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Places (Read-only) */}
        <div className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">방문 장소</h3>
            <p className="text-sm text-gray-600 mb-4">{trip.places.length}개 장소</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {trip.places.map((place, index) => (
                <div
                  key={place.id}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white font-bold rounded-full">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {place.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <MapView
              center={getMapCenter()}
              places={trip.places}
            />
          </div>

          <RouteSummary summary={trip.routeSummary} />
        </div>
      </div>
    </div>
  );
};
