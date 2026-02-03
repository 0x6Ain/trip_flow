import { useEffect, useState } from "react";
import type { Place, RouteSegment, TravelMode } from "../../types/trip";

interface RouteSegmentModalProps {
  fromPlace: Place;
  toPlace: Place;
  segment: RouteSegment;
  defaultTravelMode?: TravelMode;
  onClose: () => void;
  onTravelModeChange?: (
    fromPlaceId: string,
    toPlaceId: string,
    mode: TravelMode
  ) => void;
  onDepartureTimeChange?: (
    fromPlaceId: string,
    toPlaceId: string,
    departureTime: string
  ) => void;
}

export const RouteSegmentModal = ({
  fromPlace,
  toPlace,
  segment,
  defaultTravelMode = "DRIVING",
  onClose,
  onTravelModeChange,
  onDepartureTimeChange,
}: RouteSegmentModalProps) => {
  const [selectedMode, setSelectedMode] = useState<TravelMode>(
    segment.travelMode || defaultTravelMode
  );
  const [departureTime, setDepartureTime] = useState<string>(
    segment.departureTime || fromPlace.visitTime || ""
  );
  const [isEditingTime, setIsEditingTime] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleModeChange = (mode: TravelMode) => {
    setSelectedMode(mode);
    if (onTravelModeChange) {
      onTravelModeChange(fromPlace.placeId, toPlace.placeId, mode);
    }
  };

  const handleDepartureTimeSubmit = () => {
    if (onDepartureTimeChange && departureTime) {
      onDepartureTimeChange(fromPlace.placeId, toPlace.placeId, departureTime);
      setIsEditingTime(false);
    }
  };

  const handleDepartureTimeCancel = () => {
    setDepartureTime(segment.departureTime || fromPlace.visitTime || "");
    setIsEditingTime(false);
  };

  // Calculate arrival time
  const calculateArrivalTime = (depTime: string): string => {
    if (!depTime) return "";
    const [hours, minutes] = depTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + segment.durationMin;
    const arrivalHours = Math.floor(totalMinutes / 60) % 24;
    const arrivalMinutes = totalMinutes % 60;
    return `${String(arrivalHours).padStart(2, "0")}:${String(
      arrivalMinutes
    ).padStart(2, "0")}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-2"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-t-lg flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-1.5">
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h2 className="text-sm font-bold">이동 경로</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
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
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Travel Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              이동 수단
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mode: "DRIVING" as TravelMode, icon: "🚗", label: "자동차" },
                { mode: "WALKING" as TravelMode, icon: "🚶", label: "도보" },
                {
                  mode: "TRANSIT" as TravelMode,
                  icon: "🚇",
                  label: "대중교통",
                },
                {
                  mode: "BICYCLING" as TravelMode,
                  icon: "🚴",
                  label: "자전거",
                },
              ].map((option) => (
                <button
                  key={option.mode}
                  onClick={() => handleModeChange(option.mode)}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded border-2 transition-all ${
                    selectedMode === option.mode
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-[10px] font-medium">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Route Info */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500">출발</div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {fromPlace.name}
                </div>
                {fromPlace.visitTime && (
                  <div className="text-xs text-gray-600 flex items-center gap-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fromPlace.visitTime}
                  </div>
                )}
              </div>
            </div>

            {/* Departure Time Setting */}
            <div className="bg-purple-50 p-2 rounded ml-8 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-700">
                  출발 시간
                </div>
                {!isEditingTime && (
                  <button
                    onClick={() => setIsEditingTime(true)}
                    className="text-[10px] text-purple-600 hover:text-purple-700 underline"
                  >
                    {departureTime ? "수정" : "설정"}
                  </button>
                )}
              </div>

              {isEditingTime ? (
                <div className="space-y-1.5">
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  {departureTime && (
                    <div className="text-[10px] text-gray-600">
                      → 도착: {calculateArrivalTime(departureTime)}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleDepartureTimeSubmit}
                      className="px-2 py-1 bg-purple-500 text-white text-[10px] rounded hover:bg-purple-600 transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleDepartureTimeCancel}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-[10px] rounded hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {departureTime ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 text-purple-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-semibold text-purple-700">
                        {departureTime}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        → {calculateArrivalTime(departureTime)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">미설정</span>
                  )}
                </div>
              )}
            </div>

            <div className="pl-2 border-l-2 border-blue-300 ml-3 py-1">
              <div className="text-xs text-gray-600 flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium text-blue-600">
                  {formatDuration(segment.durationMin)}
                </span>
                <span>•</span>
                <span className="font-medium text-blue-600">
                  {segment.distanceKm.toFixed(1)}km
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">B</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500">도착</div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {toPlace.name}
                </div>
                {toPlace.visitTime && (
                  <div className="text-xs text-gray-600 flex items-center gap-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {toPlace.visitTime}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Google Maps Link */}
          <div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=place_id:${
                segment.fromPlaceId
              }&destination=place_id:${
                segment.toPlaceId
              }&travelmode=${selectedMode.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-medium"
            >
              Google Maps에서 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
