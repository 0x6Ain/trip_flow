import { useEffect, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Polyline,
} from "@react-google-maps/api";
import type { Location, Place } from "../../types/trip";
import { env } from "../../config/env";
import { getDayColor } from "../PlaceList/PlaceList";
import { AdvancedMarker } from "./AdvancedMarker";
import type { DayDetail } from "../../services/api/tripApi";

interface MapViewProps {
  center: Location;
  places: Place[];
  directionsResult?: google.maps.DirectionsResult | null;
  dayDirections?: Map<number, google.maps.DirectionsResult>;
  dayTransitions?: Array<{
    from: number;
    to: number;
    directions: google.maps.DirectionsResult;
  }>;
  dayTransitionOwnership?: Record<string, number>;
  onMapLoad?: (map: google.maps.Map) => void;
  events?: DayDetail["events"]; // Server mode: events with nextRoute.polyline
  currentDay?: number; // Server mode: day number for color coding
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export const MapView = ({
  center,
  places,
  directionsResult,
  dayDirections,
  dayTransitions,
  dayTransitionOwnership,
  onMapLoad,
  events,
  currentDay,
}: MapViewProps) => {
  console.log("🗺️ MapView 렌더링:", {
    hasEvents: !!events,
    eventsCount: events?.length,
    placesCount: places?.length,
    currentDay,
  });

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
      // Fit bounds to show all places and routes
      const bounds = new google.maps.LatLngBounds();
      
      // Add all place markers to bounds
      places.forEach((place) => {
        bounds.extend(new google.maps.LatLng(place.lat, place.lng));
      });

      // If we have events with polylines, include route points too
      if (events && google.maps.geometry?.encoding?.decodePath) {
        events.forEach((event) => {
          if (event.nextRoute?.polyline) {
            try {
              const path = google.maps.geometry.encoding.decodePath(
                event.nextRoute.polyline
              );
              // Sample every 10th point to avoid too many calculations
              path.forEach((point, idx) => {
                if (idx % 10 === 0) {
                  bounds.extend(point);
                }
              });
            } catch (error) {
              console.error("Failed to include polyline in bounds:", error);
            }
          }
        });
      }

      // Apply bounds with padding
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });
    }
  }, [map, places, events]);

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
            <p className="text-sm font-semibold text-gray-700 mb-2">
              설정 방법:
            </p>
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
                <code className="bg-gray-100 px-1 py-0.5 rounded">
                  frontend/.env
                </code>{" "}
                파일 생성
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
            <p className="text-sm font-semibold text-gray-700 mb-2">
              확인사항:
            </p>
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
            <p className="text-sm font-semibold text-gray-700 mb-2">
              가능한 원인:
            </p>
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
              onClick={() =>
                window.open("https://console.cloud.google.com/", "_blank")
              }
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
          <p className="text-gray-400 text-xs mt-2">
            API 키: {env.googleMapsApiKey ? "설정됨" : "없음"}
          </p>
        </div>
      </div>
    );
  }

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
        mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
      }}
    >
      {/* Place markers with order numbers */}
      {places.map((place, index) => {
        const dayColor = getDayColor(place.day || 1);
        return (
          <AdvancedMarker
            key={place.id}
            map={map}
            position={{ lat: place.lat, lng: place.lng }}
            label={`${index + 1}`}
            title={place.name}
            backgroundColor={dayColor.marker}
            zIndex={2 + index}
          />
        );
      })}

      {/* Directions routes - shows actual road routes per day with day colors */}
      {dayDirections &&
        Array.from(dayDirections.entries()).map(([day, directions]) => {
          const dayColor = getDayColor(day);
          return (
            <DirectionsRenderer
              key={`day-${day}-route`}
              directions={directions}
              options={{
                suppressMarkers: true, // We use our own custom markers
                polylineOptions: {
                  strokeColor: dayColor.marker,
                  strokeOpacity: 0.8,
                  strokeWeight: 5,
                },
              }}
            />
          );
        })}

      {/* Day-to-day transitions - shows solid lines between days */}
      {dayTransitions &&
        dayTransitions.map((transition) => {
          // Determine the owning day from dayTransitionOwnership
          const ownershipKey = `${transition.from}-${transition.to}`;
          const owningDay =
            dayTransitionOwnership?.[ownershipKey] || transition.to; // Default to destination day
          const transitionColor = getDayColor(owningDay);

          return (
            <DirectionsRenderer
              key={`transition-${transition.from}-to-${transition.to}`}
              directions={transition.directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: transitionColor.marker, // Use owning day's color
                  strokeOpacity: 0.8,
                  strokeWeight: 5,
                },
              }}
            />
          );
        })}

      {/* Fallback: single direction route if dayDirections not provided */}
      {!dayDirections && directionsResult && (
        <DirectionsRenderer
          directions={directionsResult}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#4285F4",
              strokeOpacity: 0.8,
              strokeWeight: 4,
            },
          }}
        />
      )}

      {/* Server mode: Render polylines from events[].nextRoute.polyline */}
      {events && (() => {
        console.log("🗺️ MapView events:", events?.length, "events");
        return events.map((event) => {
          console.log(`📍 Event ${event.id} (${event.name}):`, {
            location: event.location,
            hasNextRoute: !!event.nextRoute,
            hasPolyline: !!event.nextRoute?.polyline,
            polylineLength: event.nextRoute?.polyline?.length,
            nextRoute: event.nextRoute,
          });

          if (!event.nextRoute?.polyline) {
            console.log(`  ℹ️ Event ${event.id}: 마지막 이벤트 (nextRoute 없음)`);
            return null;
          }

          try {
            // Check if geometry library is loaded
            if (!google.maps.geometry?.encoding?.decodePath) {
              console.error("❌ google.maps.geometry.encoding not available");
              return null;
            }

            // Decode polyline string to LatLng array
            const path = google.maps.geometry.encoding.decodePath(
              event.nextRoute.polyline
            );
            
            const firstPoint = path[0];
            const lastPoint = path[path.length - 1];
            
            console.log(`  ✅ Event ${event.id} polyline 디코딩 성공:`, {
              totalPoints: path.length,
              start: `(${firstPoint.lat().toFixed(5)}, ${firstPoint.lng().toFixed(5)})`,
              end: `(${lastPoint.lat().toFixed(5)}, ${lastPoint.lng().toFixed(5)})`,
              eventLocation: `(${event.location.lat.toFixed(5)}, ${event.location.lng.toFixed(5)})`,
            });

            // Use day color if currentDay is provided, otherwise default blue
            const dayColor = currentDay
              ? getDayColor(currentDay)
              : { marker: "#4285F4" };

            return (
              <Polyline
                key={`event-route-${event.id}`}
                path={path}
                options={{
                  strokeColor: dayColor.marker,
                  strokeOpacity: 0.8,
                  strokeWeight: 5,
                }}
              />
            );
          } catch (error) {
            console.error(
              `❌ Failed to decode polyline for event ${event.id}:`,
              error
            );
            return null;
          }
        });
      })()}
    </GoogleMap>
  );
};
