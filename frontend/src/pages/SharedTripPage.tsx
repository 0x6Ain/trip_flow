import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTripByShareId,
  getDayDetailByShareId,
  joinTripByShareId,
  type TripSummary,
  type DayDetail,
} from "../services/api/tripApi";
import { MapView } from "../components/Map/MapView";
import { useAuthStore } from "../stores/authStore";
import type { Place, RouteSegment, Currency } from "../types/trip";

export const SharedTripPage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [currentDayDetail, setCurrentDayDetail] = useState<DayDetail | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<{
    fromPlace: Place;
    toPlace: Place;
    segment: RouteSegment;
  } | null>(null);

  // Load trip summary
  useEffect(() => {
    if (!shareId) {
      navigate("/");
      return;
    }

    getTripByShareId(shareId)
      .then((loadedTrip) => {
        setTripSummary(loadedTrip);
      })
      .catch((err: any) => {
        console.error("Failed to load shared trip:", err);
        setError("여행을 불러올 수 없습니다.");
        setIsLoading(false);
      });
  }, [shareId, navigate]);

  // Load day detail when tripSummary or selectedDay changes
  useEffect(() => {
    if (!shareId || !tripSummary) return;

    setIsLoading(true);
    getDayDetailByShareId(shareId, selectedDay)
      .then((dayDetail) => {
        setCurrentDayDetail(dayDetail);
      })
      .catch((err: any) => {
        console.error("Failed to load day detail:", err);
        setError("일정을 불러올 수 없습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [shareId, tripSummary, selectedDay]);

  // Check Google Maps API
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof google !== "undefined" && google.maps) {
        setIsGoogleMapsLoaded(true);
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
  }, []);

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
  };

  const handleLoginRedirect = () => {
    navigate("/login", { state: { from: `/share/${shareId}` } });
  };

  const handleJoin = async () => {
    if (!shareId || !tripSummary) return;

    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    try {
      const result = await joinTripByShareId(shareId);
      
      if (result.isNewMember) {
        alert(`${tripSummary.title} 여행에 참여했습니다! (역할: ${result.role})`);
      } else {
        alert(`이미 이 여행의 멤버입니다. (역할: ${result.role})`);
      }
      
      // 여행 계획 페이지로 이동
      navigate(`/plan/${result.tripId}`);
    } catch (error: any) {
      console.error("Failed to join trip:", error);
      alert(error.response?.data?.error || "여행 참여에 실패했습니다.");
    }
  };

  if (isLoading && !currentDayDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  if (error || !tripSummary || !currentDayDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">
            {error || "여행을 불러올 수 없습니다."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 px-5">
              {tripSummary.title}
            </h1>
            <div className="flex items-center gap-3 px-5 mt-1">
              {tripSummary.startDate && (
                <p className="text-sm text-gray-600">
                  {new Date(tripSummary.startDate).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              <p className="text-sm text-gray-700">{tripSummary.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5">
            {!isAuthenticated && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                로그인하면 이 여행을 복사할 수 있습니다
              </div>
            )}
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              내 여행으로 복사
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              홈으로
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
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                className={`w-full rounded-lg transition-colors text-left px-3 py-2.5 ${
                  selectedDay === day
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
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
            ))}
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
              </div>
            ) : (
              <div className="py-2">
                {currentDayDetail.events.map((event, idx) => (
                  <div key={event.id}>
                    {/* Event Item (Read-only) */}
                    <div className="px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 border-transparent">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {event.name}
                          </h3>
                          {event.time && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {event.time}
                            </p>
                          )}
                          {event.memo && (
                            <p className="text-xs text-gray-600 mt-1">
                              {event.memo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Route segment (Read-only) */}
                    {idx < currentDayDetail.events.length - 1 &&
                      event.nextRoute && (
                        <button
                          onClick={() => {
                            if (!event.nextRoute) return;

                            const nextEvent = currentDayDetail.events[idx + 1];
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
                              departureTime: event.nextRoute.departureTime,
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
                                {event.nextRoute.travelMode === "DRIVING" &&
                                  "🚗"}
                                {event.nextRoute.travelMode === "WALKING" &&
                                  "🚶"}
                                {event.nextRoute.travelMode === "TRANSIT" &&
                                  "🚇"}
                                {event.nextRoute.travelMode === "BICYCLING" &&
                                  "🚴"}
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
                                {Math.floor(event.nextRoute.durationMin / 60) >
                                0
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
                                    <span className="text-gray-300">•</span>
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
            )}
          </div>

          {/* Bottom Section - Route Summary */}
          {currentDayDetail.events.length > 1 && (
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-600">총 이동 거리</span>
                  <p className="text-lg font-bold text-gray-900">
                    {currentDayDetail.events
                      .reduce(
                        (sum, event) =>
                          sum + (event.nextRoute?.distanceKm || 0),
                        0,
                      )
                      .toFixed(1)}
                    km
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">총 이동 시간</span>
                  <p className="text-lg font-bold text-gray-900">
                    {Math.floor(
                      currentDayDetail.events.reduce(
                        (sum, event) =>
                          sum + (event.nextRoute?.durationMin || 0),
                        0,
                      ) / 60,
                    )}
                    시간{" "}
                    {currentDayDetail.events.reduce(
                      (sum, event) =>
                        sum + (event.nextRoute?.durationMin || 0),
                      0,
                    ) % 60}
                    분
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative bg-gray-100">
          {isGoogleMapsLoaded ? (
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
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">지도를 불러오는 중...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Route Segment Modal (Read-only) */}
      {selectedSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">이동 경로</h3>
              <button
                onClick={() => setSelectedSegment(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">출발</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSegment.fromPlace.name}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
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
                <div className="flex-1">
                  <p className="text-sm text-gray-500">도착</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSegment.toPlace.name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">이동 수단</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSegment.segment.travelMode === "DRIVING" &&
                      "🚗 자동차"}
                    {selectedSegment.segment.travelMode === "WALKING" &&
                      "🚶 도보"}
                    {selectedSegment.segment.travelMode === "TRANSIT" &&
                      "🚇 대중교통"}
                    {selectedSegment.segment.travelMode === "BICYCLING" &&
                      "🚴 자전거"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">소요 시간</p>
                  <p className="font-semibold text-gray-900">
                    {Math.floor(selectedSegment.segment.durationMin / 60) > 0
                      ? `${Math.floor(selectedSegment.segment.durationMin / 60)}시간 ${selectedSegment.segment.durationMin % 60}분`
                      : `${selectedSegment.segment.durationMin}분`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">거리</p>
                  <p className="font-semibold text-gray-900">
                    {selectedSegment.segment.distanceKm.toFixed(1)}km
                  </p>
                </div>
                {selectedSegment.segment.departureTime && (
                  <div>
                    <p className="text-sm text-gray-600">출발 시간</p>
                    <p className="font-semibold text-gray-900">
                      {selectedSegment.segment.departureTime}
                    </p>
                  </div>
                )}
                {selectedSegment.segment.cost &&
                  selectedSegment.segment.cost > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">교통비</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSegment.segment.cost.toLocaleString()}
                        {selectedSegment.segment.currency === "KRW"
                          ? "원"
                          : selectedSegment.segment.currency}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              로그인이 필요합니다
            </h3>
            <p className="text-gray-600 mb-6">
              여행을 복사하려면 로그인이 필요합니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleLoginRedirect}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
