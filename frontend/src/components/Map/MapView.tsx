import { useEffect, useState } from "react";
import { GoogleMap, Polyline } from "@react-google-maps/api";
import type { Location, Place } from "../../types/trip";
import { env } from "../../config/env";
import { AdvancedMarker } from "./AdvancedMarker";

interface MapViewProps {
  center: Location;
  startLocation: Location;
  places: Place[];
  onMapLoad?: (map: google.maps.Map) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export const MapView = ({ center, startLocation, places, onMapLoad }: MapViewProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError] = useState<Error | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Check if Google Maps API is loaded
  useEffect(() => {
    let timeoutId: number;
    
    const checkGoogleMaps = () => {
      if (typeof google !== "undefined" && google.maps) {
        setIsLoaded(true);
        clearTimeout(timeoutId);
      }
    };

    // Set timeout for 10 seconds
    timeoutId = window.setTimeout(() => {
      if (!isLoaded) {
        setLoadTimeout(true);
        console.error("Google Maps API 로드 타임아웃");
      }
    }, 10000);

    // Check periodically
    const intervalId = window.setInterval(checkGoogleMaps, 100);
    checkGoogleMaps(); // Check immediately

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (map && places.length > 0) {
      // Fit bounds to show all places
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(new google.maps.LatLng(startLocation.lat, startLocation.lng));
      places.forEach((place) => {
        bounds.extend(new google.maps.LatLng(place.lat, place.lng));
      });
      map.fitBounds(bounds);
    }
  }, [map, places, startLocation]);

  // API 키가 없는 경우
  if (!env.googleMapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Google Maps API 키가 필요합니다
          </h3>
          <p className="text-gray-600 mb-4">
            지도를 표시하려면 Google Maps API 키를 설정해주세요.
          </p>
          <div className="bg-white border border-gray-300 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-2">설정 방법:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Google Cloud Console
                </a>
                에서 API 키 발급
              </li>
              <li>Maps JavaScript API, Places API, Directions API 활성화</li>
              <li>
                <code className="bg-gray-100 px-1 py-0.5 rounded">frontend/.env</code> 파일 생성
              </li>
              <li>
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  VITE_GOOGLE_MAPS_API_KEY=your_key
                </code>
                추가
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    console.error("Google Maps 로드 에러:", loadError);
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-900 mb-3">
            지도를 불러올 수 없습니다
          </h3>
          <p className="text-red-600 text-sm mb-4">
            {loadError.message || "알 수 없는 오류가 발생했습니다."}
          </p>
          <div className="bg-white border border-red-300 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-2">확인사항:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>API 키가 올바른지 확인</li>
              <li>Maps JavaScript API 활성화</li>
              <li>Places API 활성화</li>
              <li>Directions API 활성화</li>
              <li>API 키의 제한 설정 확인 (HTTP 리퍼러)</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (loadTimeout) {
    return (
      <div className="flex items-center justify-center h-full bg-yellow-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⏱️</div>
          <h3 className="text-xl font-bold text-yellow-900 mb-3">
            지도 로딩 시간 초과
          </h3>
          <p className="text-yellow-700 text-sm mb-4">
            Google Maps API를 불러오는 데 시간이 너무 오래 걸리고 있습니다.
          </p>
          <div className="bg-white border border-yellow-300 rounded-lg p-4 text-left mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">가능한 원인:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>API 키가 유효하지 않음</li>
              <li>필요한 API가 활성화되지 않음</li>
              <li>API 키 제한 설정 문제</li>
              <li>네트워크 연결 문제</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              새로고침
            </button>
            <button
              onClick={() => window.open("https://console.cloud.google.com/", "_blank")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Google Cloud Console 열기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">지도 로딩 중...</p>
          <p className="text-gray-400 text-xs mt-2">API 키: {env.googleMapsApiKey ? "설정됨" : "없음"}</p>
        </div>
      </div>
    );
  }

  // Create path for polyline
  const path = [
    startLocation,
    ...places.map((p) => ({ lat: p.lat, lng: p.lng })),
  ];

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={13}
      onLoad={(map) => {
        setMap(map);
        onMapLoad?.(map);
      }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        mapId: "TRIP_FLOW_MAP", // Required for AdvancedMarkerElement
      }}
    >
      {/* Start location marker (blue circle) */}
      <AdvancedMarker
        map={map}
        position={startLocation}
        title="시작 위치"
        zIndex={1}
      />

      {/* Place markers with numbers */}
      {places.map((place, index) => (
        <AdvancedMarker
          key={place.id}
          map={map}
          position={{ lat: place.lat, lng: place.lng }}
          label={`${index + 1}`}
          title={place.name}
          zIndex={2 + index}
        />
      ))}

      {/* Route polyline */}
      {path.length > 1 && (
        <Polyline
          path={path}
          options={{
            strokeColor: "#4285F4",
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}
    </GoogleMap>
  );
};
