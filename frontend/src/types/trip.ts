/**
 * Trip Flow MVP - Type Definitions
 * Based on spec.md
 */

export type UserType = "GUEST" | "USER";

export type TravelMode = "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";

export type Currency = "KRW" | "USD" | "JPY" | "EUR" | "CNY" | "GBP" | "AUD" | "CAD" | "THB" | "VND";

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  id: string; // internal uuid
  placeId: string; // Google Places ID
  name: string;
  lat: number;
  lng: number;
  order: number; // float for drag & drop / insertion
  day?: number; // which day of the trip (1-based)
  visitTime?: string; // HH:MM format (24-hour)
  durationMin?: number; // How long to stay at this place
  cost?: number; // Cost amount (default 0)
  currency?: Currency; // Currency (default KRW)
  memo?: string; // User notes for this place
}

export interface RouteSummary {
  totalDurationMin: number;
  totalDistanceKm: number;
}

export interface RouteSegment {
  fromPlaceId: string;
  toPlaceId: string;
  durationMin: number;
  distanceKm: number;
  /**
   * Google Directions API encoded polyline (overview_polyline.points)
   * - 서버에서 route_segments로 내려줄 때 포함될 수 있음
   */
  polyline?: string;
  travelMode?: TravelMode;
  departureTime?: string; // HH:MM format (24-hour)
  cost?: number; // Transportation cost
  currency?: Currency; // Currency (default KRW)
}

export interface Trip {
  id: string; // short id for sharing
  ownerType: UserType;
  title: string;
  city: string;
  cityLocation: Location; // City center for map centering
  startDate?: string; // ISO date string (YYYY-MM-DD)
  totalDays?: number; // Total number of days in the trip (can be more than days with places)
  places: Place[];
  routeSummary: RouteSummary;
  routeSegments?: RouteSegment[]; // Segment-by-segment route info
  directionsResult?: google.maps.DirectionsResult | null; // for rendering actual road routes
  dayTransitionOwnership?: Record<string, number>; // key: "fromDay-toDay", value: owning day number
  travelMode?: TravelMode; // Transportation mode for route calculation
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // guest only
}

export interface RouteCache {
  fromPlaceId: string;
  toPlaceId: string;
  duration: number; // minutes
  distance: number; // km
}

export interface OptimizedResult {
  places: Place[];
  totalDuration: number;
  improvementPercent: number;
}

// Google Places API types
export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: Location;
}
