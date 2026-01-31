import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Place, Currency } from "../../types/trip";
import { useState } from "react";

const CURRENCY_INFO: Record<Currency, { symbol: string; name: string }> = {
  KRW: { symbol: "₩", name: "한국 원" },
  USD: { symbol: "$", name: "미국 달러" },
  JPY: { symbol: "¥", name: "일본 엔" },
  EUR: { symbol: "€", name: "유로" },
  CNY: { symbol: "¥", name: "중국 위안" },
  GBP: { symbol: "£", name: "영국 파운드" },
  AUD: { symbol: "A$", name: "호주 달러" },
  CAD: { symbol: "C$", name: "캐나다 달러" },
  THB: { symbol: "฿", name: "태국 바트" },
  VND: { symbol: "₫", name: "베트남 동" },
};

interface SortablePlaceProps {
  place: Place;
  index: number;
  dayColor?: string;
  onRemove: (placeId: string) => void;
  onPlaceClick?: (place: Place) => void;
  onTimeUpdate?: (placeId: string, visitTime: string) => void;
  onCostUpdate?: (placeId: string, cost: number, currency: Currency) => void;
  onMemoUpdate?: (placeId: string, memo: string) => void;
  minTime?: string;
}

export const SortablePlace = ({ place, dayColor = "#4285F4", onRemove, onPlaceClick, onTimeUpdate, onCostUpdate, onMemoUpdate, minTime }: SortablePlaceProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id });

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [visitTime, setVisitTime] = useState(place.visitTime || "");
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [cost, setCost] = useState(place.cost?.toString() || "0");
  const [currency, setCurrency] = useState<Currency>(place.currency || "KRW");
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memo, setMemo] = useState(place.memo || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTimeSubmit = () => {
    if (onTimeUpdate && visitTime) {
      // Validate minTime if provided
      if (minTime && visitTime < minTime) {
        alert(`방문 시간은 최소 ${minTime} 이후여야 합니다.\n(이전 장소 도착 시간 + 이동 시간)`);
        return;
      }
      onTimeUpdate(place.id, visitTime);
      setIsEditingTime(false);
    }
  };

  const handleTimeCancel = () => {
    setVisitTime(place.visitTime || "");
    setIsEditingTime(false);
  };

  const handleCostSubmit = () => {
    if (onCostUpdate) {
      const numCost = parseFloat(cost) || 0;
      onCostUpdate(place.id, numCost, currency);
      setIsEditingCost(false);
      setIsDropdownOpen(false);
    }
  };

  const handleCostCancel = () => {
    setCost(place.cost?.toString() || "0");
    setCurrency(place.currency || "KRW");
    setIsEditingCost(false);
  };

  const handleMemoSubmit = () => {
    if (onMemoUpdate) {
      onMemoUpdate(place.id, memo);
      setIsEditingMemo(false);
      setIsDropdownOpen(false);
    }
  };

  const handleMemoCancel = () => {
    setMemo(place.memo || "");
    setIsEditingMemo(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 pt-1"
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
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Day color indicator */}
      <div 
        className="flex-shrink-0 w-1 h-10 rounded-full mt-1"
        style={{ backgroundColor: dayColor }}
      />

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <div 
          className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          onClick={() => onPlaceClick?.(place)}
        >
          <div className="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">
            {place.name}
          </div>
          <div className="text-xs text-gray-400">
            클릭하여 상세정보 보기
          </div>
        </div>

        {/* Time info / editor */}
        {isEditingTime ? (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 w-20">방문 시간:</label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                min={minTime}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {minTime && (
              <div className="text-xs text-gray-500">
                최소 시간: {minTime} (이전 장소 도착 + 이동 시간)
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTimeSubmit();
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                저장
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTimeCancel();
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            {place.visitTime ? (
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {place.visitTime}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">시간 미설정</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Set default time to minTime if visitTime is not set
                const defaultTime = place.visitTime || minTime || "";
                setVisitTime(defaultTime);
                setIsEditingTime(true);
              }}
              className="text-blue-500 hover:text-blue-700 text-xs underline"
            >
              {place.visitTime ? "수정" : "시간 설정"}
            </button>
          </div>
        )}

        {/* Cost editor */}
        {isEditingCost && (
          <div className="mt-2 p-3 bg-yellow-50 rounded-lg space-y-3">
            <div className="space-y-2">
              {/* Currency selector */}
              <div>
                <label className="text-xs text-gray-600 block mb-1">화폐</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(Object.keys(CURRENCY_INFO) as Currency[]).map((curr) => (
                    <option key={curr} value={curr}>
                      {CURRENCY_INFO[curr].symbol} {curr} - {CURRENCY_INFO[curr].name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Amount input */}
              <div>
                <label className="text-xs text-gray-600 block mb-1">금액</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-700">
                    {CURRENCY_INFO[currency].symbol}
                  </span>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCostSubmit();
                }}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors"
              >
                저장
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCostCancel();
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Memo editor */}
        {isEditingMemo && (
          <div className="mt-2 p-3 bg-green-50 rounded-lg space-y-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">메모:</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="메모를 입력하세요..."
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMemoSubmit();
                }}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                저장
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMemoCancel();
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown menu button */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="옵션"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
              }}
            />
            
            {/* Menu */}
            <div className="absolute right-0 top-10 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {/* Cost input */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingCost(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <span>💰</span>
                <span className="text-sm text-gray-700">비용 입력</span>
              </button>

              {/* Memo input */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingMemo(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <span>📝</span>
                <span className="text-sm text-gray-700">메모 추가</span>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-200 my-1"></div>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${place.name}"을(를) 삭제하시겠습니까?`)) {
                    onRemove(place.id);
                  }
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <span>🗑️</span>
                <span className="text-sm text-red-600">삭제</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
