import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { MapView } from "../components/Map/MapView";
import { PlaceSearch } from "../components/PlaceSearch/PlaceSearch";
import { PlaceList } from "../components/PlaceList/PlaceList";
import { RouteSummary } from "../components/RouteSummary/RouteSummary";
import { OptimizationButton } from "../components/OptimizationButton/OptimizationButton";
import { PlaceDetailModal } from "../components/PlaceDetailModal/PlaceDetailModal";
import { TransitionModal } from "../components/TransitionModal/TransitionModal";
import { calculateTotalRoute, calculateFullRoute } from "../services/googleMapsService";
import { optimizeRoute } from "../utils/optimization";
import type { PlaceSearchResult, Place, RouteSegment } from "../types/trip";

export const TripPlanPage = () => {
  const navigate = useNavigate();
  const { 
    currentTrip, 
    addPlace, 
    removePlace, 
    updatePlaceOrder,
    updatePlaceDay,
    addDay,
    removeDay,
    setDayTransitionOwnership,
    updateRouteSummary, 
    updateRouteSegments,
    updateDirectionsResult, 
    optimizePlaces 
  } = useTripStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [dayDirections, setDayDirections] = useState<Map<number, google.maps.DirectionsResult>>(new Map());
  const [dayTransitions, setDayTransitions] = useState<Array<{ from: number; to: number; directions: google.maps.DirectionsResult }>>([]); 
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<{ fromDay: number; toDay: number; segment: RouteSegment } | null>(null);

  const handleToggleDay = (day: number) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const handleToggleDayTransition = (fromDay: number, toDay: number) => {
    if (!currentTrip) return;
    const currentOwner = currentTrip.dayTransitionOwnership?.[`${fromDay}-${toDay}`] || toDay;
    const newOwner = currentOwner === fromDay ? toDay : fromDay;
    setDayTransitionOwnership(fromDay, toDay, newOwner);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleTransitionClick = (fromDay: number, toDay: number, segment: RouteSegment) => {
    setSelectedTransition({ fromDay, toDay, segment });
  };

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
      updateRouteSegments([]);
      setDayDirections(new Map());
      return;
    }

    // Calculate route when places change
    setIsCalculating(true);
    
    // Calculate total route for summary
    calculateTotalRoute(currentTrip.places)
      .then((routeData) => {
        updateRouteSummary({ 
          totalDurationMin: routeData.totalDurationMin, 
          totalDistanceKm: routeData.totalDistanceKm 
        });
        updateRouteSegments(routeData.segments);
      })
      .catch((error) => {
        console.error("Failed to calculate total route:", error);
      })
      .finally(() => {
        setIsCalculating(false);
      });

    // Calculate routes for each day separately
    const placesByDay = currentTrip.places.reduce((acc, place) => {
      const day = place.day || 1;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(place);
      return acc;
    }, {} as Record<number, typeof currentTrip.places>);

    const dayDirectionsPromises = Object.entries(placesByDay).map(async ([day, places]) => {
      if (places.length < 2) return [parseInt(day), null] as const;
      
      try {
        const result = await calculateFullRoute(places);
        return [parseInt(day), result] as const;
      } catch (error) {
        console.error(`Failed to calculate route for Day ${day}:`, error);
        return [parseInt(day), null] as const;
      }
    });

    Promise.all(dayDirectionsPromises).then((results) => {
      const newDayDirections = new Map<number, google.maps.DirectionsResult>();
      results.forEach(([day, result]) => {
        if (result) {
          newDayDirections.set(day, result);
        }
      });
      setDayDirections(newDayDirections);
    });

    // Calculate day-to-day transitions (last place of Day N -> first place of Day N+1)
    const sortedDays = Object.keys(placesByDay).map(Number).sort((a, b) => a - b);
    const transitionPromises = sortedDays.slice(0, -1).map(async (day, index) => {
      const currentDayPlaces = placesByDay[day];
      const nextDay = sortedDays[index + 1];
      const nextDayPlaces = placesByDay[nextDay];
      
      if (!currentDayPlaces.length || !nextDayPlaces.length) return null;
      
      const lastPlaceOfDay = currentDayPlaces[currentDayPlaces.length - 1];
      const firstPlaceOfNextDay = nextDayPlaces[0];
      
      try {
        const result = await calculateFullRoute([lastPlaceOfDay, firstPlaceOfNextDay]);
        return { from: day, to: nextDay, directions: result };
      } catch (error) {
        console.error(`Failed to calculate transition from Day ${day} to Day ${nextDay}:`, error);
        return null;
      }
    });

    Promise.all(transitionPromises).then((results) => {
      const validTransitions = results.filter((t): t is { from: number; to: number; directions: google.maps.DirectionsResult } => t !== null);
      setDayTransitions(validTransitions);
    });
  }, [currentTrip?.places]);

  // Filter places to show only visible (not collapsed) days
  const visiblePlaces = useMemo(() => {
    if (!currentTrip) return [];
    return currentTrip.places.filter(place => {
      const placeDay = place.day || 1;
      return !collapsedDays.has(placeDay);
    });
  }, [currentTrip, collapsedDays]);

  // Filter day directions to show only visible days
  const visibleDayDirections = useMemo(() => {
    const filtered = new Map<number, google.maps.DirectionsResult>();
    dayDirections.forEach((directions, day) => {
      if (!collapsedDays.has(day)) {
        filtered.set(day, directions);
      }
    });
    return filtered;
  }, [dayDirections, collapsedDays]);

  // Filter day transitions to show only when both days are visible
  // Include dayTransitionOwnership in dependencies to trigger re-render when ownership changes
  const visibleDayTransitions = useMemo(() => {
    return dayTransitions.filter(transition => 
      !collapsedDays.has(transition.from) && !collapsedDays.has(transition.to)
    );
  }, [dayTransitions, collapsedDays, currentTrip?.dayTransitionOwnership]);

  // Create a stable key for MapView to force re-render when ownership changes
  const mapKey = useMemo(() => {
    return JSON.stringify(currentTrip?.dayTransitionOwnership || {});
  }, [currentTrip?.dayTransitionOwnership]);

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
              routeSegments={currentTrip.routeSegments}
              startDate={currentTrip.startDate}
              totalDays={currentTrip.totalDays}
              collapsedDays={collapsedDays}
              dayTransitionOwnership={currentTrip.dayTransitionOwnership}
              onReorder={updatePlaceOrder}
              onRemove={removePlace}
              onAddDay={addDay}
              onRemoveDay={removeDay}
              onDayChange={updatePlaceDay}
              onToggleDay={handleToggleDay}
              onToggleDayTransition={handleToggleDayTransition}
              onPlaceClick={handlePlaceClick}
              onTransitionClick={handleTransitionClick}
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
              key={mapKey}
              center={mapCenter}
              places={visiblePlaces}
              dayDirections={visibleDayDirections}
              dayTransitions={visibleDayTransitions}
              dayTransitionOwnership={currentTrip.dayTransitionOwnership}
              onMapLoad={handleMapLoad}
            />
          </div>

          <RouteSummary summary={currentTrip.routeSummary} isCalculating={isCalculating} />
        </div>
      </div>

      {/* Modals */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
      {selectedTransition && (
        <TransitionModal
          fromDay={selectedTransition.fromDay}
          toDay={selectedTransition.toDay}
          segment={selectedTransition.segment}
          onClose={() => setSelectedTransition(null)}
        />
      )}
    </div>
  );
};
