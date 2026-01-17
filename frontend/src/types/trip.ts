/**
 * Trip Flow MVP - Type Definitions
 * Based on spec.md
 */

export type UserType = "GUEST" | "USER";

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
}

export interface RouteSummary {
  totalDurationMin: number;
  totalDistanceKm: number;
}

export interface Trip {
  id: string; // short id for sharing
  ownerType: UserType;
  title: string;
  city: string;
  startLocation: Location;
  places: Place[];
  routeSummary: RouteSummary;
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
