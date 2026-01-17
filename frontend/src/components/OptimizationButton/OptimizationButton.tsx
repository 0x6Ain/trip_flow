import { useState } from "react";
import type { OptimizedResult } from "../../types/trip";

interface OptimizationButtonProps {
  onOptimize: () => Promise<OptimizedResult>;
  onApply: (result: OptimizedResult) => void;
  disabled?: boolean;
}

export const OptimizationButton = ({
  onOptimize,
  onApply,
  disabled,
}: OptimizationButtonProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizedResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const optimized = await onOptimize();
      setResult(optimized);
      setShowModal(true);
    } catch (error) {
      console.error("최적화 실패:", error);
      alert("루트 최적화에 실패했습니다.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      setShowModal(false);
      setResult(null);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setResult(null);
  };

  return (
    <>
      <button
        onClick={handleOptimize}
        disabled={disabled || isOptimizing}
        className="w-full px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isOptimizing ? "최적화 중..." : "🎯 더 나은 순서 제안받기"}
      </button>

      {showModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              최적화된 루트 제안
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">예상 소요시간</span>
                <span className="text-lg font-semibold text-gray-900">
                  {Math.floor(result.totalDuration / 60)}시간{" "}
                  {result.totalDuration % 60}분
                </span>
              </div>

              {result.improvementPercent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">개선율</span>
                  <span className="text-lg font-semibold text-green-600">
                    ↓ {result.improvementPercent}%
                  </span>
                </div>
              )}

              {result.improvementPercent === 0 && (
                <div className="text-sm text-gray-500 mt-2">
                  현재 순서가 이미 최적입니다.
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                제안된 순서
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.places.map((place, index) => (
                  <div
                    key={place.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-gray-900">{place.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                유지
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
