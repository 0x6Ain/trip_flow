import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Place, RouteSegment, Currency } from "../../types/trip";
import { SortablePlace } from "./SortablePlace";
import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";

interface PlaceListProps {
  places: Place[];
  routeSegments?: RouteSegment[];
  startDate?: string;
  totalDays?: number;
  collapsedDays?: Set<number>;
  dayTransitionOwnership?: Record<string, number>;
  onReorder: (places: Place[]) => void;
  onRemove: (placeId: string) => void;
  onAddDay?: () => void;
  onRemoveDay?: (day: number) => void;
  onDayChange?: (placeId: string, day: number) => void;
  onToggleDay?: (day: number) => void;
  onToggleDayTransition?: (fromDay: number, toDay: number) => void;
  onPlaceClick?: (place: Place) => void;
  onTransitionClick?: (
    fromDay: number,
    toDay: number,
    segment: RouteSegment,
  ) => void;
  onSegmentClick?: (
    fromPlace: Place,
    toPlace: Place,
    segment: RouteSegment,
  ) => void;
  onTimeUpdate?: (placeId: string, visitTime: string) => void;
  onCostUpdate?: (placeId: string, cost: number, currency: Currency) => void;
  onMemoUpdate?: (placeId: string, memo: string) => void;
}

// Day별 색상 팔레트
const DAY_COLORS = [
  {
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-700",
    marker: "#4285F4",
  },
  {
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-700",
    marker: "#34A853",
  },
  {
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-700",
    marker: "#EA4335",
  },
  {
    bg: "bg-yellow-100",
    border: "border-yellow-300",
    text: "text-yellow-700",
    marker: "#FBBC04",
  },
  {
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-700",
    marker: "#A142F4",
  },
  {
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-700",
    marker: "#FF6D00",
  },
  {
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-700",
    marker: "#5E35B1",
  },
];

export const getDayColor = (day: number) => {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
};

// Droppable Day Component
const DroppableDay = ({
  day,
  children,
}: {
  day: number;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-content-${day}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[100px] transition-colors ${
        isOver ? "bg-blue-50 rounded-lg" : ""
      }`}
    >
      {children}
    </div>
  );
};

// Droppable Day Header Component
const DroppableDayHeader = ({
  day,
  dayColor,
  isCollapsed,
  formatDayDate,
  startDate,
  dayPlacesLength,
  totalDays,
  onToggleDay,
  onRemoveDay,
}: {
  day: number;
  dayColor: any;
  isCollapsed: boolean;
  formatDayDate: (day: number) => string;
  startDate?: string;
  dayPlacesLength: number;
  totalDays?: number;
  onToggleDay?: (day: number) => void;
  onRemoveDay?: (day: number) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`sticky top-0 ${dayColor.bg} px-3 py-2 rounded-lg border-2 ${
        dayColor.border
      } shadow-sm cursor-pointer hover:shadow-md transition-all ${
        isOver ? "ring-4 ring-blue-300 ring-opacity-50" : ""
      }`}
      onClick={() => onToggleDay?.(day)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Collapse/Expand Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${dayColor.text} transition-transform ${
              isCollapsed ? "-rotate-90" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className={`font-semibold ${dayColor.text}`}>
            Day {day}
            {startDate && (
              <span className="ml-2 text-sm font-normal opacity-80">
                {formatDayDate(day)}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${dayColor.text} opacity-70`}>
            {dayPlacesLength}개 장소
          </span>
          {totalDays && totalDays > 1 && onRemoveDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    `Day ${day}을(를) 삭제하시겠습니까?\n이 날의 모든 장소(${dayPlacesLength}개)가 함께 삭제됩니다.`,
                  )
                ) {
                  onRemoveDay(day);
                }
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
              title="Day 삭제"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Draggable Day Transition Component
