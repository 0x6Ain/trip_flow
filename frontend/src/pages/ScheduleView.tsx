import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { PlaceDetailModal } from "../components/PlaceDetailModal/PlaceDetailModal";
import { RouteSegmentModal } from "../components/RouteSegmentModal/RouteSegmentModal";
import type { Place, RouteSegment } from "../types/trip";

// Day별 색상 팔레트
const DAY_COLORS = [
  { bg: "bg-blue-500", hover: "hover:bg-blue-600", light: "bg-blue-100" },
  { bg: "bg-green-500", hover: "hover:bg-green-600", light: "bg-green-100" },
  { bg: "bg-red-500", hover: "hover:bg-red-600", light: "bg-red-100" },
  { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", light: "bg-yellow-100" },
  { bg: "bg-purple-500", hover: "hover:bg-purple-600", light: "bg-purple-100" },
  { bg: "bg-pink-500", hover: "hover:bg-pink-600", light: "bg-pink-100" },
  { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", light: "bg-indigo-100" },
];

const BASE_HOUR_HEIGHT = 40; // 기본 시간 셀의 높이 (px)
const DAY_COLUMN_WIDTH = 200; // 각 날짜 컬럼의 너비 (px)
const TIME_COLUMN_WIDTH = 70; // 시간 컬럼의 너비 (px)
const MIN_ZOOM = 0.5; // 최소 줌 레벨 (50%)
const MAX_ZOOM = 3; // 최대 줌 레벨 (300%)
const ZOOM_STEP = 0.25; // 줌 단계

export const ScheduleView = () => {
  const navigate = useNavigate();
  const { currentTrip, updateSegmentTravelMode, updateSegmentDepartureTime } = useTripStore();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{ fromPlace: Place; toPlace: Place; segment: RouteSegment } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 줌 레벨 상태 (1 = 100%)
  
  // 현재 줌 레벨에 따른 시간 셀 높이 계산
  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoomLevel;

  if (!currentTrip) {
    return null;
  }

  // Generate hours array (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group places by day
  const placesByDay: Record<number, Place[]> = {};
  currentTrip.places.forEach((place) => {
    const day = place.day || 1;
    if (!placesByDay[day]) {
      placesByDay[day] = [];
    }
    placesByDay[day].push(place);
  });

  // Sort places within each day by visitTime
  Object.keys(placesByDay).forEach((dayKey) => {
    const day = parseInt(dayKey);
    placesByDay[day].sort((a, b) => {
      if (!a.visitTime) return 1;
      if (!b.visitTime) return -1;
      return a.visitTime.localeCompare(b.visitTime);
    });
  });

  const formatHour = (hour: number) => {
    return `${String(hour).padStart(2, '0')}:00`;
  };

  const getDateForDay = (day: number) => {
    if (!currentTrip.startDate) return `Day ${day}`;
    const startDate = new Date(currentTrip.startDate);
    startDate.setDate(startDate.getDate() + (day - 1));
    return `${startDate.getMonth() + 1}/${startDate.getDate()}`;
  };

  const getDayOfWeek = (day: number) => {
    if (!currentTrip.startDate) return '';
    const startDate = new Date(currentTrip.startDate);
    startDate.setDate(startDate.getDate() + (day - 1));
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[startDate.getDay()];
  };

  const getDayColor = (day: number) => {
    return DAY_COLORS[(day - 1) % DAY_COLORS.length];
  };

  // 시간 겹침 감지 및 레인 할당 함수
  const assignLanesToPlaces = (places: Place[]) => {
    const placesWithLanes: Array<Place & { lane: number; totalLanes: number }> = [];
    
    places.forEach((place) => {
      if (!place.visitTime) return;
      
      const [hours, minutes] = place.visitTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const durationMinutes = place.durationMin || 60;
      const endMinutes = startMinutes + durationMinutes;
      
      // 이미 할당된 장소들 중 현재 장소와 겹치는 것들 찾기
      const overlappingPlaces = placesWithLanes.filter((p) => {
        if (!p.visitTime) return false;
        const [pH, pM] = p.visitTime.split(':').map(Number);
        const pStart = pH * 60 + pM;
        const pEnd = pStart + (p.durationMin || 60);
        
        // 시간 겹침 체크
        return startMinutes < pEnd && endMinutes > pStart;
      });
      
      // 사용 가능한 레인 찾기
      const usedLanes = overlappingPlaces.map(p => p.lane);
      let lane = 0;
      while (usedLanes.includes(lane)) {
        lane++;
      }
      
      // 이 그룹의 총 레인 수 계산
      const totalLanes = Math.max(lane + 1, ...overlappingPlaces.map(p => p.totalLanes));
      
      // 겹치는 모든 장소의 totalLanes 업데이트
      overlappingPlaces.forEach(p => {
        p.totalLanes = totalLanes;
      });
      
      placesWithLanes.push({ ...place, lane, totalLanes });
    });
    
    return placesWithLanes;
  };

  // Calculate block position and height for a place
  const getPlaceBlockStyle = (place: Place & { lane: number; totalLanes: number }) => {
    if (!place.visitTime) return null;

    const [hours, minutes] = place.visitTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const durationMinutes = place.durationMin || 60; // Default 1 hour if not set

    // Calculate position based on HOUR_HEIGHT
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;
    
    // 최소 높이를 줌 레벨에 비례하도록 설정 (15분에 해당하는 높이)
    const minHeight = HOUR_HEIGHT * 0.25;

    // 레인 너비 계산 (겹치는 경우 너비를 나눔)
    const laneWidth = 100 / place.totalLanes;
    const leftOffset = place.lane * laneWidth;

    return {
      top: `${top}px`,
      height: `${Math.max(height, minHeight)}px`,
      left: `${leftOffset}%`,
      width: `${laneWidth}%`,
    };
  };

  // Get route segment between two places
  const getRouteSegment = (fromPlace: Place, toPlace: Place) => {
    return currentTrip.routeSegments?.find(
      (seg) => seg.fromPlaceId === fromPlace.placeId && seg.toPlaceId === toPlace.placeId
    );
  };

  const handleSegmentTravelModeChange = async (fromPlaceId: string, toPlaceId: string, mode: string) => {
    updateSegmentTravelMode(fromPlaceId, toPlaceId, mode as any);
    // Recalculate route if needed
    // You might want to add route recalculation logic here
  };

  // 줌 인/아웃 핸들러
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/plan')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentTrip.title}</h1>
              <p className="text-sm text-gray-600">시간표 뷰</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="축소"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button
                onClick={handleResetZoom}
                className="min-w-[60px] px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="기본 크기로 리셋"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="확대"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              인쇄
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header Row */}
              <div className="flex border-b-2 border-gray-300 bg-gray-50" style={{ minWidth: `${TIME_COLUMN_WIDTH + currentTrip.totalDays * DAY_COLUMN_WIDTH}px` }}>
                <div style={{ width: `${TIME_COLUMN_WIDTH}px` }} className="flex-shrink-0 p-2 font-semibold text-gray-700 border-r border-gray-300">
                  시간
                </div>
                {Array.from({ length: currentTrip.totalDays }, (_, i) => i + 1).map((day) => {
                  const dayColor = getDayColor(day);
                  return (
                    <div
                      key={day}
                      style={{ width: `${DAY_COLUMN_WIDTH}px` }}
                      className={`flex-shrink-0 p-2 text-center border-r border-gray-300 last:border-r-0 ${dayColor.light}`}
                    >
                      <div className="font-bold text-base text-gray-900">{getDateForDay(day)}</div>
                      <div className="text-xs text-gray-600">{getDayOfWeek(day)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Time Rows */}
              <div className="relative" style={{ minWidth: `${TIME_COLUMN_WIDTH + currentTrip.totalDays * DAY_COLUMN_WIDTH}px` }}>
                {hours.map((hour) => (
                  <div key={hour} className="flex border-b border-gray-200">
                    {/* Hour label */}
                    <div 
                      style={{ width: `${TIME_COLUMN_WIDTH}px`, height: `${HOUR_HEIGHT}px` }} 
                      className="flex-shrink-0 py-1 px-2 text-xs text-gray-600 border-r border-gray-300 bg-gray-50 flex items-center"
                    >
                      {formatHour(hour)}
                    </div>

                    {/* Day columns */}
                    {Array.from({ length: currentTrip.totalDays }, (_, i) => i + 1).map((day) => (
                      <div
                        key={`${day}-${hour}`}
                        style={{ width: `${DAY_COLUMN_WIDTH}px`, height: `${HOUR_HEIGHT}px` }}
                        className="flex-shrink-0 border-r border-gray-300 last:border-r-0 relative bg-white hover:bg-gray-50 transition-colors"
                      >
                        {/* Place blocks will be positioned absolutely within their day column */}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Place blocks - positioned absolutely */}
                {Array.from({ length: currentTrip.totalDays }, (_, i) => i + 1).map((day) => {
                  const dayPlaces = placesByDay[day] || [];
                  const dayColor = getDayColor(day);
                  
                  // 레인 할당
                  const placesWithLanes = assignLanesToPlaces(dayPlaces);
                  
                  return (
                    <div
                      key={`places-${day}`}
                      className="absolute top-0 pointer-events-none"
                      style={{
                        left: `${TIME_COLUMN_WIDTH + (day - 1) * DAY_COLUMN_WIDTH}px`,
                        width: `${DAY_COLUMN_WIDTH}px`,
                      }}
                    >
                      {placesWithLanes.map((place, idx) => {
                        const style = getPlaceBlockStyle(place);
                        if (!style) return null;

                        const blockHeight = parseFloat(style.height);
                        const blockWidth = style.width ? parseFloat(style.width.replace('%', '')) : 100;
                        
                        // 다음 장소 찾기 (원본 배열에서)
                        const originalIdx = dayPlaces.findIndex(p => p.id === place.id);
                        const nextPlace = originalIdx >= 0 && originalIdx < dayPlaces.length - 1 ? dayPlaces[originalIdx + 1] : null;
                        const segment = nextPlace ? getRouteSegment(place, nextPlace) : null;
                        const travelModeIcon = segment?.travelMode === "WALKING" ? "🚶" :
                                              segment?.travelMode === "TRANSIT" ? "🚇" :
                                              segment?.travelMode === "BICYCLING" ? "🚴" : "🚗";

                        // 블록 높이에 따라 표시할 내용 결정
                        const showFullContent = blockHeight >= HOUR_HEIGHT * 0.75; // 45분 이상
                        const showName = blockHeight >= HOUR_HEIGHT * 0.35; // 약 20분 이상
                        const padding = blockHeight < HOUR_HEIGHT * 0.5 ? 'p-0.5' : 'p-1.5';
                        
                        // 블록 너비에 따라 여백 조정
                        const horizontalMargin = blockWidth < 50 ? 'mx-0.5' : 'mx-1';

                        return (
                          <div key={place.id}>
                            {/* Place block */}
                            <div
                              onClick={() => setSelectedPlace(place)}
                              className={`absolute ${horizontalMargin} ${dayColor.bg} text-white rounded-lg ${padding} shadow-md pointer-events-auto cursor-pointer ${dayColor.hover} transition-colors overflow-hidden flex flex-col justify-center`}
                              style={style}
                            >
                              {showFullContent ? (
                                // 충분히 큰 블록: 시간, 이름, 소요시간 모두 표시
                                <>
                                  <div className="text-[10px] font-semibold truncate">{place.visitTime}</div>
                                  <div className="text-xs font-medium truncate leading-tight">{place.name}</div>
                                  {place.durationMin && blockHeight > HOUR_HEIGHT && (
                                    <div className="text-[10px] opacity-90">{place.durationMin}분</div>
                                  )}
                                </>
                              ) : showName ? (
                                // 중간 크기 블록: 시간과 이름만
                                <>
                                  <div className="text-[9px] font-semibold truncate leading-tight">{place.visitTime}</div>
                                  <div className="text-[10px] font-medium truncate leading-tight">{place.name}</div>
                                </>
                              ) : (
                                // 아주 작은 블록: 이름만 또는 시간만
                                <div className="text-[9px] font-medium truncate leading-tight">
                                  {place.name}
                                </div>
                              )}
                            </div>

                            {/* Travel segment - 레인이 0인 경우에만 표시 (중복 방지) */}
                            {segment && nextPlace && nextPlace.visitTime && place.lane === 0 && (
                              <div
                                onClick={() => setSelectedSegment({ fromPlace: place, toPlace: nextPlace, segment })}
                                className="absolute left-1 right-1 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  top: `${parseFloat(style.top) + parseFloat(style.height)}px`,
                                  height: `${(segment.durationMin / 60) * HOUR_HEIGHT}px`,
                                }}
                              >
                                <div className="h-full border-l-2 border-dashed border-gray-400 ml-3 relative">
                                  {/* 이동 구간이 충분히 클 때만 정보 표시 */}
                                  {(segment.durationMin / 60) * HOUR_HEIGHT >= 15 && (
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-yellow-100 hover:bg-yellow-200 px-1.5 py-0.5 rounded text-[10px] text-gray-700 whitespace-nowrap shadow-sm border border-yellow-200">
                                      {travelModeIcon} {segment.durationMin}분
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
          defaultTravelMode={currentTrip.travelMode}
          onClose={() => setSelectedSegment(null)}
          onTravelModeChange={handleSegmentTravelModeChange}
          onDepartureTimeChange={updateSegmentDepartureTime}
        />
      )}
    </div>
  );
};
