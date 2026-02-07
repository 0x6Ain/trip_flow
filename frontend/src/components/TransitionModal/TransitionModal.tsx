import type { RouteSegment } from "../../types/trip";
import { Modal } from "../Modal";

interface TransitionModalProps {
  fromDay: number;
  toDay: number;
  segment: RouteSegment;
  onClose: () => void;
}

export const TransitionModal = ({ fromDay, toDay, segment, onClose }: TransitionModalProps) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <Modal onClose={onClose} size="sm" className="max-h-[85vh] p-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-t-xl flex items-center justify-between sticky top-0 z-10">
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <h2 className="text-sm font-bold">Day {fromDay} → Day {toDay} 이동</h2>
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
        {/* Summary */}
        <div className="bg-blue-50 p-2 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">예상 소요 시간</div>
              <div className="text-base font-bold text-blue-600">
                {formatDuration(segment.durationMin)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">이동 거리</div>
              <div className="text-base font-bold text-blue-600">
                {segment.distanceKm.toFixed(1)}km
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 p-2 rounded">
          <div className="flex items-start gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-800 leading-relaxed">
                교통 상황에 따라 시간이 달라질 수 있으니 여유있게 계획하세요
                {segment.durationMin > 60 && ". 장거리 이동이므로 휴식을 권장합니다"}
              </p>
            </div>
          </div>
        </div>

        {/* Google Maps Link */}
        <div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=place_id:${segment.fromPlaceId}&destination=place_id:${segment.toPlaceId}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-medium"
          >
            Google Maps에서 보기
          </a>
        </div>
      </div>
    </Modal>
  );
};
