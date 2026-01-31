import { useState } from "react";
import { searchPlaces } from "../../services/googleMapsService";
import type { Location, PlaceSearchResult } from "../../types/trip";
import { env } from "../../config/env";

interface PlaceSearchProps {
  searchCenter?: Location;
  onPlaceSelect: (place: PlaceSearchResult) => void;
}

export const PlaceSearch = ({ searchCenter, onPlaceSelect }: PlaceSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (!env.googleMapsApiKey) {
      alert("Google Maps API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.");
      return;
    }

    setIsSearching(true);
    try {
      const places = await searchPlaces(query, searchCenter);
      setResults(places);
      setShowResults(true);
    } catch (error) {
      console.error("장소 검색 실패:", error);
      alert("장소 검색에 실패했습니다. API 키와 API 활성화 상태를 확인해주세요.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (place: PlaceSearchResult) => {
    onPlaceSelect(place);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="relative w-full">
      {!env.googleMapsApiKey && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Google Maps API 키가 설정되지 않았습니다. 장소 검색이 불가능합니다.
          </p>
        </div>
      )}
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="장소 검색 (예: 에펠탑, 루브르 박물관)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!env.googleMapsApiKey}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim() || !env.googleMapsApiKey}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSearching ? "검색 중..." : "검색"}
        </button>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((place) => (
            <button
              key={place.placeId}
              onClick={() => handleSelect(place)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900">{place.name}</div>
              <div className="text-sm text-gray-500 mt-1">{place.formattedAddress}</div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !isSearching && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3 text-gray-500">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
};
