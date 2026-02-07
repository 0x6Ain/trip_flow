import { apiClient } from "../api";

/**
 * Trip 요약 정보 타입
 */
export interface TripSummary {
  id: number;
  title: string;
  city: string;
  startDate: string | null;
  totalDays: number;
  startLocation: {
    lat: number;
    lng: number;
  };
  members: Array<{
    id: number;
    email: string;
    displayName: string;
    role: "owner" | "editor" | "viewer";
  }>;
}

/**
 * Day 상세 정보 타입
 */
export interface DayDetail {
  tripId: number;
  title: string;
  day: number;
  date: string | null;
  events: Array<{
    id: number;
    name: string;
    placeId: string;
    location: {
      lat: number;
      lng: number;
    };
    time: string | null;
    durationMin: number | null;
    memo: string;
    dayOrder: string;
    nextRoute: {
      distanceKm: number;
      durationMin: number;
      travelMode: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";
      polyline?: string;
      departureTime?: string;
      cost?: number;
      currency?: string;
    } | null;
  }>;
}

/**
 * Trip 요약 조회
 * GET /trips/{id}/
 */
export const getTripSummary = async (tripId: number): Promise<TripSummary> => {
  const response = await apiClient.get(`/trips/${tripId}/`);
  return response.data;
};

/**
 * Day 상세 조회
 * GET /trips/{id}/days?day={day}
 */
export const getDayDetail = async (
  tripId: number,
  day: number,
): Promise<DayDetail> => {
  const response = await apiClient.get(`/trips/${tripId}/days`, {
    params: { day },
  });
  return response.data;
};

/**
 * Trip 생성
 * POST /trips/
 */
export interface CreateTripRequest {
  title: string;
  city: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  startDate?: string;
  totalDays?: number;
}

export const createTrip = async (
  data: CreateTripRequest,
): Promise<TripSummary> => {
  const response = await apiClient.post("/trips/", data);
  return response.data;
};

/**
 * Trip 수정
 * PATCH /trips/{id}/
 */
export interface UpdateTripRequest {
  title?: string;
  startDate?: string;
  totalDays?: number;
}

export const updateTrip = async (
  tripId: number,
  data: UpdateTripRequest,
): Promise<TripSummary> => {
  const response = await apiClient.patch(`/trips/${tripId}/`, data);
  return response.data;
};

/**
 * Trip 삭제
 * DELETE /trips/{id}/
 */
export const deleteTrip = async (tripId: number): Promise<void> => {
  await apiClient.delete(`/trips/${tripId}/`);
};

/**
 * Trip 목록 조회
 * GET /trips/
 */
export const getTripList = async (): Promise<TripSummary[]> => {
  const response = await apiClient.get("/trips/");
  return response.data;
};

/**
 * Event 추가
 * POST /trips/{tripId}/events/
 */
export interface CreateEventRequest {
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
  day?: number;
  startTime?: string;
  durationMin?: number;
  memo?: string;
}

export interface EventResponse {
  id: number;
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
  day: number;
  dayOrder: string;
  globalOrder: number;
  startTime: string | null;
  durationMin: number | null;
  memo: string;
}

export const createEvent = async (
  tripId: number,
  data: CreateEventRequest,
): Promise<EventResponse> => {
  const response = await apiClient.post(`/trips/${tripId}/events/`, data);
  return response.data;
};

/**
 * Event 업데이트
 * PATCH /trips/{tripId}/events/{eventId}/
 */
export interface UpdateEventRequest {
  startTime?: string;
  durationMin?: number;
  memo?: string;
  cost?: number;
  currency?: string;
}

export const updateEvent = async (
  tripId: number,
  eventId: number,
  data: UpdateEventRequest,
): Promise<EventResponse> => {
  const response = await apiClient.patch(
    `/trips/${tripId}/events/${eventId}/`,
    data,
  );
  return response.data;
};

/**
 * Events 순서 변경
 * PATCH /trips/{tripId}/events/reorder/
 */
export interface ReorderEventsRequest {
  events: Array<{
    id: number;
    order: number;
    day?: number;
  }>;
  recalculateRoutes?: boolean;
}

export interface ReorderEventsResponse {
  events: EventResponse[];
  segments: Array<{
    id: number;
    fromEventId: number;
    toEventId: number;
    durationMin: number;
    distanceKm: number;
    polyline?: string;
    travelMode?: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";
    departureTime?: string;
  }>;
  routeSummary: {
    totalDurationMin: number;
    totalDistanceKm: number;
  };
}

