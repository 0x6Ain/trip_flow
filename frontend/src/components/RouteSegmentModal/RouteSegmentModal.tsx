import { useState } from "react";
import type {
  Place,
  RouteSegment,
  TravelMode,
  Currency,
} from "../../types/trip";
import { Modal } from "../Modal";

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
  onCostChange?: (
    fromPlaceId: string,
    toPlaceId: string,
    cost: number,
    currency: Currency
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
  onCostChange,
}: RouteSegmentModalProps) => {
  const [selectedMode, setSelectedMode] = useState<TravelMode>(
    segment.travelMode || defaultTravelMode
  );
  const [departureTime, setDepartureTime] = useState<string>(
    segment.departureTime || fromPlace.visitTime || ""
  );
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [cost, setCost] = useState<string>(segment.cost?.toString() || "");
  const [currency, setCurrency] = useState<Currency>(segment.currency || "KRW");
  const [isEditingCost, setIsEditingCost] = useState(false);

  const handleModeChange = (mode: TravelMode) => {
    setSelectedMode(mode);
    if (onTravelModeChange) {
      onTravelModeChange(fromPlace.placeId, toPlace.placeId, mode);
    }
  };

  const handleDepartureTimeSubmit = () => {
    if (onDepartureTimeChange) {
      onDepartureTimeChange(fromPlace.placeId, toPlace.placeId, departureTime);
      setIsEditingTime(false);
    }
  };

  const handleDepartureTimeCancel = () => {
    setDepartureTime(segment.departureTime || fromPlace.visitTime || "");
    setIsEditingTime(false);
  };

  const handleCostSubmit = () => {
    if (onCostChange) {
      const costValue = parseFloat(cost) || 0;
      onCostChange(fromPlace.placeId, toPlace.placeId, costValue, currency);
      setIsEditingCost(false);
    }
  };

  const handleCostCancel = () => {
    setCost(segment.cost?.toString() || "");
    setCurrency(segment.currency || "KRW");
    setIsEditingCost(false);
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
    <Modal onClose={onClose} size="md" className="shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h2 className="text-base font-bold">이동 경로</h2>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Travel Mode Selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-800">
            이동 수단
          </label>
          <div className="grid grid-cols-4 gap-2">
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
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  selectedMode === option.mode
                    ? "border-blue-500 bg-gradient-to-b from-blue-50 to-purple-50 text-blue-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-xs font-semibold">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Route Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-500 mb-1">출발</div>
              <div className="text-base font-bold text-gray-900 truncate mb-1">
                {fromPlace.name}
              </div>
              {fromPlace.visitTime && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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

          {/* Departure Time Setting (only if handler provided) */}
          {onDepartureTimeChange && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">
                출발 시간
              </div>
              {!isEditingTime && (
                <button
                  onClick={() => setIsEditingTime(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {departureTime ? "수정" : "설정"}
                </button>
              )}
            </div>

            {isEditingTime ? (
              <div className="space-y-3">
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {departureTime && (
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <span>→ 도착:</span>
                    <span className="font-semibold">{calculateArrivalTime(departureTime)}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDepartureTimeSubmit}
                    className="flex-1 h-9 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleDepartureTimeCancel}
                    className="flex-1 h-9 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {departureTime ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-purple-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-bold text-purple-700">
                        {departureTime}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      → <span className="font-semibold">{calculateArrivalTime(departureTime)}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">미설정</span>
                )}
              </div>
            )}
          </div>
          )}

          {/* Cost Setting (only if handler provided) */}
          {onCostChange && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">
                교통비
              </div>
              {!isEditingCost && (
                <button
                  onClick={() => setIsEditingCost(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {cost ? "수정" : "설정"}
                </button>
              )}
            </div>

            {isEditingCost ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                    className="flex-1 h-10 px-3 text-sm border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="h-10 px-3 text-sm border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="KRW">₩</option>
                    <option value="USD">$</option>
                    <option value="JPY">¥</option>
                    <option value="EUR">€</option>
                    <option value="CNY">¥</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCostSubmit}
                    className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCostCancel}
                    className="flex-1 h-9 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {cost && parseFloat(cost) > 0 ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-emerald-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-bold text-emerald-700">
                      {parseFloat(cost).toLocaleString()} {currency}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">미설정</span>
                )}
              </div>
            )}
          </div>
          )}

          <div className="flex items-center justify-center py-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold text-blue-600">
                  {formatDuration(segment.durationMin)}
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="text-sm font-semibold text-blue-600">
                {segment.distanceKm.toFixed(1)}km
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-500 mb-1">도착</div>
              <div className="text-base font-bold text-gray-900 truncate mb-1">
                {toPlace.name}
              </div>
              {toPlace.visitTime && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
        <div className="pt-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=place_id:${
              segment.fromPlaceId
            }&destination=place_id:${
              segment.toPlaceId
            }&travelmode=${selectedMode.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-semibold shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Google Maps에서 보기
          </a>
        </div>
      </div>
    </Modal>
  );
};
