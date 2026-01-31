import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { MapView } from "../components/Map/MapView";
import { PlaceSearch } from "../components/PlaceSearch/PlaceSearch";
import { PlaceList } from "../components/PlaceList/PlaceList";
import { RouteSummary } from "../components/RouteSummary/RouteSummary";
import { OptimizationButton } from "../components/OptimizationButton/OptimizationButton";
import { calculateTotalRoute, calculateFullRoute } from "../services/googleMapsService";
import { optimizeRoute } from "../utils/optimization";
import type { PlaceSearchResult } from "../types/trip";

export const TripPlanPage = () => {
  const navigate = useNavigate();
  const { 
    currentTrip, 
    addPlace, 
    removePlace, 
    updatePlaceOrder, 
    updateRouteSummary, 
    updateDirectionsResult, 
    optimizePlaces 
  } = useTripStore();

  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!currentTrip) {
      navigate("/");
      return;
    }
  }, [currentTrip, navigate]);

  const handleMapLoad = () => {
    console.log("Google Maps API 로드 완료!");
  };

  useEffect(() => {
    if (!currentTrip || currentTrip.places.length === 0) {
      // Clear directions when no places
      updateDirectionsResult(null);
      updateRouteSummary({ totalDurationMin: 0, totalDistanceKm: 0 });
      return;
    }

    // Calculate route when places change
    setIsCalculating(true);
    
    Promise.all([
      calculateTotalRoute(currentTrip.places),
      calculateFullRoute(currentTrip.places),
    ])
      .then(([summary, directionsResult]) => {
        updateRouteSummary(summary);
        updateDirectionsResult(directionsResult);
      })
      .catch((error) => {
        console.error("Failed to calculate route:", error);
      })
      .finally(() => {
        setIsCalculating(false);
      });
  }, [currentTrip?.places]);

  if (!currentTrip) {
    return null;
  }

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    addPlace({
      placeId: place.placeId,
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng,
    });
  };

  const handleOptimize = async () => {
    if (!currentTrip) throw new Error("No trip");
    return await optimizeRoute(currentTrip.places);
  };

  const handleApplyOptimization = (result: any) => {
    optimizePlaces(result.places, {
      totalDurationMin: result.totalDuration,
      totalDistanceKm: result.places.length > 0 ?
        currentTrip.routeSummary.totalDistanceKm : 0,
    });
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert("공유 기능은 곧 구현될 예정입니다.");
  };

  // Get center location for map and search
  const getMapCenter = () => {
    // Use cityLocation if available
    if (currentTrip.cityLocation) {
      return currentTrip.cityLocation;
    }
    // Fallback to first place if places exist
    if (currentTrip.places.length > 0) {
      return { lat: currentTrip.places[0].lat, lng: currentTrip.places[0].lng };
    }
    // Default fallback
    return { lat: 0, lng: 0 };
  };

  const mapCenter = getMapCenter();

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentTrip.title}</h1>
            <p className="text-sm text-gray-500">{currentTrip.city}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              새 여행
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              공유하기
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Places */}
        <div className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 space-y-4">
            <PlaceSearch
              searchCenter={mapCenter}
              onPlaceSelect={handlePlaceSelect}
            />

            <div className="text-sm text-gray-600">
              {currentTrip.places.length} / 10 장소
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <PlaceList
              places={currentTrip.places}
              onReorder={updatePlaceOrder}
              onRemove={removePlace}
            />
          </div>

          <div className="p-4 border-t border-gray-200">
            <OptimizationButton
              onOptimize={handleOptimize}
              onApply={handleApplyOptimization}
              disabled={currentTrip.places.length < 2}
            />
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <MapView
              center={mapCenter}
              places={currentTrip.places}
              directionsResult={currentTrip.directionsResult}
              onMapLoad={handleMapLoad}
            />
          </div>

          <RouteSummary summary={currentTrip.routeSummary} isCalculating={isCalculating} />
        </div>
      </div>
    </div>
  );
};