export const reorderEvents = async (
  tripId: number,
  data: ReorderEventsRequest,
): Promise<ReorderEventsResponse> => {
  const response = await apiClient.patch(
    `/trips/${tripId}/events/reorder/`,
    data,
  );
  return response.data;
};

/**
 * Event 삭제
 * DELETE /trips/{tripId}/events/{eventId}/
 */
export const deleteEvent = async (
  tripId: number,
  eventId: number,
): Promise<void> => {
  await apiClient.delete(`/trips/${tripId}/events/${eventId}/`);
};

/**
 * 경로 정보 업데이트 (이동 수단, 출발 시간, 비용)
 * PATCH /trips/{tripId}/events/{eventId}/route/
 */
export const updateRoute = async (
  tripId: number,
  eventId: number,
  data: {
    travelMode?: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING";
    departureTime?: string;
    cost?: number;
    currency?: string;
  },
): Promise<DayDetail> => {
  const response = await apiClient.patch(
    `/trips/${tripId}/events/${eventId}/route/`,
    data,
  );
  return response.data;
};

/**
 * 경로 이동 수단 변경 (하위 호환성을 위한 래퍼)
 * PATCH /trips/{tripId}/events/{eventId}/route/
 */
export const updateRouteTravelMode = async (
  tripId: number,
  eventId: number,
  travelMode: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING",
): Promise<DayDetail> => {
  return updateRoute(tripId, eventId, { travelMode });
};

/**
 * Day 추가 (totalDays 증가)
 * PATCH /trips/{tripId}/
 */
export const addDay = async (tripId: number): Promise<TripSummary> => {
  // 현재 trip 정보를 먼저 가져와서 totalDays를 증가시킴
  const currentTrip = await getTripSummary(tripId);
  const response = await apiClient.patch(`/trips/${tripId}/`, {
    totalDays: currentTrip.totalDays + 1,
  });
  return response.data;
};

/**
 * Day 삭제 (해당 Day의 모든 이벤트 삭제 + totalDays 감소)
 * DELETE events -> PATCH /trips/{tripId}/
 */
export const removeDay = async (
  tripId: number,
  day: number,
): Promise<TripSummary> => {
  // 1. 해당 Day의 이벤트 목록 조회
  const dayDetail = await getDayDetail(tripId, day);

  // 2. 해당 Day의 모든 이벤트 삭제
  await Promise.all(
    dayDetail.events.map((event) => deleteEvent(tripId, event.id)),
  );

  // 3. totalDays 감소
  const currentTrip = await getTripSummary(tripId);
  const response = await apiClient.patch(`/trips/${tripId}/`, {
    totalDays: Math.max(1, currentTrip.totalDays - 1), // 최소 1일 유지
  });
  return response.data;
};

/**
 * 공유 응답 타입
 */
export interface ShareResponse {
  shareId: string;
  shareUrl: string;
  metadata: {
    title: string;
    description: string;
    image: string | null;
  };
  isPublic: boolean;
  sharedAt: string;
}

/**
 * Trip 공유 URL 생성
 * POST /trips/{id}/share/
 */
export const shareTrip = async (tripId: number): Promise<ShareResponse> => {
  const response = await apiClient.post(`/trips/${tripId}/share/`);
  return response.data;
};

/**
 * 공유 ID로 Trip 조회 (공개 API)
 * GET /shared-trips/{shareId}/
 */
export const getTripByShareId = async (shareId: string): Promise<TripSummary> => {
  const response = await apiClient.get(`/shared-trips/${shareId}/`);
  return response.data;
};

/**
 * 공유 ID로 Day 상세 조회 (공개 API)
 * GET /shared-trips/{shareId}/days?day={day}
 */
export const getDayDetailByShareId = async (
  shareId: string,
  day: number,
): Promise<DayDetail> => {
  const response = await apiClient.get(`/shared-trips/${shareId}/days/`, {
    params: { day },
  });
  return response.data;
};

/**
 * 공유 ID로 여행에 참여하기
 * POST /shared-trips/{shareId}/members/
 */
export interface JoinTripResponse {
  tripId: number;
  message: string;
  role: string;
  isNewMember: boolean;
}

export const joinTripByShareId = async (shareId: string): Promise<JoinTripResponse> => {
  const response = await apiClient.post(`/shared-trips/${shareId}/members/`);
  return response.data;
};
