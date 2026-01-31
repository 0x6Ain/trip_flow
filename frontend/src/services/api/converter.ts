/**
 * 프론트엔드와 백엔드 데이터 타입 간 변환 유틸리티
 */

import type { Trip, Place, RouteSegment } from "../../types/trip";
import type { ApiTrip, ApiPlace, ApiRouteSegment } from "./types";

/**
 * 백엔드 Trip을 프론트엔드 Trip으로 변환
 */
export const apiTripToTrip = (apiTrip: ApiTrip): Trip => {
  // places의 order와 id를 매핑
  const placeIdMap = new Map<number, string>();
  const places: Place[] = (apiTrip.places || []).map((apiPlace) => {
    const frontendId = `place-${apiPlace.id || Date.now()}-${Math.random()}`;
    if (apiPlace.id) {
      placeIdMap.set(apiPlace.id, frontendId);
    }
    
    return {
      id: frontendId,
      placeId: apiPlace.placeId,
      name: apiPlace.name,
      lat: apiPlace.lat,
      lng: apiPlace.lng,
      order: apiPlace.order,
      day: apiPlace.day,
      visitTime: apiPlace.visitTime,
      durationMin: apiPlace.durationMin,
      cost: apiPlace.cost,
      currency: apiPlace.currency as any,
      memo: apiPlace.memo,
    };
  });

  // RouteSegments 변환 (백엔드 Place ID -> 프론트엔드 Google Place ID)
  const routeSegments: RouteSegment[] = (apiTrip.routeSegments || []).map((apiSegment) => {
    const fromPlace = apiTrip.places.find((p) => p.id === apiSegment.fromPlaceId);
    const toPlace = apiTrip.places.find((p) => p.id === apiSegment.toPlaceId);
    
    return {
      fromPlaceId: fromPlace?.placeId || "",
      toPlaceId: toPlace?.placeId || "",
      durationMin: apiSegment.durationMin,
      distanceKm: apiSegment.distanceKm,
      travelMode: apiSegment.travelMode,
      departureTime: apiSegment.departureTime,
    };
  });

  return {
    id: apiTrip.id?.toString() || "",
    ownerType: apiTrip.ownerType,
    title: apiTrip.title,
    city: apiTrip.city,
    cityLocation: apiTrip.startLocation || { lat: 0, lng: 0 },
    startDate: apiTrip.startDate,
    totalDays: apiTrip.totalDays || 1,
    places,
    routeSegments,
    routeSummary: apiTrip.routeSummary || {
      totalDurationMin: 0,
      totalDistanceKm: 0,
    },
    travelMode: "DRIVING", // Default travel mode (not stored in backend)
    createdAt: apiTrip.createdAt || new Date().toISOString(),
    updatedAt: apiTrip.updatedAt || new Date().toISOString(),
    expiresAt: apiTrip.expiresAt,
  };
};

/**
 * 프론트엔드 Trip을 백엔드 Trip으로 변환
 */
export const tripToApiTrip = (trip: Trip): Partial<ApiTrip> => {
  // 백엔드에서 ID를 부여하므로, placeId만 사용
  const places: Partial<ApiPlace>[] = trip.places.map((place) => ({
    placeId: place.placeId,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    order: place.order,
    day: place.day,
    visitTime: place.visitTime,
    durationMin: place.durationMin,
    cost: place.cost,
    currency: place.currency,
    memo: place.memo,
  }));

  return {
    ownerType: trip.ownerType,
    title: trip.title,
    city: trip.city,
    startLocation: trip.cityLocation,
    startDate: trip.startDate,
    totalDays: trip.totalDays,
    places: places as ApiPlace[],
    routeSummary: trip.routeSummary,
  };
};

/**
 * 프론트엔드 Place를 백엔드 AddPlaceRequest로 변환
 */
export const placeToAddPlaceRequest = (place: Place) => {
  return {
    placeId: place.placeId,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    day: place.day,
    visitTime: place.visitTime,
    durationMin: place.durationMin,
    cost: place.cost,
    currency: place.currency,
    memo: place.memo,
  };
};
