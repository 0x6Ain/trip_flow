import { apiClient } from "../api";
import type { Location, PlaceSearchResult } from "../../types/trip";

export interface PlacesSearchResponse {
  results: PlaceSearchResult[];
  status?: string;
  errorMessage?: string | null;
}

/**
 * 서버 프록시 장소 검색
 * GET /places/search/?query=...&lat=...&lng=...&radius=...
 */
export async function searchPlacesProxy(
  query: string,
  searchCenter?: Location,
  radius?: number
): Promise<PlaceSearchResult[]> {
  const params: Record<string, any> = { query };
  if (searchCenter) {
    params.lat = searchCenter.lat;
    params.lng = searchCenter.lng;
  }
  if (radius != null) params.radius = radius;

  const res = await apiClient.get<PlacesSearchResponse>("/places/search/", {
    params,
  });
  const status = res.data.status;
  if (status && status !== "OK" && (res.data.results || []).length === 0) {
    throw new Error(res.data.errorMessage || status);
  }
  return res.data.results || [];
}

