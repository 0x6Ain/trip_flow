import type { RouteSummary as RouteSummaryType } from "../../types/trip";

interface RouteSummaryProps {
  summary?: RouteSummaryType;
  isCalculating?: boolean;
}

export const RouteSummary = ({ summary, isCalculating }: RouteSummaryProps) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  const formatDistance = (km: number): string => {
    return `${km.toFixed(1)}km`;
  };

  if (isCalculating) {
    return (
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
          <span>루트 계산 중...</span>
        </div>
      </div>
    );
  }

  // summary가 없거나 값이 0이면 렌더링하지 않음
  if (!summary || (summary.totalDurationMin === 0 && summary.totalDistanceKm === 0)) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕒</span>
          <div>
            <div className="text-xs text-gray-500">총 소요시간</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(summary.totalDurationMin)}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <span className="text-2xl">🚶</span>
          <div>
            <div className="text-xs text-gray-500">총 거리</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDistance(summary.totalDistanceKm)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
