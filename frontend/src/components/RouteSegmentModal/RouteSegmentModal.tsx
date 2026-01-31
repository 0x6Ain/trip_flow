import { useEffect, useState } from "react";
import type { Place, RouteSegment, TravelMode } from "../../types/trip";

interface RouteSegmentModalProps {
  fromPlace: Place;
  toPlace: Place;
  segment: RouteSegment;
  defaultTravelMode?: TravelMode;
  onClose: () => void;
  onTravelModeChange?: (fromPlaceId: string, toPlaceId: string, mode: TravelMode) => void;
}

export const RouteSegmentModal = ({ 
  fromPlace, 
  toPlace, 
  segment, 
  defaultTravelMode = "DRIVING",
  onClose,
  onTravelModeChange 
}: RouteSegmentModalProps) => {
  const [selectedMode, setSelectedMode] = useState<TravelMode>(
    segment.travelMode || defaultTravelMode
  );

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
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h2 className="text-xl font-bold">이동 경로</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Travel Mode Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">이동 수단 선택</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: "DRIVING" as TravelMode, icon: "🚗", label: "자동차" },
                { mode: "WALKING" as TravelMode, icon: "🚶", label: "도보" },
                { mode: "TRANSIT" as TravelMode, icon: "🚇", label: "대중교통" },
                { mode: "BICYCLING" as TravelMode, icon: "🚴", label: "자전거" },
              ].map((option) => (
                <button
                  key={option.mode}
                  onClick={() => handleModeChange(option.mode)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    selectedMode === option.mode
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              교통 수단을 변경하면 이동 시간과 거리가 재계산됩니다
            </p>
          </div>

          {/* Route Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-green-600 font-bold">A</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">출발</div>
                <div className="font-semibold text-gray-900">{fromPlace.name}</div>
                {fromPlace.visitTime && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {fromPlace.visitTime}
                  </div>
                )}
              </div>
            </div>

            <div className="pl-4 border-l-2 border-blue-300 ml-4 py-2">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-blue-600">{formatDuration(segment.durationMin)}</span>
                <span>•</span>
                <span className="font-medium text-blue-600">{segment.distanceKm.toFixed(1)}km</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-red-600 font-bold">B</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">도착</div>
                <div className="font-semibold text-gray-900">{toPlace.name}</div>
                {toPlace.visitTime && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {toPlace.visitTime}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">예상 소요 시간</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(segment.durationMin)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">이동 거리</div>
                <div className="text-2xl font-bold text-blue-600">
                  {segment.distanceKm.toFixed(1)}km
                </div>
              </div>
            </div>
          </div>

          {/* Selected Mode Info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">선택된 이동 수단 정보</h3>
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 text-4xl">
                  {selectedMode === "DRIVING" && "🚗"}
                  {selectedMode === "WALKING" && "🚶"}
                  {selectedMode === "TRANSIT" && "🚇"}
                  {selectedMode === "BICYCLING" && "🚴"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-lg mb-1">
                    {selectedMode === "DRIVING" && "자동차"}
                    {selectedMode === "WALKING" && "도보"}
                    {selectedMode === "TRANSIT" && "대중교통"}
                    {selectedMode === "BICYCLING" && "자전거"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedMode === "DRIVING" && "편리하고 빠른 이동 수단입니다"}
                    {selectedMode === "WALKING" && "주변 풍경을 감상하며 이동할 수 있습니다"}
                    {selectedMode === "TRANSIT" && "경제적이고 환경 친화적인 이동 수단입니다"}
                    {selectedMode === "BICYCLING" && "건강하고 친환경적인 이동 수단입니다"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-600 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-amber-900 mb-1">여행 팁</div>
                <ul className="text-sm text-amber-800 space-y-1">
                  {selectedMode === "DRIVING" && (
                    <>
                      <li>• 교통 상황에 따라 소요 시간이 달라질 수 있습니다</li>
                      <li>• 주차 가능 여부를 미리 확인하세요</li>
                      {segment.durationMin > 60 && (
                        <li>• 긴 이동이므로 중간에 휴식을 고려하세요</li>
                      )}
                    </>
                  )}
                  {selectedMode === "WALKING" && (
                    <>
                      <li>• 편한 신발을 착용하세요</li>
                      <li>• 날씨를 확인하고 준비하세요</li>
                      {segment.distanceKm > 1 && (
                        <li>• 충분한 수분을 준비하세요</li>
                      )}
                    </>
                  )}
                  {selectedMode === "TRANSIT" && (
                    <>
                      <li>• 교통카드나 승차권을 미리 준비하세요</li>
                      <li>• 대중교통 노선과 시간표를 확인하세요</li>
                      <li>• 혼잡 시간대를 피하면 더 편안합니다</li>
                    </>
                  )}
                  {selectedMode === "BICYCLING" && (
                    <>
                      <li>• 자전거 대여 장소를 미리 확인하세요</li>
                      <li>• 안전 장비를 착용하세요</li>
                      <li>• 자전거 도로가 있는지 확인하세요</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Google Maps Link */}
          <div className="pt-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=place_id:${segment.fromPlaceId}&destination=place_id:${segment.toPlaceId}&travelmode=${selectedMode.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Google Maps에서 경로 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
