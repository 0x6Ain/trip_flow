import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { shareTrip, type ShareResponse } from "../../services/api/tripApi";
import { Modal } from "../Modal";

interface ShareModalProps {
  tripId: number;
  onClose: () => void;
}

export const ShareModal = ({ tripId, onClose }: ShareModalProps) => {
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // 공유 URL 생성
    const fetchShareData = async () => {
      setIsLoading(true);
      try {
        const data = await shareTrip(tripId);
        setShareData(data);
      } catch (error) {
        console.error("공유 URL 생성 실패:", error);
        alert("공유 URL 생성에 실패했습니다.");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };
    fetchShareData();
  }, [tripId, onClose]);

  const handleCopyUrl = async () => {
    if (!shareData) return;
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      alert("URL 복사에 실패했습니다.");
    }
  };

  const handleKakaoShare = () => {
    if (!shareData) return;
    
    // Kakao SDK가 로드되어 있는지 확인
    if (typeof window.Kakao === "undefined" || !window.Kakao.isInitialized()) {
      alert("카카오톡 공유 기능을 사용할 수 없습니다.");
      return;
    }

    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: shareData.metadata.title,
          description: shareData.metadata.description,
          imageUrl: shareData.metadata.image || "https://via.placeholder.com/300x200?text=TripFlow",
          link: {
            mobileWebUrl: shareData.shareUrl,
            webUrl: shareData.shareUrl,
          },
        },
        buttons: [
          {
            title: "여행 보기",
            link: {
              mobileWebUrl: shareData.shareUrl,
              webUrl: shareData.shareUrl,
            },
          },
        ],
      });
    } catch (error) {
      console.error("카카오톡 공유 실패:", error);
      alert("카카오톡 공유에 실패했습니다.");
    }
  };

  const handleFacebookShare = () => {
    if (!shareData) return;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.shareUrl)}`;
    window.open(fbUrl, "_blank", "width=600,height=400");
  };

  const handleInstagramShare = () => {
    // Instagram은 직접 공유 API가 없으므로 URL만 복사
    handleCopyUrl();
    alert("URL이 복사되었습니다. Instagram에서 직접 붙여넣기 해주세요.");
  };

  return (
    <Modal onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">여행 공유하기</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500"
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
      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-500" />
          </div>
        ) : shareData ? (
          <>
            {/* URL 복사 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공유 링크
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareData.shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {copied ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      복사됨
                    </>
                  ) : (
                    <>
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      복사
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 소셜 미디어 공유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                소셜 미디어에 공유
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleKakaoShare}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors font-medium"
                >
                  <span className="text-xl">💬</span>
                  카카오톡
                </button>
                <button
                  onClick={handleFacebookShare}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <span className="text-xl">f</span>
                  Facebook
                </button>
                <button
                  onClick={handleInstagramShare}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  <span className="text-xl">📷</span>
                  Instagram
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <span className="text-xl">📱</span>
                  QR 코드
                </button>
              </div>
            </div>

            {/* QR 코드 표시 */}
            {showQR && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-600 mb-4">
                    QR 코드를 스캔하여 공유
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <QRCodeSVG
                      value={shareData.shareUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 메타데이터 정보 */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                공유된 시간: {new Date(shareData.sharedAt).toLocaleString("ko-KR")}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          닫기
        </button>
      </div>
    </Modal>
  );
};