const DraggableDayTransition = ({
  fromDay,
  toDay,
  segment,
  dayColor,
  formatDuration,
  onTransitionClick,
}: {
  fromDay: number;
  toDay: number;
  segment: RouteSegment;
  dayColor: any;
  formatDuration: (min: number) => string;
  onTransitionClick?: (
    fromDay: number,
    toDay: number,
    segment: RouteSegment,
  ) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `transition-${fromDay}-${toDay}`,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const currentOwner = fromDay;
  const targetOwner = toDay;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when dragging
    if (!isDragging) {
      onTransitionClick?.(fromDay, toDay, segment);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2 ${dayColor.bg} border-2 border-dashed ${dayColor.border} rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${dayColor.text}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
              clipRule="evenodd"
            />
          </svg>
          <span className={`font-medium ${dayColor.text}`}>
            {currentOwner < targetOwner
              ? `Day ${targetOwner}로 이동:`
              : `Day ${currentOwner}에서 이동:`}
          </span>
          <span className={`font-semibold ${dayColor.text}`}>
            {formatDuration(segment.durationMin)}
          </span>
          <span className={`${dayColor.text} opacity-50`}>•</span>
          <span className={dayColor.text}>
            {segment.distanceKm.toFixed(1)}km
          </span>
        </div>
        <div
          className={`text-xs ${dayColor.text} opacity-70 flex items-center gap-1`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
          드래그 또는 클릭
        </div>
      </div>
    </div>
  );
};

export const PlaceList = ({
  places,
  routeSegments = [],
  startDate,
  totalDays = 1,
  collapsedDays = new Set(),
  dayTransitionOwnership = {},
  onReorder,
  onRemove,
  onAddDay,
  onRemoveDay,
  onDayChange,
  onToggleDay,
  onToggleDayTransition,
  onPlaceClick,
  onTransitionClick,
  onSegmentClick,
  onTimeUpdate,
  onCostUpdate,
  onMemoUpdate,
}: PlaceListProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dragging a day transition
    if (active.id.toString().startsWith("transition-")) {
      const [_, fromDayStr, toDayStr] = active.id.toString().split("-");
      const fromDay = parseInt(fromDayStr);
      const toDay = parseInt(toDayStr);

      // Check if dropped on a day container (header or content)
      const overIdStr = over.id.toString();
      if (
        overIdStr.startsWith("day-") ||
        overIdStr.startsWith("day-content-")
      ) {
        const targetDay = parseInt(
          overIdStr.replace("day-", "").replace("content-", ""),
        );
        // Only allow dropping on fromDay or toDay
        if (
          (targetDay === fromDay || targetDay === toDay) &&
          onToggleDayTransition
        ) {
          onToggleDayTransition(fromDay, toDay);
        }
      }
      return;
    }

    const activePlace = places.find((p) => p.id === active.id);
    if (!activePlace) return;

    // Check if dropped on a day container (header or content)
    const overIdStr = over.id.toString();
    if (overIdStr.startsWith("day-") || overIdStr.startsWith("day-content-")) {
      const targetDay = parseInt(
        overIdStr.replace("day-", "").replace("content-", ""),
      );
      if (onDayChange && activePlace.day !== targetDay) {
        onDayChange(activePlace.id, targetDay);
      }
      return;
    }

    // Handle reordering within the same day or across days
    if (active.id !== over.id) {
      const oldIndex = places.findIndex((p) => p.id === active.id);
      const newIndex = places.findIndex((p) => p.id === over.id);

      const reorderedPlaces = arrayMove(places, oldIndex, newIndex);
      const targetPlace = places[newIndex];

      // Update order values and day
      const updatedPlaces = reorderedPlaces.map((place, index) => {
        const newPlace = { ...place, order: index + 1.0 };

        // Update day if moving to a different place's day
        if (place.id === active.id && targetPlace && targetPlace.day) {
          newPlace.day = targetPlace.day;
        }

        return newPlace;
      });

      onReorder(updatedPlaces);
    }
  };

  // Group places by day
  const placesByDay = places.reduce(
    (acc, place) => {
      const day = place.day || 1;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(place);
      return acc;
    },
    {} as Record<number, Place[]>,
  );

  // Create array of all days (including empty ones)
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Find route segment between two places
  const getRouteSegment = (
    fromPlaceId: string,
    toPlaceId: string,
  ): RouteSegment | undefined => {
    const segment = routeSegments.find(
      (seg) => seg.fromPlaceId === fromPlaceId && seg.toPlaceId === toPlaceId,
    );
    return segment;
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  // Format date for day header
  const formatDayDate = (day: number): string => {
    if (!startDate) return "";
    const date = new Date(startDate);
    date.setDate(date.getDate() + (day - 1));
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  if (places.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">아직 추가된 장소가 없습니다</p>
        <p className="text-sm">위에서 장소를 검색하여 추가해보세요</p>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={places.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {days.map((day, dayIndex) => {
            const dayPlaces = placesByDay[day] || [];
            const isLastDay = dayIndex === days.length - 1;
            const isCollapsed = collapsedDays.has(day);
            const dayColor = getDayColor(day);

            // Get transition info from previous day
            const prevDay = day - 1;
            const prevDayPlaces = placesByDay[prevDay] || [];
            const nextDay = day + 1;
            const nextDayPlaces = placesByDay[nextDay] || [];

            // Transition from previous day to this day
            let transitionFromPrev: RouteSegment | undefined;
            let transitionFromPrevOwner = nextDay; // Default: owned by destination day (this day)
            if (prevDayPlaces.length > 0 && dayPlaces.length > 0) {
              const lastPlaceOfPrevDay =
                prevDayPlaces[prevDayPlaces.length - 1];
              const firstPlaceOfThisDay = dayPlaces[0];
              transitionFromPrev = getRouteSegment(
                lastPlaceOfPrevDay.placeId,
                firstPlaceOfThisDay.placeId,
              );
              const ownershipKey = `${prevDay}-${day}`;
              transitionFromPrevOwner =
                dayTransitionOwnership[ownershipKey] || day; // Default to destination day
            }

            // Transition from this day to next day
            let transitionToNext: RouteSegment | undefined;
            let transitionToNextOwner = day; // Default: owned by origin day (this day)
            if (dayPlaces.length > 0 && nextDayPlaces.length > 0) {
              const lastPlaceOfThisDay = dayPlaces[dayPlaces.length - 1];
              const firstPlaceOfNextDay = nextDayPlaces[0];
              transitionToNext = getRouteSegment(
                lastPlaceOfThisDay.placeId,
                firstPlaceOfNextDay.placeId,
              );
              const ownershipKey = `${day}-${nextDay}`;
              transitionToNextOwner =
                dayTransitionOwnership[ownershipKey] || nextDay; // Default to destination day
            }

            return (
              <div key={day} className="space-y-2">
                {/* Day Header */}
                <DroppableDayHeader
                  day={day}
                  dayColor={dayColor}
                  isCollapsed={isCollapsed}
                  formatDayDate={formatDayDate}
                  startDate={startDate}
                  dayPlacesLength={dayPlaces.length}
                  totalDays={totalDays}
                  onToggleDay={onToggleDay}
                  onRemoveDay={onRemoveDay}
                />

                {/* Day transition info - show movement from previous day (if owned by this day) */}
                {!isCollapsed &&
                  transitionFromPrev &&
                  dayIndex > 0 &&
                  transitionFromPrevOwner === day && (
                    <DraggableDayTransition
                      fromDay={prevDay}
                      toDay={day}
                      segment={transitionFromPrev}
                      dayColor={dayColor}
                      formatDuration={formatDuration}
                      onTransitionClick={onTransitionClick}
                    />
                  )}

                {/* Droppable Day Container - Only show if not collapsed */}
                {!isCollapsed && (
                  <DroppableDay day={day}>
                    {dayPlaces.length > 0 ? (
                      <div className="space-y-2">
                        {dayPlaces.map((place, indexInDay) => {
                          const globalIndex = places.findIndex(
                            (p) => p.id === place.id,
                          );
                          const nextPlace =
                            indexInDay < dayPlaces.length - 1
                              ? dayPlaces[indexInDay + 1]
                              : null;
                          const segment = nextPlace
                            ? getRouteSegment(place.placeId, nextPlace.placeId)
                            : null;

                          // Calculate min time for this place
                          let minTime: string | undefined;
                          if (indexInDay > 0) {
                            const prevPlace = dayPlaces[indexInDay - 1];
                            const prevSegment = getRouteSegment(
                              prevPlace.placeId,
                              place.placeId,
                            );

                            if (prevPlace.visitTime && prevSegment) {
                              // Parse previous visit time (HH:MM format)
                              const [hours, minutes] = prevPlace.visitTime
                                .split(":")
                                .map(Number);
                              const totalMinutes =
                                hours * 60 + minutes + prevSegment.durationMin;
                              const newHours =
                                Math.floor(totalMinutes / 60) % 24;
                              const newMinutes = totalMinutes % 60;
                              minTime = `${String(newHours).padStart(
                                2,
                                "0",
                              )}:${String(newMinutes).padStart(2, "0")}`;
                            }
                          }

                          return (
                            <div key={place.id}>
                              <SortablePlace
                                place={place}
                                index={globalIndex}
                                dayColor={dayColor.marker}
                                onRemove={onRemove}
                                onPlaceClick={onPlaceClick}
                                onTimeUpdate={onTimeUpdate}
                                onCostUpdate={onCostUpdate}
                                onMemoUpdate={onMemoUpdate}
                                minTime={minTime}
                              />

                              {/* Route segment info */}
                              {segment &&
                                segment.durationMin !== undefined &&
                                segment.distanceKm !== undefined && (
                                  <button
                                    onClick={() => {
                                      nextPlace &&
                                        onSegmentClick?.(
                                          place,
                                          nextPlace,
                                          segment,
                                        );
                                    }}
                                    className="relative w-full hover:bg-gray-50 transition-colors cursor-pointer group"
                                    title="클릭하여 이동 경로 상세 보기"
                                  >
                                    <div className="flex items-center pl-16 pr-4 py-2">
                                      <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200" />
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs text-gray-500 -ml-2">
                                        <span className="flex-shrink-0">
                                          {segment.travelMode === "DRIVING" &&
                                            "🚗"}
                                          {segment.travelMode === "WALKING" &&
                                            "🚶"}
                                          {segment.travelMode === "TRANSIT" &&
                                            "🚇"}
                                          {segment.travelMode === "BICYCLING" &&
                                            "🚴"}
                                          {!segment.travelMode && "🚗"}
                                        </span>
                                        {segment.departureTime && (
                                          <>
                                            <span className="text-purple-600 font-medium whitespace-nowrap">
                                              {segment.departureTime}
                                            </span>
                                            <span className="text-gray-300">
                                              •
                                            </span>
                                          </>
                                        )}
                                        <span className="whitespace-nowrap">
                                          {formatDuration(segment.durationMin)}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="whitespace-nowrap">
                                          {segment.distanceKm.toFixed(1)}km
                                        </span>
                                        {segment.cost &&
                                          parseFloat(segment.cost.toString()) >
                                            0 && (
                                            <>
                                              <span className="text-gray-300">
                                                •
                                              </span>
                                              <span className="text-emerald-600 font-medium whitespace-nowrap">
                                                {parseFloat(
                                                  segment.cost.toString(),
                                                ).toLocaleString()}
                                                {segment.currency === "KRW"
                                                  ? "원"
                                                  : segment.currency}
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
                          );
                        })}

                        {/* Transition to next day (if owned by this day) */}
                        {transitionToNext &&
                          transitionToNextOwner === day &&
                          !isLastDay && (
                            <div className="mt-2">
                              <DraggableDayTransition
                                fromDay={day}
                                toDay={nextDay}
                                segment={transitionToNext}
                                dayColor={dayColor}
                                formatDuration={formatDuration}
                                onTransitionClick={onTransitionClick}
                              />
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                        장소를 여기로 드래그하거나 위에서 검색하여 추가하세요
                      </div>
                    )}
                  </DroppableDay>
                )}

                {/* Add next day button - only show for last day */}
                {isLastDay && onAddDay && (
                  <button
                    onClick={onAddDay}
                    className="w-full mt-3 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">+</span>
                    <span className="font-medium">Day {day + 1} 추가</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* If no places at all, show add day 1 message */}
          {places.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              장소를 추가하면 Day 1이 자동으로 생성됩니다
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};
