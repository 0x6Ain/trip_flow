import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../stores/tripStore";
import { useAuthStore } from "../stores/authStore";
import { GradientButton } from "../components/GradientButton/GradientButton";
import type { Location } from "../types/trip";
import { getTripList, createTrip as createTripApi, type TripSummary } from "../services/api/tripApi";
import { searchCityAutocomplete, getCityDetails } from "../services/googleMapsService";
import type { CityAutocompleteResult } from "../services/googleMapsService";
import { env } from "../config/env";

export const HomePage = () => {
  const navigate = useNavigate();
  const { createTrip } = useTripStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedCity, setSelectedCity] = useState<{
    name: string;
    location: Location;
  } | null>(null);
  const [startDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<CityAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isApiLoaded = typeof google !== "undefined" && google.maps;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || inputRef.current?.contains(target)) {
        return;
      }
      setShowDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 로그인 상태일 때 여행계획 리스트 가져오기
  useEffect(() => {
    if (!isAuthenticated) {
      setTrips([]);
      return;
    }

    setIsLoadingTrips(true);
    getTripList()
      .then(setTrips)
      .catch((error) => {
        console.error("여행계획 리스트 가져오기 실패:", error);
        setTrips([]);
      })
      .finally(() => setIsLoadingTrips(false));
  }, [isAuthenticated]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!value.trim() || !env.googleMapsApiKey || !isApiLoaded) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchCityAutocomplete(value);
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
      setSelectedCity({
        name: details.name || suggestion.description,
        location: details.location,
      });
    } catch (error) {
      console.error("도시 정보 가져오기 실패:", error);
      setSelectedCity({
        name: suggestion.description,
        location: { lat: 0, lng: 0 },
      });
    }
  };

  const handleStartTrip = async () => {
    if (!selectedCity?.name.trim() || !selectedCity.location.lat) {
      alert("도시를 선택해주세요.");
      return;
    }

    const title = `${selectedCity.name} ${new Date(startDate).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    })} 여행`;

    try {
      if (isAuthenticated) {
        const trip = await createTripApi({
          title,
          city: selectedCity.name,
          startLocation: selectedCity.location,
          startDate,
          totalDays: 1,
        });
        navigate(`/plans/${trip.id}`);
      } else {
        createTrip(title, selectedCity.name, selectedCity.location, startDate);
        navigate("/plan");
      }
    } catch (error) {
      console.error("여행 생성 실패:", error);
      alert("여행 생성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_200%_150%_at_50%_30%,#EFF6FF_0%,#F0F9FF_40%,#FFFFFF_100%)]">
      {/* Hero Section */}
      <div className={`flex items-center justify-center px-16 py-10 ${!isAuthenticated && "flex-1"}`}>
        <div className="w-full max-w-[700px] flex flex-col items-center gap-8">
          {/* Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-[20px] bg-gradient-to-r from-blue-100 to-purple-100">
            <span className="text-base">✨</span>
            <span className="text-[13px] font-semibold text-blue-600">AI 기반 스마트 여행 계획</span>
          </div>

          <h1 className="text-[64px] font-bold text-gray-900 text-center leading-tight">
            완벽한 여행을
            <br />한 번에 계획하세요
          </h1>

          <p className="text-xl text-gray-600 text-center leading-relaxed">도시를 검색하고 AI가 최적의 경로를 제안합니다</p>

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
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="도시 이름을 입력하세요 (예: 파리, 도쿄, 뉴욕)"
                  className="w-full h-full outline-none text-base text-gray-900 placeholder:text-gray-400"
                  disabled={!env.googleMapsApiKey || !isApiLoaded}
                />
                {isLoading && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
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
                          <span className="text-gray-900">{suggestion.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <GradientButton onClick={handleStartTrip} className="w-[180px] h-full" size="md">
              여행 시작하기
            </GradientButton>
          </div>
        </div>
      </div>

      {/* Trip List Section */}
      {isAuthenticated && (
        <div className="w-full px-16 py-12">
          <div className="max-w-[1312px] mx-auto flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-[32px] font-bold text-gray-900">나의 여행계획</h2>
              <p className="text-base text-gray-600">저장된 여행 계획을 확인하고 관리하세요</p>
            </div>

            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
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
                    onClick={() => navigate(`/plans/${trip.id}`)}
                    className="w-full h-[120px] bg-white rounded-xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center gap-5 p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow text-left"
                  >
                    <div className="flex-1 flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{trip.city}</span>
                        <span className="text-gray-300">•</span>
                        <span>
                          {trip.startDate &&
                            new Date(trip.startDate).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-blue-100 rounded-lg">
                        <span className="text-xs font-semibold text-blue-800">{trip.totalDays}일</span>
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
