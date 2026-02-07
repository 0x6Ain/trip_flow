import { useEffect, useState, useMemo, useRef } from "react";
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
  Currency,
} from "../types/trip";
import {
  getTripSummary,
  getDayDetail,
  createEvent,
  updateEvent,
  reorderEvents,
  deleteEvent,
  addDay as addDayToTrip,
  removeDay as removeDayFromTrip,
  updateTrip,
  deleteTrip,
  updateRouteTravelMode,
  updateRoute,
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
    updateSegmentCost,
    optimizePlaces,
    updateStartDate,
    updateTitle,
  } = useTripStore();

  // Server data states
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [currentDayDetail, setCurrentDayDetail] = useState<DayDetail | null>(
    null,
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
  const [_collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [dayDirections, setDayDirections] = useState<
    Map<number, google.maps.DirectionsResult>
  >(new Map());
  const [_dayTransitions, setDayTransitions] = useState<
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
    }),
  );

  const handleShare = () => {
    alert("공유 기능은 곧 구현될 예정입니다.");
  };

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
    segment: RouteSegment,
  ) => {
    setSelectedTransition({ fromDay, toDay, segment });
  };

  const handleSegmentClick = (
    fromPlace: Place,
    toPlace: Place,
    segment: RouteSegment,
  ) => {
    setSelectedSegment({ fromPlace, toPlace, segment });
  };

  const handleSegmentTravelModeChange = async (
    fromPlaceId: string,
    toPlaceId: string,
    mode: TravelMode,
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
        mode,
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
          : seg,
      );

      updateRouteSegments(updatedSegments);

      // Recalculate total summary
      const totalDuration = updatedSegments.reduce(
        (sum, seg) => sum + seg.durationMin,
        0,
      );
      const totalDistance = updatedSegments.reduce(
        (sum, seg) => sum + seg.distanceKm,
        0,
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

  const handleSegmentCostChange = (
    fromPlaceId: string,
    toPlaceId: string,
    cost: number,
    currency: Currency,
  ) => {
    updateSegmentCost(fromPlaceId, toPlaceId, cost, currency);
  };

  // Load trip from server if tripId is provided
  const loadInitiated = useRef(false);
  const currentTripId = useRef<string | null>(null);
  
  useEffect(() => {
    if (!tripId) {
      loadInitiated.current = false;
      currentTripId.current = null;
      return;
    }

    // tripId가 변경되면 플래그 리셋
    if (currentTripId.current !== tripId) {
      loadInitiated.current = false;
      currentTripId.current = tripId;
    }

    // 이미 로드를 시작했으면 중복 호출 방지
    if (loadInitiated.current) {
      return;
    }
    loadInitiated.current = true;

    const loadTripFromServer = async () => {
      setIsLoadingFromServer(true);
      setServerLoadError(null);

      try {
        // 1. GET /trips/{id}/ - Trip 요약 조회 (day 수 가져오기)
        const summary = await getTripSummary(parseInt(tripId, 10));
        setTripSummary(summary);

        // 2. GET /trips/{id}/days?day=1 - Day 1 상세 조회
        const day1Detail = await getDayDetail(parseInt(tripId, 10), 1);
        setCurrentDayDetail(day1Detail);
        setSelectedDay(1);
      } catch (error: any) {
        console.error("❌ Trip 로드 실패:", error);
        setServerLoadError(
          error.response?.data?.message || "Trip을 불러올 수 없습니다.",
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
    // Google Maps API loaded
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
      currentTrip.routeSegments,
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
    const placesByDay = currentTrip.places.reduce(
      (acc, place) => {
        const day = place.day || 1;
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(place);
        return acc;
      },
      {} as Record<number, typeof currentTrip.places>,
    );

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
      },
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
            travelMode,
          );
          return { from: day, to: nextDay, directions: result };
        } catch (error) {
          console.error(
            `Failed to calculate transition from Day ${day} to Day ${nextDay}:`,
            error,
          );
          return null;
        }
      });

    Promise.all(transitionPromises).then((results) => {
      const validTransitions = results.filter(
        (
          t,
        ): t is {
          from: number;
          to: number;
          directions: google.maps.DirectionsResult;
        } => t !== null,
      );
      setDayTransitions(validTransitions);
    });
  }, [currentTrip?.places, currentTrip?.travelMode]);

  // Note: visiblePlaces, visibleDayDirections, visibleDayTransitions are not used in the new UI layout
  // They were used in the old 2-column layout, but the new 3-column layout filters places per selected day

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
        // Event 추가 API 호출 (lat/lng는 DecimalField 검증을 위해 8자리로 반올림)
        await createEvent(parseInt(tripId, 10), {
          placeId: place.placeId,
          placeName: place.name,
          lat: parseFloat(place.location.lat.toFixed(8)),
          lng: parseFloat(place.location.lng.toFixed(8)),
          day: selectedDay,
        });

        // 현재 Day 다시 불러오기
        const updatedDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay,
        );
        setCurrentDayDetail(updatedDayDetail);

      } catch (error: any) {
        console.error("❌ Event 추가 실패:", error);
        alert(error.response?.data?.message || "장소 추가에 실패했습니다.");
      }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = currentDayDetail.events.findIndex(
        (e) => e.id === active.id,
      );
      const newIndex = currentDayDetail.events.findIndex(
        (e) => e.id === over.id,
      );

      if (oldIndex === -1 || newIndex === -1) return;

      // 낙관적 업데이트
      const reorderedEvents = arrayMove(
        currentDayDetail.events,
        oldIndex,
        newIndex,
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
          selectedDay,
        );
        setCurrentDayDetail(updatedDayDetail);

      } catch (error: any) {
        console.error("❌ 순서 변경 실패:", error);
        alert(error.response?.data?.message || "순서 변경에 실패했습니다.");

        // 원래 순서로 복구
        const originalDayDetail = await getDayDetail(
          parseInt(tripId, 10),
          selectedDay,
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
          selectedDay,
        );
        setCurrentDayDetail(updatedDayDetail);
        setEditingEvent(null);

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
          selectedDay,
        );
        setCurrentDayDetail(updatedDayDetail);

      } catch (error: any) {
        console.error("❌ Event 삭제 실패:", error);
        alert(error.response?.data?.message || "삭제에 실패했습니다.");
      }
    };

    const handleAddDay = async () => {
      try {
        const updatedTrip = await addDayToTrip(parseInt(tripId, 10));
        setTripSummary(updatedTrip);

      } catch (error: any) {
        console.error("❌ Day 추가 실패:", error);
        alert(error.response?.data?.message || "Day 추가에 실패했습니다.");
      }
    };

    const handleRemoveDay = async (dayToRemove: number) => {
      if (tripSummary.totalDays <= 1) {
        alert("마지막 Day는 삭제할 수 없습니다.");
        return;
      }

      const confirmMessage = `Day ${dayToRemove}를 삭제하시겠습니까?\n해당 Day의 모든 이벤트가 삭제됩니다.`;
      if (!confirm(confirmMessage)) return;

      try {
        const updatedTrip = await removeDayFromTrip(
          parseInt(tripId, 10),
          dayToRemove,
        );
        setTripSummary(updatedTrip);

        // 삭제한 Day를 보고 있었다면, 이전 Day로 이동
        if (selectedDay === dayToRemove) {
          const newDay = Math.max(1, dayToRemove - 1);
          setSelectedDay(newDay);
          const newDayDetail = await getDayDetail(parseInt(tripId, 10), newDay);
          setCurrentDayDetail(newDayDetail);
        } else if (selectedDay > dayToRemove) {
          // 현재 보고 있는 Day가 삭제된 Day보다 뒤에 있으면, Day 번호 조정
          const adjustedDay = selectedDay - 1;
          setSelectedDay(adjustedDay);
          const newDayDetail = await getDayDetail(
            parseInt(tripId, 10),
            adjustedDay,
          );
          setCurrentDayDetail(newDayDetail);
        } else {
          // 현재 Day 다시 로드 (routes 재계산 반영)
          const newDayDetail = await getDayDetail(
            parseInt(tripId, 10),
            selectedDay,
          );
          setCurrentDayDetail(newDayDetail);
        }

      } catch (error: any) {
        console.error("❌ Day 삭제 실패:", error);
        alert(error.response?.data?.message || "Day 삭제에 실패했습니다.");
      }
    };

    const handleTitleUpdate = async (newTitle: string) => {
      if (!newTitle.trim()) {
        alert("여행 제목을 입력해주세요.");
        return;
      }

      try {
        const updatedTrip = await updateTrip(parseInt(tripId, 10), {
          title: newTitle.trim(),
        });
        setTripSummary(updatedTrip);
        setIsEditingTitle(false);
      } catch (error: any) {
        console.error("❌ 여행 제목 업데이트 실패:", error);
        alert(
          error.response?.data?.message || "여행 제목 업데이트에 실패했습니다.",
        );
      }
    };

    const handleDeleteTrip = async () => {
      const confirmMessage = `"${tripSummary.title}" 여행을 삭제하시겠습니까?\n모든 Day와 이벤트가 삭제되며, 복구할 수 없습니다.`;
      if (!confirm(confirmMessage)) return;

      try {
        await deleteTrip(parseInt(tripId, 10));
        alert("여행이 삭제되었습니다.");
        navigate("/");
      } catch (error: any) {
        console.error("❌ 여행 삭제 실패:", error);
        alert(error.response?.data?.message || "여행 삭제에 실패했습니다.");
      }
    };

    const handleStartDateUpdate = async (newDate: string) => {
      if (!newDate) {
        alert("날짜를 선택해주세요.");
        return;
      }

      try {
        const updatedTrip = await updateTrip(parseInt(tripId, 10), {
          startDate: newDate,
        });
        setTripSummary(updatedTrip);
        setIsEditingStartDate(false);
      } catch (error: any) {
        console.error("❌ 여행 시작일 업데이트 실패:", error);
        alert(
          error.response?.data?.message ||
            "여행 시작일 업데이트에 실패했습니다.",
        );
      }
    };

    const handleRouteTravelModeChange = async (
      eventId: number,
      newMode: TravelMode,
    ) => {
      try {
        const updatedDayDetail = await updateRouteTravelMode(
          parseInt(tripId, 10),
          eventId,
          newMode,
        );
        setCurrentDayDetail(updatedDayDetail);
      } catch (error: any) {
        console.error("❌ 이동 수단 변경 실패:", error);
        alert(
          error.response?.data?.message || "이동 수단 변경에 실패했습니다.",
        );
      }
    };

    const handleServerSegmentTravelModeChange = async (
      fromPlaceId: string,
      _toPlaceId: string,
      mode: TravelMode,
    ) => {
      // Find the event that has this route
      const eventIdx = currentDayDetail.events.findIndex(
        (e) => e.placeId === fromPlaceId,
      );
      if (eventIdx === -1) return;

      const event = currentDayDetail.events[eventIdx];
      await handleRouteTravelModeChange(event.id, mode);
    };

    const handleServerSegmentDepartureTimeChange = async (
      fromPlaceId: string,
      _toPlaceId: string,
      departureTime: string,
    ) => {
      // Find the event that has this route
      const eventIdx = currentDayDetail.events.findIndex(
        (e) => e.placeId === fromPlaceId,
      );
      if (eventIdx === -1) return;

      const event = currentDayDetail.events[eventIdx];
      try {
        const updatedDayDetail = await updateRoute(
          parseInt(tripId, 10),
          event.id,
          { departureTime },
        );
        setCurrentDayDetail(updatedDayDetail);
      } catch (error: any) {
        console.error("❌ 출발 시간 변경 실패:", error);
        alert(
          error.response?.data?.message || "출발 시간 변경에 실패했습니다.",
        );
      }
    };

    const handleServerSegmentCostChange = async (
      fromPlaceId: string,
      _toPlaceId: string,
      cost: number,
      currency: Currency,
    ) => {
      // Find the event that has this route
      const eventIdx = currentDayDetail.events.findIndex(
        (e) => e.placeId === fromPlaceId,
      );
      if (eventIdx === -1) return;

      const event = currentDayDetail.events[eventIdx];
      try {
        const updatedDayDetail = await updateRoute(
          parseInt(tripId, 10),
          event.id,
          { cost, currency },
        );
        setCurrentDayDetail(updatedDayDetail);
      } catch (error: any) {
        console.error("❌ 교통비 변경 실패:", error);
        alert(error.response?.data?.message || "교통비 변경에 실패했습니다.");
      }
    };

    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-4">
          <div className="flex items-center justify-between">
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={() => {
                    if (tempTitle.trim()) {
                      handleTitleUpdate(tempTitle);
                    } else {
                      setIsEditingTitle(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleTitleUpdate(tempTitle);
                    } else if (e.key === "Escape") {
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="text-xl font-bold text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ minWidth: "300px" }}
                />
              ) : (
                <button
                  onClick={() => {
                    setTempTitle(tripSummary.title);
                    setIsEditingTitle(true);
                  }}
                  className="text-xl font-bold text-gray-900 hover:text-blue-600 hover:bg-blue-50 px-5 py-1 rounded transition-colors text-left flex items-center gap-2 group"
                >
                  {tripSummary.title}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="flex items-center gap-3 px-3">
                {tripSummary.startDate && (
                  <div className="flex items-center">
                    {isEditingStartDate ? (
                      <input
                        type="date"
                        value={tripSummary.startDate}
                        onChange={(e) => handleStartDateUpdate(e.target.value)}
                        onBlur={() => setIsEditingStartDate(false)}
                        autoFocus
                        className="text-sm text-gray-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingStartDate(true)}
                        className="text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                      >
                        {new Date(tripSummary.startDate).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-700">{tripSummary.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5">
              <button
                onClick={handleDeleteTrip}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="여행 삭제"
              >
                삭제
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                새 여행
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                홈으로
              </button>
              <button
                onClick={() => navigate(tripId ? `/weekly-schedule/${tripId}` : "/weekly-schedule")}
                className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                시간표
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                공유하기
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Day Tabs */}
          <div className="w-44 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Days</h3>
              <p className="text-xs text-gray-500 mt-1">
                총 {tripSummary.totalDays}일
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {Array.from(
                { length: tripSummary.totalDays },
                (_, i) => i + 1,
              ).map((day) => (
                <div
                  key={day}
                  className={`group relative w-full rounded-lg transition-colors ${
                    selectedDay === day
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <button
                    onClick={() => handleDayChange(day)}
                    className="w-full text-left px-3 py-2.5"
                  >
                    <div className="text-sm font-medium">Day {day}</div>
                    {tripSummary.startDate && (
                      <div
                        className={`text-xs mt-0.5 ${selectedDay === day ? "text-blue-100" : "text-gray-500"}`}
                      >
                        {new Date(
                          new Date(tripSummary.startDate).getTime() +
                            (day - 1) * 24 * 60 * 60 * 1000,
                        ).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </button>

                  {/* 호버 시 나타나는 삭제 버튼 */}
                  {tripSummary.totalDays > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDay(day);
                      }}
                      className={`absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                        selectedDay === day
                          ? "hover:bg-red-400 text-white"
                          : "hover:bg-red-50 text-gray-400 hover:text-red-600"
                      }`}
                      title={`Day ${day} 삭제`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* Add Day Button */}
              <button
                onClick={handleAddDay}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
                <span className="text-sm font-medium">Day 추가</span>
              </button>
            </div>
          </div>

          {/* Middle Panel - Events */}
          <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Day {currentDayDetail.day}
                  </h2>
                  {currentDayDetail.date && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {new Date(currentDayDetail.date).toLocaleDateString(
                        "ko-KR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        },
                      )}
                    </p>
                  )}
                </div>

                {/* 삭제 버튼 (항상 표시) */}
                {tripSummary.totalDays > 1 && (
                  <button
                    onClick={() => handleRemoveDay(currentDayDetail.day)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    title={`Day ${currentDayDetail.day} 삭제`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Place Search */}
              <div className="mt-3">
                <PlaceSearch
                  searchCenter={tripSummary.startLocation}
                  onPlaceSelect={handleServerPlaceSelect}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {currentDayDetail.events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-300 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    아직 추가된 장소가 없습니다
                  </p>
                  <p className="text-xs text-gray-500">
                    위의 검색창에서 장소를 검색해보세요
                  </p>
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
                    <div className="py-2">
                      {currentDayDetail.events.map((event, idx) => (
                        <div key={event.id}>
                          <SortableEventItem
                            event={event}
                            index={idx}
                            onEdit={handleEditEvent}
                            onDelete={handleDeleteEvent}
                          />

                          {/* Route segment button */}
                          {idx < currentDayDetail.events.length - 1 &&
                            event.nextRoute && (
                              <button
                                onClick={() => {
                                  if (!event.nextRoute) return;

                                  const nextEvent =
                                    currentDayDetail.events[idx + 1];
                                  const fromPlace: Place = {
                                    id: event.id.toString(),
                                    placeId: event.placeId,
                                    name: event.name,
                                    lat: event.location.lat,
                                    lng: event.location.lng,
                                    order: idx,
                                    day: currentDayDetail.day,
                                    visitTime: event.time || undefined,
                                    memo: event.memo,
                                  };
                                  const toPlace: Place = {
                                    id: nextEvent.id.toString(),
                                    placeId: nextEvent.placeId,
                                    name: nextEvent.name,
                                    lat: nextEvent.location.lat,
                                    lng: nextEvent.location.lng,
                                    order: idx + 1,
                                    day: currentDayDetail.day,
                                    visitTime: nextEvent.time || undefined,
                                    memo: nextEvent.memo,
                                  };
                                  const segment: RouteSegment = {
                                    fromPlaceId: event.placeId,
                                    toPlaceId: nextEvent.placeId,
                                    durationMin: event.nextRoute.durationMin,
                                    distanceKm: event.nextRoute.distanceKm,
                                    travelMode: event.nextRoute.travelMode,
                                    polyline: event.nextRoute.polyline,
                                    departureTime:
                                      event.nextRoute.departureTime,
                                    cost: event.nextRoute.cost,
                                    currency: event.nextRoute.currency as
                                      | Currency
                                      | undefined,
                                  };
                                  setSelectedSegment({
                                    fromPlace,
                                    toPlace,
                                    segment,
                                  });
                                }}
                                className="relative w-full hover:bg-gray-50 transition-colors cursor-pointer group"
                                title="클릭하여 이동 경로 상세 보기"
                              >
                                <div className="flex items-center pl-16 pr-4 py-2">
                                  <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs text-gray-500 -ml-6">
                                    <span className="flex-shrink-0 ">
                                      {event.nextRoute.travelMode ===
                                        "DRIVING" && "🚗"}
                                      {event.nextRoute.travelMode ===
                                        "WALKING" && "🚶"}
                                      {event.nextRoute.travelMode ===
                                        "TRANSIT" && "🚇"}
                                      {event.nextRoute.travelMode ===
                                        "BICYCLING" && "🚴"}
                                    </span>
                                    {event.nextRoute.departureTime && (
                                      <>
                                        <span className="text-purple-600 font-medium whitespace-nowrap">
                                          {event.nextRoute.departureTime}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                      </>
                                    )}
                                    <span className="whitespace-nowrap">
                                      {Math.floor(
                                        event.nextRoute.durationMin / 60,
                                      ) > 0
                                        ? `${Math.floor(event.nextRoute.durationMin / 60)}시간 ${event.nextRoute.durationMin % 60}분`
                                        : `${event.nextRoute.durationMin}분`}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="whitespace-nowrap">
                                      {event.nextRoute.distanceKm.toFixed(1)}km
                                    </span>
                                    {event.nextRoute.cost &&
                                      event.nextRoute.cost > 0 && (
                                        <>
                                          <span className="text-gray-300">
                                            •
                                          </span>
                                          <span className="text-emerald-600 font-medium whitespace-nowrap">
                                            {event.nextRoute.cost.toLocaleString()}
                                            {event.nextRoute.currency === "KRW"
                                              ? "원"
                                              : event.nextRoute.currency}
                                          </span>
                                        </>
                                      )}
                                  </div>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5 text-gray-600 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </div>
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Bottom Section - Route Optimization & Summary */}
            <div className="border-t border-gray-200 bg-white">
              <div className="p-4">
                <button
                  onClick={() => {
                    // 경로 최적화 기능은 추후 서버 API로 구현 예정
                    alert("경로 최적화 기능은 곧 구현될 예정입니다.");
                  }}
                  disabled={currentDayDetail.events.length < 2}
                  className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    currentDayDetail.events.length < 2
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-purple-500 text-white hover:bg-purple-600"
                  }`}
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  경로 최적화
                </button>
              </div>

              {/* Route Summary */}
              {currentDayDetail.events.length > 1 && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-600">총 이동 시간</span>
                    </div>
                    <div className="font-semibold text-gray-900">
                      2시간 30분
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div>
                      <span className="text-gray-600">총 거리</span>
                    </div>
                    <div className="font-semibold text-gray-900">15.3 km</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="flex-1 bg-gray-200">
            <MapView
              key={`day-${currentDayDetail.day}-events-${currentDayDetail.events.map((e) => e.id).join("-")}`}
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
              events={currentDayDetail.events}
              currentDay={currentDayDetail.day}
            />
          </div>
        </div>

        {/* Route Segment Modal for Server Mode */}
        {selectedSegment && (
          <RouteSegmentModal
            fromPlace={selectedSegment.fromPlace}
            toPlace={selectedSegment.toPlace}
            segment={selectedSegment.segment}
            defaultTravelMode="DRIVING"
            onClose={() => setSelectedSegment(null)}
            onTravelModeChange={handleServerSegmentTravelModeChange}
            onDepartureTimeChange={handleServerSegmentDepartureTimeChange}
            onCostChange={handleServerSegmentCostChange}
          />
        )}

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

  // Check if we have data to render
  // Server mode: need tripId and currentDayDetail
  // Local mode: need currentTrip
  if (tripId) {
    // Server mode: check if data is loaded
    if (!currentDayDetail) {
      return null; // Still loading
    }
  } else {
    // Local mode: need currentTrip
    if (!currentTrip) {
      return null;
    }
  }

  const handlePlaceSelect = async (place: PlaceSearchResult) => {
    if (!currentTrip) return;
    const beforePlaceCount = currentTrip.places.length;

    // 좌표를 8자리로 반올림 (DecimalField 검증 대비 + 정확도 유지)
    addPlace({
      placeId: place.placeId,
      name: place.name,
      lat: parseFloat(place.location.lat.toFixed(8)),
      lng: parseFloat(place.location.lng.toFixed(8)),
      day: selectedDay, // 현재 선택된 Day에 추가
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
          const { calculateRoute } =
            await import("../services/googleMapsService");
          const travelMode =
            (updatedTrip.routeSegments || []).find(
              (s) =>
                s.fromPlaceId === prevPlace.placeId &&
                s.toPlaceId === newPlace.placeId,
            )?.travelMode ||
            updatedTrip.travelMode ||
            "DRIVING";

          const route = await calculateRoute(
            { lat: prevPlace.lat, lng: prevPlace.lng },
            { lat: newPlace.lat, lng: newPlace.lng },
            prevPlace.placeId,
            newPlace.placeId,
            travelMode,
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
              newMinutes,
            ).padStart(2, "0")}`;

            // Update place time
            updatePlaceTime(newPlace.id, newVisitTime);

            // Update place day if it changed
            const currentPlaceDay = newPlace.day || selectedDay;
            if (newDay !== currentPlaceDay) {
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
    if (!currentTrip) return;
    optimizePlaces(result.places, {
      totalDurationMin: result.totalDuration,
      totalDistanceKm:
        result.places.length > 0 ? currentTrip.routeSummary.totalDistanceKm : 0,
    });
  };

  const handleStartDateChange = (newDate: string) => {
    updateStartDate(newDate);
    setIsEditingStartDate(false);
  };

  const handleTitleEdit = () => {
    if (!currentTrip) return;
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

  const formatStartDate = (dateString?: string | null) => {
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
  // Create a safe currentTrip reference for server mode
  const safeCurrentTrip = currentTrip || {
    title: "새 여행",
    city: "도시",
    places: [],
    routeSegments: [],
    startDate: null,
    totalDays: 1,
    dayTransitionOwnership: {},
    routeSummary: { totalDurationMin: 0, totalDistanceKm: 0 },
    travelMode: "DRIVING" as const,
    cityLocation: null,
  };

  const getMapCenter = (): { lat: number; lng: number } => {
    // Server mode: use tripSummary.startLocation or first event
    if (tripId) {
      if (tripSummary?.startLocation) {
        return tripSummary.startLocation;
      }
      if (currentDayDetail?.events[0]) {
        return currentDayDetail.events[0].location;
      }
    }

    // Local mode: use currentTrip
    // Use cityLocation if available
    if (safeCurrentTrip.cityLocation) {
      return safeCurrentTrip.cityLocation;
    }
    // Fallback to first place if places exist
    const places = (safeCurrentTrip.places || []) as any[];
    if (places.length > 0 && places[0] && typeof places[0].lat === "number") {
      return {
        lat: places[0].lat,
        lng: places[0].lng,
      };
    }
    // Default fallback
    return { lat: 37.5665, lng: 126.978 }; // Seoul coordinates
  };

  const mapCenter = getMapCenter();

  // Debug: Check currentDayDetail before rendering

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
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
                className="text-xl font-bold text-gray-900 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: "300px" }}
              />
            ) : (
              <button
                onClick={handleTitleEdit}
                className="text-xl font-bold text-gray-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors text-left flex items-center gap-2 group"
              >
                {safeCurrentTrip.title || "여행 제목"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <p className="text-sm text-gray-500 mt-1">
              {safeCurrentTrip.city || "도시"} - {safeCurrentTrip.totalDays}일
            </p>
            <div className="flex items-center gap-2 mt-1">
              {isEditingStartDate ? (
                <input
                  type="date"
                  value={safeCurrentTrip.startDate || ""}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  onBlur={() => setIsEditingStartDate(false)}
                  autoFocus
                  className="text-sm text-gray-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <button
                  onClick={() => setIsEditingStartDate(true)}
                  className="text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                >
                  {formatStartDate(safeCurrentTrip.startDate)}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              새 여행
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              홈으로
            </button>
            <button
              onClick={() => navigate("/weekly-schedule")}
              className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              시간표
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
            >
              공유하기
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Day Tabs */}
        <div className="w-44 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Days</h3>
            <p className="text-xs text-gray-500 mt-1">
              총 {safeCurrentTrip.totalDays}일
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {Array.from(
              { length: safeCurrentTrip.totalDays || 1 },
              (_, i) => i + 1,
            ).map((day: number) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  selectedDay === day
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="text-sm font-medium">Day {day}</div>
                {safeCurrentTrip.startDate && (
                  <div
                    className={`text-xs mt-0.5 ${selectedDay === day ? "text-blue-100" : "text-gray-500"}`}
                  >
                    {new Date(
                      new Date(safeCurrentTrip.startDate).getTime() +
                        (day - 1) * 24 * 60 * 60 * 1000,
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
              onClick={addDay}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
              <span className="text-sm font-medium">Day 추가</span>
            </button>
          </div>
        </div>

        {/* Middle Panel - Places */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Day {selectedDay}
            </h2>
            {safeCurrentTrip.startDate && (
              <p className="text-sm text-gray-600 mt-0.5">
                {new Date(
                  new Date(safeCurrentTrip.startDate).getTime() +
                    (selectedDay - 1) * 24 * 60 * 60 * 1000,
                ).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>
            )}

            {/* Place Search */}
            <div className="mt-3">
              <PlaceSearch
                searchCenter={mapCenter}
                onPlaceSelect={handlePlaceSelect}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {safeCurrentTrip.places.filter((p) => (p.day || 1) === selectedDay)
              .length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  아직 추가된 장소가 없습니다
                </p>
                <p className="text-xs text-gray-500">
                  위의 검색창에서 장소를 검색해보세요
                </p>
              </div>
            ) : (
              <PlaceList
                places={safeCurrentTrip.places.filter(
                  (p) => (p.day || 1) === selectedDay,
                )}
                routeSegments={safeCurrentTrip.routeSegments}
                startDate={safeCurrentTrip.startDate || undefined}
                totalDays={safeCurrentTrip.totalDays}
                collapsedDays={new Set()}
                dayTransitionOwnership={safeCurrentTrip.dayTransitionOwnership}
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
            )}
          </div>

          {/* Bottom Section - Route Optimization & Summary */}
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4">
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
                disabled={
                  safeCurrentTrip.places.filter(
                    (p) => (p.day || 1) === selectedDay,
                  ).length < 2
                }
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  safeCurrentTrip.places.filter(
                    (p) => (p.day || 1) === selectedDay,
                  ).length < 2
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-500 text-white hover:bg-purple-600"
                }`}
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                경로 최적화
              </button>
            </div>

            {/* Route Summary */}
            {safeCurrentTrip.places.filter((p) => (p.day || 1) === selectedDay)
              .length > 1 && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-600">총 이동 시간</span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {isCalculating ? (
                      <span className="text-gray-400">계산 중...</span>
                    ) : (
                      <>
                        {Math.floor(
                          safeCurrentTrip.routeSummary.totalDurationMin / 60,
                        )}
                        시간{" "}
                        {safeCurrentTrip.routeSummary.totalDurationMin % 60}분
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <div>
                    <span className="text-gray-600">총 거리</span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {isCalculating ? (
                      <span className="text-gray-400">계산 중...</span>
                    ) : (
                      <>
                        {safeCurrentTrip.routeSummary.totalDistanceKm.toFixed(
                          1,
                        )}{" "}
                        km
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 bg-gray-200">
          {(() => {
            const selectedDayPlaces = (safeCurrentTrip.places || []).filter(
              (p: any) => (p.day || 1) === selectedDay,
            );
            const mapEvents = currentDayDetail?.events;
            return (
              <MapView
                key={`${mapKey}-day-${selectedDay}`}
                center={
                  selectedDayPlaces.length > 0
                    ? {
                        lat: selectedDayPlaces[0].lat,
                        lng: selectedDayPlaces[0].lng,
                      }
                    : mapCenter
                }
                places={selectedDayPlaces}
                dayDirections={
                  dayDirections.has(selectedDay)
                    ? new Map([[selectedDay, dayDirections.get(selectedDay)!]])
                    : new Map()
                }
                dayTransitions={[]}
                dayTransitionOwnership={{}}
                onMapLoad={handleMapLoad}
                events={mapEvents}
                currentDay={selectedDay}
              />
            );
          })()}
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
          defaultTravelMode={safeCurrentTrip.travelMode}
          onClose={() => setSelectedSegment(null)}
          onTravelModeChange={handleSegmentTravelModeChange}
          onDepartureTimeChange={updateSegmentDepartureTime}
          onCostChange={handleSegmentCostChange}
        />
      )}
    </div>
  );
};
