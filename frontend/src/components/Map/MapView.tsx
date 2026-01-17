import { useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import type { Location, Place } from "../../types/trip";

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

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export const MapView = ({ center, startLocation, places, onMapLoad }: MapViewProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

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
  if (!apiKey) {
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
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-900 mb-2">
            지도를 불러올 수 없습니다
          </h3>
          <p className="text-red-600 text-sm">
            API 키가 올바른지, API가 활성화되어 있는지 확인해주세요.
          </p>
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
      }}
    >
      {/* Start location marker (special icon) */}
      <Marker
        position={startLocation}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }}
        title="시작 위치"
      />

      {/* Place markers with numbers */}
      {places.map((place, index) => (
        <Marker
          key={place.id}
          position={{ lat: place.lat, lng: place.lng }}
          label={{
            text: `${index + 1}`,
            color: "#ffffff",
            fontWeight: "bold",
          }}
          title={place.name}
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
