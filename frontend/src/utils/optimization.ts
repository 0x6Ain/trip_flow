import type { Place, Location, OptimizedResult } from "../types/trip";
import { calculateRoute } from "../services/googleMapsService";

/**
 * Nearest Neighbor algorithm for route optimization
 */
export const nearestNeighborOptimization = async (
  startLocation: Location,
  places: Place[]
): Promise<Place[]> => {
  if (places.length <= 1) return places;

  const optimized: Place[] = [];
  const remaining = [...places];
  let currentLocation = startLocation;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    // Find nearest place
    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(currentLocation, {
        lat: remaining[i].lat,
        lng: remaining[i].lng,
      });

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentLocation = { lat: nearest.lat, lng: nearest.lng };
  }

  return optimized;
};

/**
 * 2-opt swap optimization
 */
export const twoOptSwap = async (
  startLocation: Location,
  places: Place[],
  iterations: number = 2
): Promise<Place[]> => {
  if (places.length <= 2) return places;

  let currentRoute = [...places];
  let improved = true;
  let iterCount = 0;

  while (improved && iterCount < iterations) {
    improved = false;
    iterCount++;

    for (let i = 0; i < currentRoute.length - 1; i++) {
      for (let j = i + 2; j < currentRoute.length; j++) {
        const newRoute = twoOptReverse(currentRoute, i, j);
        const currentDistance = await calculateRouteDistance(startLocation, currentRoute);
        const newDistance = await calculateRouteDistance(startLocation, newRoute);

        if (newDistance < currentDistance) {
          currentRoute = newRoute;
          improved = true;
        }
      }
    }
  }

  return currentRoute;
};

/**
 * Reverse route segment for 2-opt
 */
const twoOptReverse = (route: Place[], i: number, j: number): Place[] => {
  const newRoute = [...route];
  const segment = newRoute.slice(i + 1, j + 1).reverse();
  newRoute.splice(i + 1, j - i, ...segment);
  return newRoute;
};

/**
 * Calculate Euclidean distance (approximation)
 */
const calculateDistance = (from: Location, to: Location): number => {
  const dx = from.lat - to.lat;
  const dy = from.lng - to.lng;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate total route distance using actual API calls
 */
const calculateRouteDistance = async (
  startLocation: Location,
  places: Place[]
): Promise<number> => {
  let totalDistance = 0;

  if (places.length === 0) return 0;

  // From start to first place
  const firstRoute = await calculateRoute(
    startLocation,
    { lat: places[0].lat, lng: places[0].lng },
    "start",
    places[0].placeId
  );
  totalDistance += firstRoute.distance;

  // Between places
  for (let i = 0; i < places.length - 1; i++) {
    const route = await calculateRoute(
      { lat: places[i].lat, lng: places[i].lng },
      { lat: places[i + 1].lat, lng: places[i + 1].lng },
      places[i].placeId,
      places[i + 1].placeId
    );
    totalDistance += route.distance;
  }

  return totalDistance;
};

/**
 * Main optimization function
 */
export const optimizeRoute = async (
  startLocation: Location,
  places: Place[]
): Promise<OptimizedResult> => {
  const originalDistance = await calculateRouteDistance(startLocation, places);

  // Step 1: Nearest Neighbor
  let optimized = await nearestNeighborOptimization(startLocation, places);

  // Step 2: 2-opt swap (1-2 iterations)
  optimized = await twoOptSwap(startLocation, optimized, 2);

  // Calculate new distance
  const newDistance = await calculateRouteDistance(startLocation, optimized);

  // Calculate duration (approximate: 1km = 12 minutes walking)
  const totalDuration = Math.ceil(newDistance * 12);

  // Update order
  optimized = optimized.map((place, index) => ({
    ...place,
    order: index + 1.0,
  }));

  const improvementPercent =
    originalDistance > 0
      ? Math.round(((originalDistance - newDistance) / originalDistance) * 100)
      : 0;

  return {
    places: optimized,
    totalDuration,
    improvementPercent,
  };
};
