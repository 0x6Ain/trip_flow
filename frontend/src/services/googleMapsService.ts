import type { PlaceSearchResult, Location, RouteCache } from "../types/trip";

let directionsService: google.maps.DirectionsService | null = null;
let Place: any = null;

// Route cache to minimize API calls
const routeCache = new Map<string, RouteCache>();

// Detect language from input text
const detectLanguage = (text: string): string => {
  if (!text) return "en";

  // Count characters by language
  const hasKorean = /[\u3131-\u3163\uac00-\ud7a3]/.test(text);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const hasCyrillic = /[\u0400-\u04ff]/.test(text);
  const hasGreek = /[\u0370-\u03ff]/.test(text);
  const hasThai = /[\u0e00-\u0e7f]/.test(text);
  const hasHebrew = /[\u0590-\u05ff]/.test(text);

  // Return most likely language
  if (hasKorean) return "ko";
  if (hasJapanese) return "ja";
  if (hasChinese) return "zh";
  if (hasArabic) return "ar";
  if (hasCyrillic) return "ru";
  if (hasGreek) return "el";
  if (hasThai) return "th";
  if (hasHebrew) return "he";

  // Check for common European languages by common words/patterns
  const lowerText = text.toLowerCase();
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(lowerText)) {
    // French, Spanish, Portuguese, etc.
    if (/^(le|la|les|un|une|des|de|du)\s/i.test(text)) return "fr";
    if (/^(el|la|los|las|un|una)\s/i.test(text)) return "es";
    if (/^(o|a|os|as|um|uma)\s/i.test(text)) return "pt";
    if (/^(il|lo|la|i|gli|le|un|uno|una)\s/i.test(text)) return "it";
    if (/^(der|die|das|den|dem|des|ein|eine)\s/i.test(text)) return "de";
  }

  // Default to English
  return "en";
};

export const initGoogleMaps = async () => {
  // Wait for google maps to be available (loaded by @react-google-maps/api)
  if (typeof google === "undefined" || !google.maps) {
    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds (100ms * 100)

      const checkGoogle = setInterval(() => {
        attempts++;

        if (typeof google !== "undefined" && google.maps) {
          clearInterval(checkGoogle);
          initServices();
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGoogle);
          reject(new Error("Google Maps API 로드 타임아웃"));
        }
      }, 100);
    });
  }

  await initServices();
};

const initServices = async () => {
  // Initialize Directions service
  directionsService = new google.maps.DirectionsService();

  // Load new Places API library
  try {
    // @ts-ignore - Dynamic import of new Places API
    const placesLib: any = await google.maps.importLibrary("places");
    Place = placesLib.Place;
  } catch (error) {
    console.error("Failed to load Places library:", error);
  }
};

export interface CityAutocompleteResult {
  description: string;
  placeId: string;
}

export const searchCityAutocomplete = async (
  input: string
): Promise<CityAutocompleteResult[]> => {
  if (!input.trim()) {
    return [];
  }

  if (!Place) {
    throw new Error("Place API not initialized. Make sure to call initGoogleMaps() first.");
  }

  try {
    // Detect language from input text
    const detectedLanguage = detectLanguage(input);

    // Use Text Search API for comprehensive city search
    const textSearchRequest = {
      textQuery: input,
      fields: ["id", "displayName", "formattedAddress"], // Required fields
      includedType: "locality", // Only cities
      maxResultCount: 20, // Get up to 20 results
      language: detectedLanguage,
    };

    // @ts-ignore - New Places API
    const { places } = await Place.searchByText(textSearchRequest);

    if (!places || places.length === 0) {
      return [];
    }

    const cities: CityAutocompleteResult[] = places.map((place: any) => ({
      description: place.formattedAddress || place.displayName || "",
      placeId: place.id || "",
    }));

    return cities;
  } catch (error) {
    console.error("City search failed:", error);
    throw new Error(`City search failed: ${error}`);
  }
};

export const getCityDetails = async (placeId: string): Promise<PlaceSearchResult> => {
  if (!Place) {
    throw new Error("Place API not initialized. Make sure to call initGoogleMaps() first.");
  }

  try {
    // Use browser language for details (since we don't have input text here)
    const browserLang = (navigator.language || "en").split("-")[0];

    // Use new Place API
    const place = new Place({
      id: placeId,
      requestedLanguage: browserLang,
    });

    // Fetch place details
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });

    const result: PlaceSearchResult = {
      placeId: place.id || placeId,
      name: place.displayName || "",
      formattedAddress: place.formattedAddress || "",
      location: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      },
    };

    return result;
  } catch (error) {
    console.error("Place details request failed:", error);
    throw new Error(`Place details request failed: ${error}`);
  }
};

export const searchPlaces = async (
  query: string,
  location?: Location
): Promise<PlaceSearchResult[]> => {
  if (!Place) {
    throw new Error("Place API not initialized. Make sure to call initGoogleMaps() first.");
  }

  try {
    // Detect language from query text
    const detectedLanguage = detectLanguage(query);

    // Use new Place API searchByText
    const request: any = {
      textQuery: query,
      fields: ["id", "displayName", "formattedAddress", "location"], // Required fields
      maxResultCount: 10,
      language: detectedLanguage,
    };

    // Add location bias if location is provided
    if (location && location.lat !== 0 && location.lng !== 0) {
      request.locationBias = {
        center: { lat: location.lat, lng: location.lng },
        radius: 50000, // 50km radius
      };
    }

    // @ts-ignore - New Places API
    const { places } = await Place.searchByText(request);

    if (!places || places.length === 0) {
      return [];
    }

    const results: PlaceSearchResult[] = places.map((place: any) => ({
      placeId: place.id || "",
      name: place.displayName || "",
      formattedAddress: place.formattedAddress || "",
      location: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      },
    }));

    return results;
  } catch (error) {
    console.error("Places search failed:", error);
    throw new Error(`Places search failed: ${error}`);
  }
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
  places: Array<{ placeId: string; lat: number; lng: number }>
): Promise<{ totalDurationMin: number; totalDistanceKm: number }> => {
  let totalDuration = 0;
  let totalDistance = 0;

  if (places.length === 0) {
    return { totalDurationMin: 0, totalDistanceKm: 0 };
  }

  // Only calculate routes between places (no start location)
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

export const calculateFullRoute = async (
  places: Array<{ placeId: string; lat: number; lng: number }>
): Promise<google.maps.DirectionsResult | null> => {
  if (!directionsService || places.length === 0) {
    return null;
  }

  // Need at least 2 places for a route
  if (places.length < 2) {
    return null;
  }

  return new Promise((resolve, reject) => {
    if (!directionsService) {
      reject(new Error("Directions service not initialized"));
      return;
    }

    // Create waypoints from intermediate places (exclude first and last)
    const waypoints: google.maps.DirectionsWaypoint[] = places
      .slice(1, -1)
      .map((place) => ({
        location: new google.maps.LatLng(place.lat, place.lng),
        stopover: true,
      }));

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(places[0].lat, places[0].lng),
      destination: new google.maps.LatLng(
        places[places.length - 1].lat,
        places[places.length - 1].lng
      ),
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.WALKING,
      optimizeWaypoints: false, // Keep the order as specified
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        resolve(result);
      } else {
        console.error("Directions request failed:", status);
        resolve(null);
      }
    });
  });
};

export const clearRouteCache = () => {
  routeCache.clear();
};
