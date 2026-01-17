import type { PlaceSearchResult, Location, RouteCache } from "../types/trip";

let placesService: google.maps.places.PlacesService | null = null;
let directionsService: google.maps.DirectionsService | null = null;

// Route cache to minimize API calls
const routeCache = new Map<string, RouteCache>();

export const initGoogleMaps = async () => {
  // Wait for google maps to be available (loaded by @react-google-maps/api)
  if (typeof google === "undefined" || !google.maps) {
    return new Promise<void>((resolve) => {
      const checkGoogle = setInterval(() => {
        if (typeof google !== "undefined" && google.maps) {
          clearInterval(checkGoogle);
          initServices();
          resolve();
        }
      }, 100);
    });
  }

  initServices();
};

const initServices = () => {
  // Initialize services
  const mapDiv = document.createElement("div");
  const map = new google.maps.Map(mapDiv);
  placesService = new google.maps.places.PlacesService(map);
  directionsService = new google.maps.DirectionsService();
};

export const searchPlaces = (
  query: string,
  location: Location
): Promise<PlaceSearchResult[]> => {
  return new Promise((resolve, reject) => {
    if (!placesService) {
      reject(new Error("Places service not initialized"));
      return;
    }

    const request: google.maps.places.TextSearchRequest = {
      query,
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: 50000, // 50km radius
    };

    placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const places: PlaceSearchResult[] = results.slice(0, 10).map((place) => ({
          placeId: place.place_id || "",
          name: place.name || "",
          formattedAddress: place.formatted_address || "",
          location: {
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
          },
        }));
        resolve(places);
      } else {
        reject(new Error(`Places search failed: ${status}`));
      }
    });
  });
};

export const calculateRoute = async (
  from: Location,
  to: Location,
  fromPlaceId?: string,
  toPlaceId?: string
): Promise<RouteCache> => {
  // Check cache first
  if (fromPlaceId && toPlaceId) {
    const cacheKey = `${fromPlaceId}-${toPlaceId}`;
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  return new Promise((resolve, reject) => {
    if (!directionsService) {
      reject(new Error("Directions service not initialized"));
      return;
    }

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(from.lat, from.lng),
      destination: new google.maps.LatLng(to.lat, to.lng),
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        const route = result.routes[0];
        const leg = route.legs[0];

        const routeData: RouteCache = {
          fromPlaceId: fromPlaceId || "",
          toPlaceId: toPlaceId || "",
          duration: Math.ceil((leg.duration?.value || 0) / 60), // seconds to minutes
          distance: parseFloat(((leg.distance?.value || 0) / 1000).toFixed(2)), // meters to km
        };

        // Cache the result
        if (fromPlaceId && toPlaceId) {
          const cacheKey = `${fromPlaceId}-${toPlaceId}`;
          routeCache.set(cacheKey, routeData);
        }

        resolve(routeData);
      } else {
        reject(new Error(`Directions request failed: ${status}`));
      }
    });
  });
};

export const calculateTotalRoute = async (
  startLocation: Location,
  places: Array<{ placeId: string; lat: number; lng: number }>
): Promise<{ totalDurationMin: number; totalDistanceKm: number }> => {
  let totalDuration = 0;
  let totalDistance = 0;

  if (places.length === 0) {
    return { totalDurationMin: 0, totalDistanceKm: 0 };
  }

  // From start location to first place
  const firstRoute = await calculateRoute(
    startLocation,
    { lat: places[0].lat, lng: places[0].lng },
    "start",
    places[0].placeId
  );
  totalDuration += firstRoute.duration;
  totalDistance += firstRoute.distance;

  // Between places
  for (let i = 0; i < places.length - 1; i++) {
    const route = await calculateRoute(
      { lat: places[i].lat, lng: places[i].lng },
      { lat: places[i + 1].lat, lng: places[i + 1].lng },
      places[i].placeId,
      places[i + 1].placeId
    );
    totalDuration += route.duration;
    totalDistance += route.distance;
  }

  return {
    totalDurationMin: totalDuration,
    totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
  };
};

export const clearRouteCache = () => {
  routeCache.clear();
};
