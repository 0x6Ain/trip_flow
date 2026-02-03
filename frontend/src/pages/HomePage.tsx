import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { useAuthStore } from "../stores/authStore";
import { CitySearch } from "../components/CitySearch/CitySearch";
import type { Location } from "../types/trip";
import { getTripList, type TripSummary } from "../services/api/tripApi";

export const HomePage = () => {
  const navigate = useNavigate();
  const { createTrip, loadTrip, deleteTrip, trips } = useTripStore();
  const { user } = useAuthStore();

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [cityLocation, setCityLocation] = useState<Location>({
    lat: 0,
    lng: 0,
  });
  const [startDate, setStartDate] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [showNewTripForm, setShowNewTripForm] = useState(false);

  // Server trips state
  const [serverTrips, setServerTrips] = useState<TripSummary[]>([]);
  const [isLoadingServerTrips, setIsLoadingServerTrips] = useState(false);
  const [serverTripsError, setServerTripsError] = useState<string | null>(null);

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

  // Load server trips if user is logged in
  useEffect(() => {
    if (!user) {
      setServerTrips([]);
      return;
    }

    const loadServerTrips = async () => {
      setIsLoadingServerTrips(true);
      setServerTripsError(null);

      try {
        console.log("🔍 서버에서 Trip 목록 조회 중...");
        const trips = await getTripList();
        setServerTrips(trips);
        console.log("✅ Trip 목록 조회 성공:", trips);
      } catch (error: any) {
        console.error("❌ Trip 목록 조회 실패:", error);
        setServerTripsError(
          error.response?.data?.message || "Trip 목록을 불러올 수 없습니다."
        );
      } finally {
        setIsLoadingServerTrips(false);
      }
    };

    loadServerTrips();
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!city.trim()) {
      alert("도시를 입력해주세요.");
      return;
    }

    if (cityLocation.lat === 0 && cityLocation.lng === 0) {
      alert("도시를 선택해주세요.");
      return;
    }

    if (!startDate) {
      alert("여행 시작일을 선택해주세요.");
      return;
    }

    // 제목이 비어있으면 도시 이름 + 여행 시작일로 자동 생성
    const finalTitle =
      title.trim() ||
      `${city} ${new Date(startDate).toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })} 여행`;

    createTrip(finalTitle, city, cityLocation, startDate);
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

  const handleContinueTrip = (tripId: string) => {
    loadTrip(tripId);
    navigate("/plan");
  };

  const handleServerTripClick = (tripId: number) => {
    navigate(`/plans/${tripId}`);
  };

  const handleNewTrip = () => {
    setShowNewTripForm(true);
  };

  const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation(); // Prevent card click event
    const confirmed = window.confirm(
      "이 여행을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    );
    if (confirmed) {
      deleteTrip(tripId);
    }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trip Flow</h1>
          <p className="text-gray-600">
            스마트한 여행 루트 계획, 지금 시작하세요
          </p>
        </div>

        {/* Server Trips List (Logged in users) */}
        {user && !showNewTripForm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                내 여행{" "}
                {isLoadingServerTrips ? (
                  <span className="text-sm text-gray-400 font-normal">
                    (로딩 중...)
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 font-normal">
                    ({serverTrips.length})
                  </span>
                )}
              </h2>
              <button
                onClick={handleNewTrip}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                새 여행 시작
              </button>
            </div>

            {isLoadingServerTrips ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  여행 목록을 불러오는 중...
                </p>
              </div>
            ) : serverTripsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">{serverTripsError}</p>
              </div>
            ) : serverTrips.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">✈️</div>
                <p className="text-gray-600 mb-4">아직 여행이 없습니다</p>
                <button
                  onClick={handleNewTrip}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  첫 여행을 시작해보세요 →
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {serverTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => handleServerTripClick(trip.id)}
                    className="relative border-2 border-green-200 rounded-xl p-6 hover:border-green-400 hover:shadow-lg transition-all bg-green-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {trip.title}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <span>📍</span>
                          {trip.city}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {trip.totalDays}일
                        </span>
                      </div>
                    </div>

                    {trip.startDate && (
                      <div className="mb-3 text-sm text-gray-600">
                        <span>📅</span>{" "}
                        {new Date(trip.startDate).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    )}

                    {trip.members && trip.members.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>👥</span>
                          <span>{trip.members.length}명</span>
                          {trip.members.length > 0 && (
                            <span className="text-xs text-gray-500">
                              (
                              {trip.members.find((m) => m.role === "owner")
                                ?.displayName || "나"}
                              )
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-green-200">
                      <span className="text-xs text-green-700 font-medium">
                        🌐 서버에 저장됨
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        보기 →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Trips List (Guest users) */}
        {!user && trips.length > 0 && !showNewTripForm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                로컬 여행{" "}
                <span className="text-sm text-gray-500 font-normal">
                  ({trips.length})
                </span>
              </h2>
              <button
                onClick={handleNewTrip}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                새 여행 시작
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-yellow-800">
                💡 로그인하면 여행을 서버에 저장하고 다른 기기에서도 볼 수
                있습니다.
              </p>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trips
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                )
                .map((trip) => (
                  <div
                    key={trip.id}
                    className="relative border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all bg-blue-50"
                  >
                    <button
                      onClick={(e) => handleDeleteTrip(e, trip.id)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all z-10"
                      title="여행 삭제"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <div
                      onClick={() => handleContinueTrip(trip.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3 pr-8">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {trip.title}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span>📍</span>
                            {trip.city}
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {trip.places.length}개 장소
                          </span>
                        </div>
                      </div>

                      {trip.places.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-600 space-y-1">
                            {trip.places.slice(0, 3).map((place, idx) => (
                              <div
                                key={place.id}
                                className="flex items-center gap-2"
                              >
                                <span className="text-blue-500 font-bold">
                                  {idx + 1}.
                                </span>
                                <span className="truncate">{place.name}</span>
                              </div>
                            ))}
                            {trip.places.length > 3 && (
                              <div className="text-gray-500 text-xs ml-5">
                                +{trip.places.length - 3}개 더보기
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                        <span className="text-xs text-gray-500">
                          마지막 수정: {formatDate(trip.updatedAt)}
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          이어서 계획하기 →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* New Trip Form or Button */}
        {((!user && trips.length === 0) ||
          (user && serverTrips.length === 0 && !isLoadingServerTrips) ||
          showNewTripForm) &&
        !serverTripsError ? (
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
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  여행 제목{" "}
                  <span className="text-gray-400 text-xs">(선택사항)</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="비워두면 도시와 날짜로 자동 생성됩니다"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  도시
                </label>
                <CitySearch
                  value={city}
                  onChange={handleCityChange}
                  isApiLoaded={isApiLoaded}
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

              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  여행 시작일
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
        ) : !showNewTripForm && !isLoadingServerTrips ? (
          <div className="text-center py-8">
            <button
              onClick={handleNewTrip}
              className="px-8 py-4 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              새 여행 시작하기 🚀
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
