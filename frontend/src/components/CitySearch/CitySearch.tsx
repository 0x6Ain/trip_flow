import { useState, useEffect, useRef } from "react";
import { searchCityAutocomplete, getCityDetails } from "../../services/googleMapsService";
import type { CityAutocompleteResult } from "../../services/googleMapsService";
import type { Location } from "../../types/trip";
import { env } from "../../config/env";

interface CitySearchProps {
  value: string;
  onChange: (cityName: string, location: Location) => void;
  isApiLoaded?: boolean;
}

export const CitySearch = ({ value, onChange, isApiLoaded = true }: CitySearchProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [allSuggestions, setAllSuggestions] = useState<CityAutocompleteResult[]>([]);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<CityAutocompleteResult[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const loadMoreTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Update displayed suggestions when allSuggestions or displayCount changes
  useEffect(() => {
    setDisplayedSuggestions(allSuggestions.slice(0, displayCount));
  }, [allSuggestions, displayCount]);

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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newValue.trim()) {
      setAllSuggestions([]);
      setDisplayedSuggestions([]);
      setDisplayCount(10);
      setShowDropdown(false);
      return;
    }

    if (!env.googleMapsApiKey || !isApiLoaded) {
      return;
    }

    // Debounce the API call
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      setDisplayCount(10); // Reset display count on new search
      try {
        const results = await searchCityAutocomplete(newValue);
        setAllSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error("도시 자동완성 실패:", error);
        setAllSuggestions([]);
        setDisplayedSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSelectCity = async (suggestion: CityAutocompleteResult) => {
    setInputValue(suggestion.description);
    setShowDropdown(false);
    setAllSuggestions([]);
    setDisplayedSuggestions([]);
    setDisplayCount(10);

    try {
      // Get detailed information including coordinates
      const details = await getCityDetails(suggestion.placeId);
      onChange(details.name || suggestion.description, details.location);
    } catch (error) {
      console.error("도시 정보 가져오기 실패:", error);
      // Fallback: use the description as city name
      onChange(suggestion.description, { lat: 0, lng: 0 });
    }
  };

  const handleFocus = () => {
    if (allSuggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle scroll event to load more suggestions
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;

    if (isNearBottom && !isLoadingMore && displayCount < allSuggestions.length) {
      // Clear previous timer
      if (loadMoreTimerRef.current) {
        window.clearTimeout(loadMoreTimerRef.current);
      }

      setIsLoadingMore(true);

      // Add a small delay to show loading state
      loadMoreTimerRef.current = window.setTimeout(() => {
        setDisplayCount((prev) => prev + 10);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id="city"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={!env.googleMapsApiKey ? "Google Maps API 키 필요" : !isApiLoaded ? "지도 로딩 중..." : "예: 파리, 도쿄, 뉴욕"}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={!env.googleMapsApiKey || !isApiLoaded}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      )}

      {showDropdown && displayedSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          onScroll={handleScroll}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {displayedSuggestions.map((suggestion) => (
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

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="px-4 py-3 text-center border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
                <span className="text-sm text-gray-500">더 불러오는 중...</span>
              </div>
            </div>
          )}

          {/* Show more available indicator */}
          {!isLoadingMore && displayCount < allSuggestions.length && (
            <div className="px-4 py-3 text-center border-t border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-500">
                {allSuggestions.length - displayCount}개 더 있음 • 스크롤하여 더 보기
              </span>
            </div>
          )}

          {/* End of results indicator */}
          {displayCount >= allSuggestions.length && allSuggestions.length > 10 && (
            <div className="px-4 py-2 text-center border-t border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-400">모든 결과 표시됨</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
