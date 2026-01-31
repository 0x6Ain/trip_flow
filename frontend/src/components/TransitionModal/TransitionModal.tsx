import type { RouteSegment } from "../../types/trip";

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h2 className="text-xl font-bold">Day {fromDay} → Day {toDay} 이동</h2>
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

          {/* Transportation Options */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">추천 이동 수단</h3>
            <div className="space-y-2">
              {/* Car/Taxi */}
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">자동차 / 택시</div>
                  <div className="text-sm text-gray-500">
                    약 {formatDuration(segment.durationMin)} 소요
                  </div>
                </div>
                <div className="text-blue-600 font-semibold">추천</div>
              </div>

              {/* Public Transit */}
              {segment.durationMin > 30 && (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">대중교통</div>
                    <div className="text-sm text-gray-500">
                      시간은 더 걸릴 수 있지만 경제적입니다
                    </div>
                  </div>
                </div>
              )}
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
                  <li>• 교통 상황에 따라 소요 시간이 달라질 수 있습니다</li>
                  <li>• 여유있는 일정을 계획하세요</li>
                  {segment.durationMin > 60 && (
                    <li>• 장거리 이동이므로 휴게소에서 휴식을 권장합니다</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Google Maps Link */}
          <div className="pt-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=place_id:${segment.fromPlaceId}&destination=place_id:${segment.toPlaceId}&travelmode=driving`}
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
