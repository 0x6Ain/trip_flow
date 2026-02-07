import { useState } from "react";
import type { Place, RouteSegment } from "../../types/trip";

interface WeeklyScheduleViewProps {
  startDate: string | null;
  places: Place[];
  routeSegments?: RouteSegment[];
  onPlaceClick?: (place: Place) => void;
  onSegmentClick?: (fromPlace: Place, toPlace: Place, segment: RouteSegment) => void;
}

const HOURS = [
  { label: "09:00 AM", value: 9 },
  { label: "10:00 AM", value: 10 },
  { label: "11:00 AM", value: 11 },
  { label: "12:00 PM", value: 12 },
  { label: "01:00 PM", value: 13 },
  { label: "02:00 PM", value: 14 },
  { label: "03:00 PM", value: 15 },
  { label: "04:00 PM", value: 16 },
  { label: "05:00 PM", value: 17 },
  { label: "06:00 PM", value: 18 },
  { label: "07:00 PM", value: 19 },
  { label: "08:00 PM", value: 20 },
  { label: "09:00 PM", value: 21 },
  { label: "10:00 PM", value: 22 },
  { label: "11:00 PM", value: 23 },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Event colors - cycle through these for each event
const EVENT_COLORS = [
  "linear-gradient(135deg, #818CF8 0%, #6366F1 100%)", // Indigo
  "linear-gradient(135deg, #34D399 0%, #10B981 100%)", // Green
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", // Orange
  "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)", // Pink
  "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)", // Purple
  "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", // Red
  "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)", // Cyan
];

export const WeeklyScheduleView = ({ startDate, places, routeSegments = [], onPlaceClick, onSegmentClick }: WeeklyScheduleViewProps) => {
  const [_selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Get date for each day column
  const getDateForDay = (dayIndex: number) => {
    if (!startDate) return "";
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Get day of week name in Korean
  const getDayOfWeekName = (dayIndex: number) => {
    if (!startDate) return DAYS_OF_WEEK[dayIndex];
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  // Group places by column index (0-6 represents day 1-7 of trip)
  const placesByColumn: Record<number, Place[]> = {};
  places.forEach((place) => {
    if (!place.day) return;
    // place.day is 1-based, convert to 0-based column index
    const columnIndex = place.day - 1;
    // Only show first 7 days
    if (columnIndex >= 0 && columnIndex < 7) {
      if (!placesByColumn[columnIndex]) {
        placesByColumn[columnIndex] = [];
      }
      placesByColumn[columnIndex].push(place);
    }
  });

  // Sort places within each column by visitTime
  Object.keys(placesByColumn).forEach((colKey) => {
    const col = parseInt(colKey);
    placesByColumn[col].sort((a, b) => {
      if (!a.visitTime) return 1;
      if (!b.visitTime) return -1;
      return a.visitTime.localeCompare(b.visitTime);
    });
  });

  // Get route segment between two places
  const getRouteSegment = (fromPlace: Place, toPlace: Place) => {
    return routeSegments.find((seg) => seg.fromPlaceId === fromPlace.id && seg.toPlaceId === toPlace.id);
  };

  // Calculate position and height for a place
  const getPlaceStyle = (place: Place) => {
    if (!place.visitTime) return null;

    const [hours, minutes] = place.visitTime.split(":").map(Number);
    const durationMinutes = place.durationMin || 90; // Default 1.5 hours

    // 9AM starts at 0, each hour is 80px
    const startHour = 9;
    const pixelsPerHour = 80;
    const top = (((hours - startHour) * 60 + minutes) / 60) * pixelsPerHour;
    const height = (durationMinutes / 60) * pixelsPerHour;

    return {
      top,
      height,
    };
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    onPlaceClick?.(place);
  };

  const handleSegmentClick = (fromPlace: Place, toPlace: Place, segment: RouteSegment) => {
    onSegmentClick?.(fromPlace, toPlace, segment);
  };

  // Show message if no places with visit time
  const hasPlacesWithTime = places.some((p) => p.visitTime);

  return (
    <div className="w-full bg-[#F9FAFB] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-20 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#111827] font-[Inter]">여행 스케줄</h1>
        {startDate && (
          <div className="h-10 bg-[#F3F4F6] rounded-lg px-3 py-2 flex items-center justify-center">
            <span className="text-sm font-medium text-[#374151] font-[Inter]">
              {new Date(startDate).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* No events message */}
      {!hasPlacesWithTime && (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-2">방문 시간이 설정된 장소가 없습니다</p>
            <p className="text-sm text-gray-500 mb-4">여행 계획 페이지에서 각 장소의 방문 시간을 설정해주세요</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>총 장소: {places.length}개</p>
              <p>시간 설정된 장소: {places.filter((p) => p.visitTime).length}개</p>
              {places.length > 0 && (
                <p className="mt-2">{places.map((p) => `${p.name}${p.visitTime ? ` (${p.visitTime})` : " (시간 없음)"}`).join(", ")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Area */}
      {hasPlacesWithTime && (
        <div className="flex-1 bg-white border border-[#E5E7EB] flex overflow-auto">
          {/* Time Column */}
          <div className="w-[120px] bg-[#FAFAFA] border-r border-[#E5E7EB] flex flex-col">
            {/* Time Header */}
            <div className="h-[60px] border-b border-[#E5E7EB] flex items-center justify-center">
              <span className="text-sm font-semibold text-[#6B7280] font-[Inter]">Time</span>
            </div>

            {/* Time Slots */}
            {HOURS.map((hour) => (
              <div key={hour.value} className="h-20 border-b border-[#E5E7EB] flex items-center justify-center">
                <span className="text-xs font-medium text-[#9CA3AF] font-[Inter]">{hour.label}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          <div className="flex-1 flex">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const dayPlaces = placesByColumn[dayIndex] || [];

              return (
                <div key={day} className="flex-1 border-r border-[#E5E7EB] last:border-r-0 flex flex-col relative">
                  {/* Day Header */}
                  <div className="h-[60px] border-b border-[#E5E7EB] flex flex-col items-center justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#6B7280] font-[Inter]">Day {dayIndex + 1}</span>
                      {dayPlaces.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{dayPlaces.length}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {startDate && (
                        <>
                          <span className="text-xs text-[#9CA3AF] font-[Inter]">{getDayOfWeekName(dayIndex)}</span>
                          <span className="text-xs text-[#9CA3AF] font-[Inter]">{getDateForDay(dayIndex)}</span>
                        </>
                      )}
                      {!startDate && <span className="text-xs text-[#9CA3AF] font-[Inter]">{day}</span>}
                    </div>
                  </div>

                  {/* Day Grid Cells */}
                  <div className="flex-1 relative">
                    {/* Grid Lines */}
                    {HOURS.map((hour) => (
                      <div key={hour.value} className="h-20 border-b border-[#E5E7EB]" />
                    ))}

                    {/* Debug Info */}
                    {dayPlaces.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-400">Day {dayIndex + 1} - 이벤트 없음</span>
                      </div>
                    )}

                    {/* Events Layer */}
                    <div className="absolute inset-0 p-1">
                      {dayPlaces.map((place, idx) => {
                        const style = getPlaceStyle(place);
                        if (!style) {
                          return null;
                        }

                        const nextPlace = dayPlaces[idx + 1];
                        const segment = nextPlace ? getRouteSegment(place, nextPlace) : null;

                        // Calculate connection if there's a next place
                        let connectionElement = null;
                        if (segment && nextPlace && nextPlace.visitTime) {
                          const nextStyle = getPlaceStyle(nextPlace);
                          if (nextStyle) {
                            const connectionTop = style.top + style.height;
                            const connectionHeight = nextStyle.top - connectionTop;

                            if (connectionHeight > 0) {
                              connectionElement = (
                                <div
                                  onClick={() => handleSegmentClick(place, nextPlace, segment)}
                                  className="absolute left-1/2 -translate-x-1/2 w-[60px] flex flex-col items-center justify-between py-1 cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    top: `${connectionTop}px`,
                                    height: `${connectionHeight}px`,
                                  }}
                                >
                                  <div className="w-0.5 flex-1 bg-[#F97316] min-h-[8px]" />
                                  <span className="text-xs font-semibold text-[#F97316] font-[Inter] whitespace-nowrap bg-white px-1 rounded">
                                    🚗 {segment.durationMin}분
                                  </span>
                                  <div className="w-0.5 flex-1 bg-[#F97316] min-h-[8px]" />
                                  <span className="text-sm font-semibold text-[#F97316] -mt-1">▼</span>
                                </div>
                              );
                            }
                          }
                        }

                        // Calculate end time
                        const [h, m] = place.visitTime!.split(":").map(Number);
                        const endMinutes = h * 60 + m + (place.durationMin || 90);
                        const endH = Math.floor(endMinutes / 60);
                        const endM = endMinutes % 60;
                        const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

                        return (
                          <div key={place.id}>
                            {/* Event Block */}
                            <div
                              onClick={() => handlePlaceClick(place)}
                              className="absolute left-1 right-1 rounded-lg p-2 shadow-[0_4px_12px_rgba(0,0,0,0.13)] cursor-pointer hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-shadow flex flex-col gap-1"
                              style={{
                                top: `${style.top}px`,
                                height: `${style.height}px`,
                                background: EVENT_COLORS[idx % EVENT_COLORS.length],
                              }}
                            >
                              <span className="text-sm font-semibold text-white font-[Inter] truncate">{place.name}</span>
                              <span className="text-xs text-white font-[Inter]">
                                {place.visitTime} - {endTime}
                              </span>
                            </div>

                            {/* Connection Line */}
                            {connectionElement}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
