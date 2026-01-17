import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";

export const HomePage = () => {
  const navigate = useNavigate();
  const createTrip = useTripStore((state) => state.createTrip);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !city.trim() || !startLat || !startLng) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    const lat = parseFloat(startLat);
    const lng = parseFloat(startLng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("올바른 좌표를 입력해주세요.");
      return;
    }

    createTrip(title, city, { lat, lng });
    navigate("/plan");
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
    setStartLat(preset.lat.toString());
    setStartLng(preset.lng.toString());
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
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예: 파리"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-2">
                시작 위치 위도
              </label>
              <input
                id="lat"
                type="number"
                step="any"
                value={startLat}
                onChange={(e) => setStartLat(e.target.value)}
                placeholder="48.8566"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-2">
                시작 위치 경도
              </label>
              <input
                id="lng"
                type="number"
                step="any"
                value={startLng}
                onChange={(e) => setStartLng(e.target.value)}
                placeholder="2.3522"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 팁: 시작 위치는 공항이나 숙소의 좌표를 입력하세요.
              <br />
              프리셋 도시를 선택하면 자동으로 입력됩니다.
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
      </div>
    </div>
  );
};
