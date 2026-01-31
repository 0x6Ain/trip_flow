/**
 * Trip API 서비스
 */

import { apiClient } from "../api";
import type {
  ApiTrip,
  CreateTripRequest,
  UpdateTripRequest,
  AddPlaceRequest,
  UpdatePlaceRequest,
  ReorderPlacesRequest,
  SaveRouteSegmentRequest,
} from "./types";

/**
 * Trip 생성
 */
export const createTrip = async (data: CreateTripRequest): Promise<ApiTrip> => {
  const response = await apiClient.post<ApiTrip>("/trips/", data);
  return response.data;
};

/**
 * 모든 Trip 목록 조회
 */
export const getTrips = async (): Promise<ApiTrip[]> => {
  const response = await apiClient.get<ApiTrip[] | { results: ApiTrip[] }>("/trips/");
  // DRF pagination 처리
  const data = response.data;
  return Array.isArray(data) ? data : (data.results || []);
};

/**
 * Trip 조회
 */
export const getTrip = async (tripId: number): Promise<ApiTrip> => {
  const response = await apiClient.get<ApiTrip>(`/trips/${tripId}/`);
  return response.data;
};

/**
 * Trip 업데이트
 */
export const updateTrip = async (
  tripId: number,
  data: UpdateTripRequest
): Promise<ApiTrip> => {
  const response = await apiClient.patch<ApiTrip>(`/trips/${tripId}/`, data);
  return response.data;
};

/**
 * Trip 삭제
 */
export const deleteTrip = async (tripId: number): Promise<void> => {
  await apiClient.delete(`/trips/${tripId}/`);
};

/**
 * Place 추가
 */
export const addPlace = async (
  tripId: number,
  data: AddPlaceRequest
): Promise<ApiTrip> => {
  const response = await apiClient.post<ApiTrip>(
    `/trips/${tripId}/places/`,
    data
  );
  return response.data;
};

/**
 * Place 업데이트
 */
export const updatePlace = async (
  tripId: number,
  placeId: number,
  data: UpdatePlaceRequest
): Promise<ApiTrip> => {
  const response = await apiClient.patch<ApiTrip>(
    `/trips/${tripId}/places/${placeId}/`,
    data
  );
  return response.data;
};

/**
 * Place 삭제
 */
export const deletePlace = async (
  tripId: number,
  placeId: number
): Promise<ApiTrip> => {
  const response = await apiClient.delete<ApiTrip>(
    `/trips/${tripId}/places/${placeId}/`
  );
  return response.data;
};

/**
 * Place 순서 변경
 */
export const reorderPlaces = async (
  tripId: number,
  data: ReorderPlacesRequest
): Promise<ApiTrip> => {
  const response = await apiClient.post<ApiTrip>(
    `/trips/${tripId}/places/reorder/`,
    data
  );
  return response.data;
};

/**
 * RouteSegment 저장
 */
export const saveRouteSegment = async (
  tripId: number,
  data: SaveRouteSegmentRequest
): Promise<ApiTrip> => {
  const response = await apiClient.post<ApiTrip>(
    `/trips/${tripId}/route-segments/`,
    data
  );
  return response.data;
};

/**
 * RouteSegment 업데이트
 */
export const updateRouteSegment = async (
  tripId: number,
  segmentId: number,
  data: Partial<SaveRouteSegmentRequest>
): Promise<ApiTrip> => {
  const response = await apiClient.patch<ApiTrip>(
    `/trips/${tripId}/route-segments/${segmentId}/`,
    data
  );
  return response.data;
};

/**
 * RouteSegment 삭제
 */
export const deleteRouteSegment = async (
  tripId: number,
  segmentId: number
): Promise<ApiTrip> => {
  const response = await apiClient.delete<ApiTrip>(
    `/trips/${tripId}/route-segments/${segmentId}/`
  );
  return response.data;
};
