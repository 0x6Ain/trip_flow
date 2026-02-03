import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { MapView } from "../components/Map/MapView";
import { PlaceSearch } from "../components/PlaceSearch/PlaceSearch";
import { PlaceList } from "../components/PlaceList/PlaceList";
import { PlaceDetailModal } from "../components/PlaceDetailModal/PlaceDetailModal";
import { TransitionModal } from "../components/TransitionModal/TransitionModal";
import { RouteSegmentModal } from "../components/RouteSegmentModal/RouteSegmentModal";
import {
  calculateTotalRoute,
  calculateFullRoute,
} from "../services/googleMapsService";
import { optimizeRoute } from "../utils/optimization";
import type {
  PlaceSearchResult,
  Place,
  RouteSegment,
  TravelMode,
} from "../types/trip";
import {
  getTripSummary,
  getDayDetail,
  createEvent,
  updateEvent,
  reorderEvents,
  deleteEvent,
  addDay as addDayToTrip,
  type TripSummary,
  type DayDetail,
} from "../services/api/tripApi";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableEventItem } from "../components/PlaceList/SortableEventItem";

export const TripPlanPage = () => {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const {
    currentTrip,
    addPlace,
    removePlace,
    updatePlaceOrder,
    updatePlaceDay,
    updatePlaceTime,
    updatePlaceCost,
    updatePlaceMemo,
    addDay,
    removeDay,
    setDayTransitionOwnership,
    updateRouteSummary,
    updateRouteSegments,
    updateDirectionsResult,
    updateSegmentTravelMode,
    updateSegmentDepartureTime,
    optimizePlaces,
    updateStartDate,
    updateTitle,
  } = useTripStore();

  // Server data states
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [currentDayDetail, setCurrentDayDetail] = useState<DayDetail | null>(
    null
  );
  const [selectedDay, setSelectedDay] = useState(1);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);
  const [serverLoadError, setServerLoadError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<{
    id: number;
    memo: string;
    cost: number;
    currency: string;
    time: string;
  } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [dayDirections, setDayDirections] = useState<
    Map<number, google.maps.DirectionsResult>
  >(new Map());
  const [dayTransitions, setDayTransitions] = useState<
    Array<{
      from: number;
      to: number;
      directions: google.maps.DirectionsResult;
    }>
  >([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<{
    fromDay: number;
    toDay: number;
    segment: RouteSegment;
  } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{
    fromPlace: Place;
    toPlace: Place;
    segment: RouteSegment;
  } | null>(null);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  // Drag & Drop sensors (must be at top level, not inside conditionals)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggleDay = (day: number) => {
    setCollapsedDays((prev) => {
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
    const currentOwner =
      currentTrip.dayTransitionOwnership?.[`${fromDay}-${toDay}`] || toDay;
    const newOwner = currentOwner === fromDay ? toDay : fromDay;
    setDayTransitionOwnership(fromDay, toDay, newOwner);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleTransitionClick = (
    fromDay: number,
    toDay: number,
    segment: RouteSegment
  ) => {
    setSelectedTransition({ fromDay, toDay, segment });
  };

  const handleSegmentClick = (
    fromPlace: Place,
    toPlace: Place,
    segment: RouteSegment
  ) => {
    setSelectedSegment({ fromPlace, toPlace, segment });
  };

  const handleSegmentTravelModeChange = async (
    fromPlaceId: string,
    toPlaceId: string,
    mode: TravelMode
  ) => {
    if (!currentTrip) return;

    // Update the segment travel mode in store
    updateSegmentTravelMode(fromPlaceId, toPlaceId, mode);

    // Find the from and to places
    const fromPlace = currentTrip.places.find((p) => p.placeId === fromPlaceId);
    const toPlace = currentTrip.places.find((p) => p.placeId === toPlaceId);

    if (!fromPlace || !toPlace) return;

    try {
      // Recalculate this specific segment with new travel mode
      const { calculateRoute } = await import("../services/googleMapsService");
      const newRoute = await calculateRoute(
        { lat: fromPlace.lat, lng: fromPlace.lng },
        { lat: toPlace.lat, lng: toPlace.lng },
        fromPlaceId,
        toPlaceId,
        mode
      );

      // Update the segment in routeSegments
      const updatedSegments: RouteSegment[] = (
        currentTrip.routeSegments || []
      ).map((seg) =>
        seg.fromPlaceId === fromPlaceId && seg.toPlaceId === toPlaceId
          ? {
              ...seg,
              durationMin: newRoute.duration,
              distanceKm: newRoute.distance,
              travelMode: mode,
            }
          : seg
      );

      updateRouteSegments(updatedSegments);

      // Recalculate total summary
      const totalDuration = updatedSegments.reduce(
        (sum, seg) => sum + seg.durationMin,
        0
      );
      const totalDistance = updatedSegments.reduce(
        (sum, seg) => sum + seg.distanceKm,
        0
      );
      updateRouteSummary({
        totalDurationMin: totalDuration,
        totalDistanceKm: totalDistance,
      });

      // Update the selectedSegment to show new values
      if (selectedSegment) {
        setSelectedSegment({
          ...selectedSegment,
          segment: {
            ...selectedSegment.segment,
            durationMin: newRoute.duration,
            distanceKm: newRoute.distance,
            travelMode: mode,
          },
        });
      }
    } catch (error) {
      console.error("Failed to recalculate route:", error);
      alert("경로 재계산에 실패했습니다.");
    }
  };

  // Load trip from server if tripId is provided
  useEffect(() => {
    if (!tripId) return;

    const loadTripFromServer = async () => {
      setIsLoadingFromServer(true);
      setServerLoadError(null);

      try {
        // 1. GET /trips/{id}/ - Trip 요약 조회 (day 수 가져오기)
        console.log(`🔍 Trip 요약 조회: /trips/${tripId}/`);
        const summary = await getTripSummary(parseInt(tripId, 10));
        setTripSummary(summary);
        console.log(`✅ Trip 요약 조회 성공:`, summary);

        // 2. GET /trips/{id}/days?day=1 - Day 1 상세 조회
        console.log(`🔍 Day 1 상세 조회: /trips/${tripId}/days?day=1`);
        const day1Detail = await getDayDetail(parseInt(tripId, 10), 1);
        setCurrentDayDetail(day1Detail);
        setSelectedDay(1);
        console.log(`✅ Day 1 상세 조회 성공:`, day1Detail);
      } catch (error: any) {
        console.error("❌ Trip 로드 실패:", error);
        setServerLoadError(
          error.response?.data?.message || "Trip을 불러올 수 없습니다."
        );
      } finally {
        setIsLoadingFromServer(false);
      }
    };

    loadTripFromServer();
  }, [tripId]);

  useEffect(() => {
    if (tripId) return; // Server mode - skip local trip check

    if (!currentTrip) {
      navigate("/");
      return;
    }
  }, [currentTrip, navigate, tripId]);

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

    // Calculate route when places or travel mode change
    setIsCalculating(true);

    const travelMode = currentTrip.travelMode || "DRIVING";

    // Calculate total route for summary
    calculateTotalRoute(
      currentTrip.places,
      travelMode,
      currentTrip.routeSegments
    )
      .then((routeData) => {
        updateRouteSummary({
          totalDurationMin: routeData.totalDurationMin,
          totalDistanceKm: routeData.totalDistanceKm,
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

    const dayDirectionsPromises = Object.entries(placesByDay).map(
      async ([day, places]) => {
        if (places.length < 2) return [parseInt(day), null] as const;

        try {
          const result = await calculateFullRoute(places, travelMode);
          return [parseInt(day), result] as const;
        } catch (error) {
          console.error(`Failed to calculate route for Day ${day}:`, error);
          return [parseInt(day), null] as const;
        }
      }
    );

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
    const sortedDays = Object.keys(placesByDay)
      .map(Number)
      .sort((a, b) => a - b);
    const transitionPromises = sortedDays
      .slice(0, -1)
      .map(async (day, index) => {
        const currentDayPlaces = placesByDay[day];
        const nextDay = sortedDays[index + 1];
        const nextDayPlaces = placesByDay[nextDay];

        if (!currentDayPlaces.length || !nextDayPlaces.length) return null;

        const lastPlaceOfDay = currentDayPlaces[currentDayPlaces.length - 1];
        const firstPlaceOfNextDay = nextDayPlaces[0];

        try {
          const result = await calculateFullRoute(
            [lastPlaceOfDay, firstPlaceOfNextDay],
            travelMode
          );
          return { from: day, to: nextDay, directions: result };
        } catch (error) {
          console.error(
            `Failed to calculate transition from Day ${day} to Day ${nextDay}:`,
            error
          );
          return null;
        }
      });

    Promise.all(transitionPromises).then((results) => {
      const validTransitions = results.filter(
        (
          t
        ): t is {
          from: number;
          to: number;
          directions: google.maps.DirectionsResult;
        } => t !== null
      );
      setDayTransitions(validTransitions);
    });
  }, [currentTrip?.places, currentTrip?.travelMode]);

  // Filter places to show only visible (not collapsed) days
  const visiblePlaces = useMemo(() => {
    if (!currentTrip) return [];
    return currentTrip.places.filter((place) => {
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
    return dayTransitions.filter(
      (transition) =>
        !collapsedDays.has(transition.from) && !collapsedDays.has(transition.to)
    );
  }, [dayTransitions, collapsedDays, currentTrip?.dayTransitionOwnership]);

  // Create a stable key for MapView to force re-render when ownership changes
  const mapKey = useMemo(() => {
    return JSON.stringify(currentTrip?.dayTransitionOwnership || {});
  }, [currentTrip?.dayTransitionOwnership]);

  // Server mode - Loading state
  if (tripId && isLoadingFromServer) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Trip을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Server mode - Error state
  if (tripId && serverLoadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Trip을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">{serverLoadError}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Server mode - Show day detail UI
  if (tripId && tripSummary && currentDayDetail) {
    const handleDayChange = async (day: number) => {
      setSelectedDay(day);
      setIsLoadingFromServer(true);
      try {
        const dayDetail = await getDayDetail(parseInt(tripId, 10), day);
        setCurrentDayDetail(dayDetail);
      } catch (error) {
        console.error(`Day ${day} 로드 실패:`, error);
        alert(`Day ${day}를 불러올 수 없습니다.`);
      } finally {
        setIsLoadingFromServer(false);
      }
    };

    const handleServerPlaceSelect = async (place: PlaceSearchResult) => {
      try {
        // Event 추가 API 호출
        await createEvent(parseInt(tripId, 10), {
          placeId: place.placeId,
          placeName: place.name,
          lat: place.location.lat,
          lng: place.location.lng,
          day: selectedDay,
        });

        // 현재 Day 다시 불러오기
        const updatedDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay
        );
        setCurrentDayDetail(updatedDayDetail);

        console.log("✅ Event 추가 성공");
      } catch (error: any) {
        console.error("❌ Event 추가 실패:", error);
        alert(error.response?.data?.message || "장소 추가에 실패했습니다.");
      }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = currentDayDetail.events.findIndex(
        (e) => e.id === active.id
      );
      const newIndex = currentDayDetail.events.findIndex(
        (e) => e.id === over.id
      );

      if (oldIndex === -1 || newIndex === -1) return;

      // 낙관적 업데이트
      const reorderedEvents = arrayMove(
        currentDayDetail.events,
        oldIndex,
        newIndex
      );
      setCurrentDayDetail({
        ...currentDayDetail,
        events: reorderedEvents,
      });

      try {
        // 서버에 순서 변경 요청
        const eventsData = reorderedEvents.map((e, idx) => ({
          id: e.id,
          order: (idx + 1) * 10,
          day: currentDayDetail.day,
        }));

        await reorderEvents(parseInt(tripId, 10), {
          events: eventsData,
          recalculateRoutes: true,
        });

        // 최신 데이터 다시 불러오기
        const updatedDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay
        );
        setCurrentDayDetail(updatedDayDetail);

        console.log("✅ 순서 변경 성공");
      } catch (error: any) {
        console.error("❌ 순서 변경 실패:", error);
        alert(error.response?.data?.message || "순서 변경에 실패했습니다.");

        // 원래 순서로 복구
        const originalDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay
        );
        setCurrentDayDetail(originalDayDetail);
      }
    };

    const handleEditEvent = (eventId: number) => {
      const event = currentDayDetail.events.find((e) => e.id === eventId);
      if (event) {
        setEditingEvent({
          id: event.id,
          memo: event.memo || "",
          cost: 0,
          currency: "KRW",
          time: event.time || "",
        });
      }
    };

    const handleSaveEvent = async () => {
      if (!editingEvent) return;

      try {
        await updateEvent(parseInt(tripId, 10), editingEvent.id, {
          memo: editingEvent.memo,
          startTime: editingEvent.time,
        });

        // 최신 데이터 다시 불러오기
        const updatedDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay
        );
        setCurrentDayDetail(updatedDayDetail);
        setEditingEvent(null);

        console.log("✅ Event 업데이트 성공");
      } catch (error: any) {
        console.error("❌ Event 업데이트 실패:", error);
        alert(error.response?.data?.message || "업데이트에 실패했습니다.");
      }
    };

    const handleDeleteEvent = async (eventId: number) => {
      if (!confirm("이 장소를 삭제하시겠습니까?")) return;

      try {
        await deleteEvent(parseInt(tripId, 10), eventId);

        // 최신 데이터 다시 불러오기
        const updatedDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay
        );
        setCurrentDayDetail(updatedDayDetail);

        console.log("✅ Event 삭제 성공");
      } catch (error: any) {
        console.error("❌ Event 삭제 실패:", error);
        alert(error.response?.data?.message || "삭제에 실패했습니다.");
      }
    };

    const handleAddDay = async () => {
      try {
        const updatedTrip = await addDayToTrip(parseInt(tripId, 10));
        setTripSummary(updatedTrip);

        console.log("✅ Day 추가 성공");
      } catch (error: any) {
        console.error("❌ Day 추가 실패:", error);
        alert(error.response?.data?.message || "Day 추가에 실패했습니다.");
      }
    };

    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tripSummary.title}
                </h1>
                <p className="text-sm text-gray-500">{tripSummary.city}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              홈으로
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Day Tabs */}
          <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Days</h3>
              <p className="text-sm text-gray-600 mb-4">
                총 {tripSummary.totalDays}일
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {Array.from(
                { length: tripSummary.totalDays },
                (_, i) => i + 1
              ).map((day) => (
                <button
                  key={day}
                  onClick={() => handleDayChange(day)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedDay === day
                      ? "bg-blue-500 text-white"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium">Day {day}</div>
                  {tripSummary.startDate && (
                    <div className="text-xs mt-1 opacity-75">
                      {new Date(
                        new Date(tripSummary.startDate).getTime() +
                          (day - 1) * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </button>
              ))}

              {/* Add Day Button */}
              <button
                onClick={handleAddDay}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="font-medium">Day 추가</span>
              </button>
            </div>
          </div>

          {/* Middle Panel - Events */}
          <div className="w-100 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Day {currentDayDetail.day}
              </h2>
              {currentDayDetail.date && (
                <p className="text-sm text-gray-600">
                  {new Date(currentDayDetail.date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </p>
              )}

              {/* Place Search */}
              <div className="mt-4">
                <PlaceSearch
                  searchCenter={tripSummary.startLocation}
                  onPlaceSelect={handleServerPlaceSelect}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {currentDayDetail.events.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>아직 추가된 장소가 없습니다</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={currentDayDetail.events.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {currentDayDetail.events.map((event, idx) => (
                        <SortableEventItem
                          key={event.id}
                          event={event}
                          index={idx}
                          onEdit={handleEditEvent}
                          onDelete={handleDeleteEvent}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="flex-1 bg-gray-200">
            <MapView
              center={
                currentDayDetail.events.length > 0
                  ? currentDayDetail.events[0].location
                  : tripSummary.startLocation
              }
              places={currentDayDetail.events.map((event, idx) => ({
                id: event.id.toString(),
                placeId: event.placeId,
                name: event.name,
                lat: event.location.lat,
                lng: event.location.lng,
                order: idx,
                day: currentDayDetail.day,
                visitTime: event.time || undefined,
                memo: event.memo,
              }))}
            />
          </div>
        </div>

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                장소 정보 편집
              </h3>

              <div className="space-y-4">
                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    방문 시간
                  </label>
                  <input
                    type="time"
                    value={editingEvent.time}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, time: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Memo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모
                  </label>
                  <textarea
                    value={editingEvent.memo}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, memo: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="메모를 입력하세요..."
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    예상 비용
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editingEvent.cost}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          cost: parseInt(e.target.value) || 0,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <select
                      value={editingEvent.currency}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          currency: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="KRW">KRW</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * 비용 기능은 추후 구현 예정입니다
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Local mode
  if (!currentTrip) {
    return null;
  }

  const handlePlaceSelect = async (place: PlaceSearchResult) => {
    const beforePlaceCount = currentTrip.places.length;

    addPlace({
      placeId: place.placeId,
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng,
    });

    // Wait a tick for the state to update
    setTimeout(async () => {
      const updatedTrip = useTripStore.getState().currentTrip;
      if (!updatedTrip || updatedTrip.places.length !== beforePlaceCount + 1)
        return;

      const newPlace = updatedTrip.places[updatedTrip.places.length - 1];

      // If this is not the first place, calculate time based on previous place
      if (beforePlaceCount > 0) {
        const prevPlace = updatedTrip.places[beforePlaceCount - 1];

        try {
          // Calculate route between previous and new place
          const { calculateRoute } = await import(
            "../services/googleMapsService"
          );
          const travelMode =
            (updatedTrip.routeSegments || []).find(
              (s) =>
                s.fromPlaceId === prevPlace.placeId &&
                s.toPlaceId === newPlace.placeId
            )?.travelMode ||
            updatedTrip.travelMode ||
            "DRIVING";

          const route = await calculateRoute(
            { lat: prevPlace.lat, lng: prevPlace.lng },
            { lat: newPlace.lat, lng: newPlace.lng },
            prevPlace.placeId,
            newPlace.placeId,
            travelMode
          );

          // Calculate new visit time
          if (prevPlace.visitTime) {
            const [hours, minutes] = prevPlace.visitTime.split(":").map(Number);
            const totalMinutes = hours * 60 + minutes + route.duration;

            // Check if time goes past midnight
            let newDay = newPlace.day || 1;
            let newHours = Math.floor(totalMinutes / 60);
            let newMinutes = totalMinutes % 60;

            // If time is 24:00 or later, move to next day
            while (newHours >= 24) {
              newHours -= 24;
              newDay += 1;
            }

            const newVisitTime = `${String(newHours).padStart(2, "0")}:${String(
              newMinutes
            ).padStart(2, "0")}`;

            // Update place time
            updatePlaceTime(newPlace.id, newVisitTime);

            // Update place day if it changed
            if (newDay !== newPlace.day) {
              // Ensure the trip has enough days
              const currentTotalDays = updatedTrip.totalDays || 1;
              if (newDay > currentTotalDays) {
                addDay();
              }
              updatePlaceDay(newPlace.id, newDay);
            }
          } else {
            // If previous place has no time, set a default time for new place
            const defaultTime = "09:00";
            updatePlaceTime(newPlace.id, defaultTime);
          }
        } catch (error) {
          console.error("Failed to calculate route for new place:", error);
        }
      } else {
        // First place - set default time
        const defaultTime = "09:00";
        updatePlaceTime(newPlace.id, defaultTime);
      }
    }, 50);
  };

  const handleOptimize = async () => {
    if (!currentTrip) throw new Error("No trip");
    const travelMode = currentTrip.travelMode || "DRIVING";
    return await optimizeRoute(currentTrip.places, travelMode);
  };

  const handleApplyOptimization = (result: any) => {
    optimizePlaces(result.places, {
      totalDurationMin: result.totalDuration,
      totalDistanceKm:
        result.places.length > 0 ? currentTrip.routeSummary.totalDistanceKm : 0,
    });
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert("공유 기능은 곧 구현될 예정입니다.");
  };

  const handleStartDateChange = (newDate: string) => {
    updateStartDate(newDate);
    setIsEditingStartDate(false);
  };

  const handleTitleEdit = () => {
    setTempTitle(currentTrip.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (tempTitle.trim()) {
      updateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
    }
  };

  const formatStartDate = (dateString?: string) => {
    if (!dateString) return "날짜 미정";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
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
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="text-2xl font-bold text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: "300px" }}
              />
            ) : (
              <button
                onClick={handleTitleEdit}
                className="text-2xl font-bold text-gray-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors text-left flex items-center gap-2 group"
              >
                {currentTrip.title}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-500">{currentTrip.city}</p>
              <span className="text-gray-300">•</span>
              {isEditingStartDate ? (
                <input
                  type="date"
                  value={currentTrip.startDate || ""}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  onBlur={() => setIsEditingStartDate(false)}
                  autoFocus
                  className="text-sm text-gray-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <button
                  onClick={() => setIsEditingStartDate(true)}
                  className="text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 group-hover:text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatStartDate(currentTrip.startDate)}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              새 여행
            </button>
            <button
              onClick={() => navigate("/schedule")}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              시간표
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
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
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
              onSegmentClick={handleSegmentClick}
              onTimeUpdate={updatePlaceTime}
              onCostUpdate={updatePlaceCost}
              onMemoUpdate={updatePlaceMemo}
            />
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={async () => {
                try {
                  const result = await handleOptimize();
                  handleApplyOptimization(result);
                } catch (error) {
                  console.error("최적화 실패:", error);
                  alert("경로 최적화에 실패했습니다.");
                }
              }}
              disabled={currentTrip.places.length < 2}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                currentTrip.places.length < 2
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-500 text-white hover:bg-purple-600"
              }`}
            >
              경로 최적화
            </button>
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

          {/* Route Summary */}
          {(currentTrip.routeSummary.totalDurationMin > 0 ||
            currentTrip.routeSummary.totalDistanceKm > 0) && (
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-sm text-gray-500">총 이동 시간</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {isCalculating ? (
                        <span className="text-gray-400">계산 중...</span>
                      ) : (
                        <>
                          {Math.floor(
                            currentTrip.routeSummary.totalDurationMin / 60
                          )}
                          시간 {currentTrip.routeSummary.totalDurationMin % 60}
                          분
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">총 거리</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {isCalculating ? (
                        <span className="text-gray-400">계산 중...</span>
                      ) : (
                        <>
                          {currentTrip.routeSummary.totalDistanceKm.toFixed(1)}{" "}
                          km
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
      {selectedSegment && (
        <RouteSegmentModal
          fromPlace={selectedSegment.fromPlace}
          toPlace={selectedSegment.toPlace}
          segment={selectedSegment.segment}
          defaultTravelMode={currentTrip.travelMode}
          onClose={() => setSelectedSegment(null)}
          onTravelModeChange={handleSegmentTravelModeChange}
          onDepartureTimeChange={updateSegmentDepartureTime}
        />
      )}
    </div>
  );
};
