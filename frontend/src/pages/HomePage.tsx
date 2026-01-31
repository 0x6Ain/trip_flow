import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { CitySearch } from "../components/CitySearch/CitySearch";
import type { Location } from "../types/trip";

export const HomePage = () => {
  const navigate = useNavigate();
  const { createTrip, currentTrip, clearTrip } = useTripStore();

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [cityLocation, setCityLocation] = useState<Location>({ lat: 0, lng: 0 });
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [showNewTripForm, setShowNewTripForm] = useState(false);

  // Check if Google Maps API is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof google !== "undefined" && google.maps) {
        setIsApiLoaded(true);
      } else {
        // Check again after a short delay
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !city.trim()) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (cityLocation.lat === 0 && cityLocation.lng === 0) {
      alert("도시를 선택해주세요.");
      return;
    }

    createTrip(title, city, cityLocation);
    navigate("/plan");
  };

  const handleCityChange = (cityName: string, location: Location) => {
    setCity(cityName);
    setCityLocation(location);
  };

  // Preset cities
  const presetCities = [
    { name: "파리", lat: 48.8566, lng: 2.3522 },
    { name: "도쿄", lat: 35.6762, lng: 139.6503 },
    { name: "뉴욕", lat: 40.7128, lng: -74.006 },
    { name: "런던", lat: 51.5074, lng: -0.1278 },
    { name: "바르셀로나", lat: 41.3851, lng: 2.1734 },
  ];

  const handlePresetSelect = (preset: (typeof presetCities)[0]) => {
    setCity(preset.name);
    setCityLocation({ lat: preset.lat, lng: preset.lng });
  };

  const handleContinueTrip = () => {
    navigate("/plan");
  };

  const handleNewTrip = () => {
    if (currentTrip) {
      const confirmed = window.confirm(
        "새 여행을 시작하면 현재 여행이 삭제됩니다. 계속하시겠습니까?"
      );
      if (!confirmed) return;
      clearTrip();
    }
    setShowNewTripForm(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ✈️ Trip Flow
          </h1>
          <p className="text-gray-600">
            스마트한 여행 루트 계획, 지금 시작하세요
          </p>
        </div>

        {/* Saved Trip Card */}
        {currentTrip && !showNewTripForm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">저장된 여행</h2>
              <button
                onClick={handleNewTrip}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                새 여행 시작
              </button>
            </div>
            <div
              onClick={handleContinueTrip}
              className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-blue-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {currentTrip.title}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <span>📍</span>
                    {currentTrip.city}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {currentTrip.places.length}개 장소
                  </span>
                </div>
              </div>

              {currentTrip.places.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 space-y-1">
                    {currentTrip.places.slice(0, 3).map((place, idx) => (
                      <div key={place.id} className="flex items-center gap-2">
                        <span className="text-blue-500 font-bold">{idx + 1}.</span>
                        <span className="truncate">{place.name}</span>
                      </div>
                    ))}
                    {currentTrip.places.length > 3 && (
                      <div className="text-gray-500 text-xs ml-5">
                        +{currentTrip.places.length - 3}개 더보기
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                <span className="text-xs text-gray-500">
                  마지막 수정: {formatDate(currentTrip.updatedAt)}
                </span>
                <span className="text-sm font-medium text-blue-600">
                  이어서 계획하기 →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* New Trip Form or Button */}
        {!currentTrip || showNewTripForm ? (
          <>
            {showNewTripForm && (
              <div className="mb-4">
                <button
                  onClick={() => setShowNewTripForm(false)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  ← 돌아가기
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              여행 제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 파리 3박 4일"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              도시
            </label>
            <CitySearch value={city} onChange={handleCityChange} isApiLoaded={isApiLoaded} />
            <div className="mt-2 flex flex-wrap gap-2">
              {presetCities.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {cityLocation.lat !== 0 && cityLocation.lng !== 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ 선택된 도시: {city}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 팁: 도시 이름을 입력하면 자동완성 제안이 나타납니다.
              <br />
              프리셋 도시 버튼을 클릭하여 빠르게 선택할 수도 있습니다.
            </p>
          </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
              >
                여행 계획 시작하기 🚀
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                주요 기능
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>장소 추가 및 지도 시각화</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>드래그로 순서 변경</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>AI 루트 최적화 제안</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>링크로 여행 공유</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <button
              onClick={handleNewTrip}
              className="px-8 py-4 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              새 여행 시작하기 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
