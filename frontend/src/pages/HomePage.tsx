import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { useAuthStore } from "../stores/authStore";
import { GradientButton } from "../components/GradientButton/GradientButton";
import type { Location } from "../types/trip";
import {
  getTripList,
  createTrip as createTripApi,
  type TripSummary,
} from "../services/api/tripApi";
import {
  searchCityAutocomplete,
  getCityDetails,
} from "../services/googleMapsService";
import type { CityAutocompleteResult } from "../services/googleMapsService";
import { env } from "../config/env";

// 날짜 포맷팅 함수
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const HomePage = () => {
  const navigate = useNavigate();
  const { createTrip } = useTripStore();
  const { user, isAuthenticated } = useAuthStore();

  const [city, setCity] = useState("");
  const [cityLocation, setCityLocation] = useState<Location>({
    lat: 0,
    lng: 0,
  });
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<CityAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Check if Google Maps API is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof google !== "undefined" && google.maps) {
        setIsApiLoaded(true);
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 로그인 상태일 때 여행계획 리스트 가져오기
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingTrips(true);
      getTripList()
        .then((tripList) => {
          setTrips(tripList);
        })
        .catch((error) => {
          console.error("여행계획 리스트 가져오기 실패:", error);
          setTrips([]);
        })
        .finally(() => {
          setIsLoadingTrips(false);
        });
    } else {
      setTrips([]);
    }
  }, [isAuthenticated]);

  const handleSearchInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = e.target.value;
    setSearchInput(newValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newValue.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (!env.googleMapsApiKey || !isApiLoaded) {
      return;
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchCityAutocomplete(newValue);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error("도시 자동완성 실패:", error);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelectCity = async (suggestion: CityAutocompleteResult) => {
    setSearchInput(suggestion.description);
    setShowDropdown(false);
    setSuggestions([]);

    try {
      const details = await getCityDetails(suggestion.placeId);
      setCity(details.name || suggestion.description);
      setCityLocation(details.location);
    } catch (error) {
      console.error("도시 정보 가져오기 실패:", error);
      setCity(suggestion.description);
      setCityLocation({ lat: 0, lng: 0 });
    }
  };

  const handleStartTrip = async () => {
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

    const finalTitle = `${city} ${new Date(startDate).toLocaleDateString(
      "ko-KR",
      {
        month: "long",
        day: "numeric",
      },
    )} 여행`;

    // 로그인한 사용자: 서버에 여행 생성
    if (isAuthenticated) {
      try {
        const createdTrip = await createTripApi({
          title: finalTitle,
          city,
          startLocation: cityLocation,
          startDate,
          totalDays: 1,
        });
        navigate(`/plans/${createdTrip.id}`);
      } catch (error) {
        console.error("❌ 여행 생성 실패:", error);
        alert("여행 생성에 실패했습니다. 다시 시도해주세요.");
      }
    } else {
      // 게스트 사용자: 로컬 스토어에만 저장
      createTrip(finalTitle, city, cityLocation, startDate);
      navigate("/plan");
    }
  };

  const handleTripClick = (tripId: number) => {
    navigate(`/plans/${tripId}`);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 200% 150% at 50% 30%, #EFF6FF 0%, #F0F9FF 40%, #FFFFFF 100%)",
      }}
    >
      {/* Hero Section */}
      <div
        className={`flex items-center justify-center px-16 ${
          isAuthenticated ? "py-10" : "flex-1 py-10"
        }`}
      >
        <div className="w-full max-w-[700px] flex flex-col items-center gap-8">
          {/* Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-[20px] bg-gradient-to-r from-blue-100 to-purple-100">
            <span className="text-base">✨</span>
            <span className="text-[13px] font-semibold text-blue-600">
              AI 기반 스마트 여행 계획
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[64px] font-bold text-gray-900 text-center leading-tight">
            완벽한 여행을
            <br />한 번에 계획하세요
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 text-center leading-relaxed">
            도시를 검색하고 AI가 최적의 경로를 제안합니다
          </p>

          {/* Search Container */}
          <div className="w-full h-16 bg-white rounded-2xl border-2 border-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex items-center gap-3 p-2">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-3 px-5 h-full">
              <span className="text-2xl">🔍</span>
              <div className="relative flex-1 h-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="도시 이름을 입력하세요 (예: 파리, 도쿄, 뉴욕)"
                  className="w-full h-full outline-none text-base text-gray-900 placeholder:text-gray-400"
                  disabled={!env.googleMapsApiKey || !isApiLoaded}
                />
                {isLoading && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {showDropdown && suggestions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                  >
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.placeId}
                        onClick={() => handleSelectCity(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📍</span>
                          <span className="text-gray-900">
                            {suggestion.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <GradientButton
              onClick={handleStartTrip}
              className="w-[180px] h-full"
              size="md"
            >
              여행 시작하기
            </GradientButton>
          </div>
        </div>
      </div>

      {/* Trip List Section - 로그인 상태일 때만 표시 */}
      {isAuthenticated && (
        <div className="w-full px-16 py-12">
          <div className="max-w-[1312px] mx-auto flex flex-col gap-6">
            {/* Section Title */}
            <div className="flex flex-col gap-2">
              <h2 className="text-[32px] font-bold text-gray-900">
                나의 여행계획
              </h2>
              <p className="text-base text-gray-600">
                저장된 여행 계획을 확인하고 관리하세요
              </p>
            </div>

            {/* Trip List */}
            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">저장된 여행 계획이 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleTripClick(trip.id)}
                    className="w-full h-[120px] bg-white rounded-xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-5 p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow cursor-pointer text-left"
                  >
                    {/* Left: Trip Info */}
                    <div className="flex-1 flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {trip.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {trip.city}
                        </span>
                        <span className="text-sm text-gray-300">•</span>
                        <span className="text-sm text-gray-600">
                          {trip.startDate ? formatDate(trip.startDate) : ""}
                        </span>
                      </div>
                    </div>

                    {/* Right: Badge & Arrow */}
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-blue-100 rounded-lg">
                        <span className="text-xs font-semibold text-blue-800">
                          {trip.totalDays}일
                        </span>
                      </div>
                      <span className="text-xl text-gray-400">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
