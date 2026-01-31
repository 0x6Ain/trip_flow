/**
 * 백엔드 API 타입 정의
 */

export interface ApiLocation {
  lat: number;
  lng: number;
}

export interface ApiPlace {
  id?: number;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  day?: number;
  visitTime?: string; // HH:MM
  durationMin?: number;
  cost?: number;
  currency?: string;
  memo?: string;
}

export interface ApiRouteSegment {
  id?: number;
  fromPlaceId: number; // Place.id (not Google Place ID)
  toPlaceId: number; // Place.id (not Google Place ID)
  travelMode: "WALKING" | "TRANSIT" | "DRIVING" | "BICYCLING";
  durationMin: number;
  distanceKm: number;
  polyline?: string;
  departureTime?: string; // HH:MM
}

export interface ApiRouteSummary {
  totalDurationMin: number;
  totalDistanceKm: number;
}

export interface ApiTrip {
  id?: number;
  ownerType: "GUEST" | "USER";
  title: string;
  city: string;
  startLocation: ApiLocation;
  startDate?: string; // YYYY-MM-DD
  totalDays?: number;
  places: ApiPlace[];
  routeSegments?: ApiRouteSegment[];
  routeSummary: ApiRouteSummary;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
}

export interface CreateTripRequest {
  title: string;
  city: string;
  startLocation: ApiLocation;
  startDate?: string;
  totalDays?: number;
  ownerType?: "GUEST" | "USER";
}

export interface CreateTripResponse {
  trip: ApiTrip;
}

export interface UpdateTripRequest {
  title?: string;
  city?: string;
  startLocation?: ApiLocation;
  startDate?: string;
  totalDays?: number;
}

export interface AddPlaceRequest {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  order?: number;
  day?: number;
  visitTime?: string;
  durationMin?: number;
  cost?: number;
  currency?: string;
  memo?: string;
}

export interface UpdatePlaceRequest {
  name?: string;
  order?: number;
  day?: number;
  visitTime?: string;
  durationMin?: number;
  cost?: number;
  currency?: string;
  memo?: string;
}

export interface ReorderPlacesRequest {
  places: Array<{
    placeId: string;
    order: number;
  }>;
}

export interface SaveRouteSegmentRequest {
  fromPlaceId: number;
  toPlaceId: number;
  travelMode: "WALKING" | "TRANSIT" | "DRIVING" | "BICYCLING";
  durationMin: number;
  distanceKm: number;
  polyline?: string;
  departureTime?: string;
}
