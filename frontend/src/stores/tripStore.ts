import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, Place, Location, RouteSummary, RouteSegment, TravelMode, Currency } from "../types/trip";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "./authStore";
import * as tripApi from "../services/api/tripApi";
import { apiTripToTrip } from "../services/api/converter";

/**
 * 헬퍼 함수: API 동기화와 localStorage 업데이트를 처리
 */
type ApiSyncOptions<T> = {
  apiCall: () => Promise<T>;
  onSuccess: (data: T) => void;
  onError?: (error: any) => void;
  fallback: () => void;
};

const withApiSync = async <T,>(
  shouldUseApi: boolean,
  options: ApiSyncOptions<T>
): Promise<void> => {
  if (shouldUseApi) {
    try {
      const data = await options.apiCall();
      options.onSuccess(data);
    } catch (error) {
      console.error("API call failed:", error);
      if (options.onError) {
        options.onError(error);
      }
      // API 실패 시 fallback으로 localStorage 업데이트
      options.fallback();
    }
  } else {
    // 로그인하지 않은 유저: localStorage만 업데이트
    options.fallback();
  }
};

/**
 * 헬퍼 함수: currentTrip 업데이트를 처리
 */
type UpdateTripOptions = {
  currentTrip: Trip;
  currentTripId: string;
  trips: Trip[];
  isAuthenticated: boolean;
  apiUpdate: () => Promise<any>;
  localUpdate: (trip: Trip) => Trip;
  errorMessage: string;
  set: (state: Partial<TripState>) => void;
};

const updateCurrentTrip = async (options: UpdateTripOptions): Promise<void> => {
  const { currentTrip, currentTripId, trips, isAuthenticated, apiUpdate, localUpdate, errorMessage, set } = options;
  
  await withApiSync(isAuthenticated && currentTrip.ownerType === "USER", {
    apiCall: apiUpdate,
    onSuccess: (apiTrip) => {
      const updatedTrip = apiTripToTrip(apiTrip);
      set({
        trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
        currentTrip: updatedTrip,
      });
    },
    onError: (error) => {
      alert(errorMessage);
      throw error;
    },
    fallback: () => {
      const updatedTrip = localUpdate(currentTrip);
      set({
        trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
        currentTrip: updatedTrip,
      });
    },
  });
};

interface TripState {
  trips: Trip[]; // All saved trips
  currentTripId: string | null; // ID of currently active trip
  currentTrip: Trip | null; // Computed from trips and currentTripId

  // Trip Management Actions
  createTrip: (title: string, city: string, cityLocation: Location, startDate?: string) => Promise<void>;
  loadTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => Promise<void>;
  clearTrip: () => void;
  updateStartDate: (startDate: string) => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
  migrateGuestTrips: () => Promise<{ success: number; failed: number }>;

  // Place Actions
  addPlace: (place: Omit<Place, "id" | "order">) => Promise<void>;
  removePlace: (placeId: string) => Promise<void>;
  updatePlaceOrder: (places: Place[]) => Promise<void>;
  updatePlaceDay: (placeId: string, day: number) => Promise<void>;
  updatePlaceTime: (placeId: string, visitTime: string) => Promise<void>;
  updatePlaceCost: (placeId: string, cost: number, currency: Currency) => Promise<void>;
  updatePlaceMemo: (placeId: string, memo: string) => Promise<void>;

  // Day Actions
  addDay: () => Promise<void>;
  removeDay: (day: number) => Promise<void>;
  setDayTransitionOwnership: (fromDay: number, toDay: number, owningDay: number) => void;

  // Route Actions
  updateRouteSummary: (summary: RouteSummary) => void;
  updateRouteSegments: (segments: RouteSegment[]) => void;
  updateDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  updateTravelMode: (mode: TravelMode) => Promise<void>;
  updateSegmentTravelMode: (fromPlaceId: string, toPlaceId: string, mode: TravelMode) => void;
  updateSegmentDepartureTime: (fromPlaceId: string, toPlaceId: string, departureTime: string) => void;
  optimizePlaces: (places: Place[], summary: RouteSummary) => Promise<void>;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
      currentTrip: null,

      createTrip: async (title, city, cityLocation, startDate) => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        
        // localStorage용 새 여행 데이터 생성
        const createLocalTrip = (): Trip => ({
          id: uuidv4().slice(0, 8),
          ownerType: "GUEST",
          title,
          city,
          cityLocation,
          startDate,
          totalDays: 1,
          places: [],
          routeSummary: {
            totalDurationMin: 0,
            totalDistanceKm: 0,
          },
          travelMode: "DRIVING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        await withApiSync(isAuthenticated, {
          apiCall: () => tripApi.createTrip({
            title,
            city,
            startLocation: cityLocation,
            startDate,
            totalDays: 1,
            ownerType: "USER",
          }),
          onSuccess: (apiTrip) => {
            const trip = apiTripToTrip(apiTrip);
            set((state) => ({
              trips: [...state.trips, trip],
              currentTripId: trip.id,
              currentTrip: trip,
            }));
          },
          onError: (error) => {
            alert("여행 생성에 실패했습니다.");
            throw error;
          },
          fallback: () => {
            const newTrip = createLocalTrip();
            set((state) => ({
              trips: [...state.trips, newTrip],
              currentTripId: newTrip.id,
              currentTrip: newTrip,
            }));
          },
        });
      },

      loadTrip: (tripId) => {
        const { trips } = get();
        const trip = trips.find((t) => t.id === tripId);
        if (trip) {
          // ownerType이 없는 기존 데이터 마이그레이션
          const migratedTrip = {
            ...trip,
            ownerType: trip.ownerType || (useAuthStore.getState().isAuthenticated ? "USER" : "GUEST")
          };
          
          // 마이그레이션된 데이터로 업데이트
          if (!trip.ownerType) {
            set({
              trips: trips.map((t) => (t.id === tripId ? migratedTrip : t)),
              currentTripId: tripId,
              currentTrip: migratedTrip,
            });
          } else {
            set({ currentTripId: tripId, currentTrip: migratedTrip });
          }
        }
      },

      deleteTrip: async (tripId) => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const { trips } = get();
        const trip = trips.find((t) => t.id === tripId);
        
        if (isAuthenticated && trip?.ownerType === "USER") {
          // 로그인한 유저: API로 서버에서 삭제
          try {
            await tripApi.deleteTrip(parseInt(tripId));
          } catch (error) {
            console.error("Failed to delete trip:", error);
            alert("여행 삭제에 실패했습니다.");
            throw error;
          }
        }
        
        // localStorage에서도 삭제
        set((state) => {
          const newTrips = state.trips.filter((t) => t.id !== tripId);
          const wasCurrentTrip = state.currentTripId === tripId;
          
          return {
            trips: newTrips,
            currentTripId: wasCurrentTrip ? null : state.currentTripId,
            currentTrip: wasCurrentTrip ? null : state.currentTrip,
          };
        });
      },

      clearTrip: () => {
        set({ currentTripId: null, currentTrip: null });
      },

      updateStartDate: async (startDate) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;
        
        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: () => tripApi.updateTrip(parseInt(currentTripId), { startDate }),
          localUpdate: (trip) => ({ ...trip, startDate, updatedAt: new Date().toISOString() }),
          errorMessage: "시작 날짜 업데이트에 실패했습니다.",
          set,
        });
      },

      updateTitle: async (title) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;
        
        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: () => tripApi.updateTrip(parseInt(currentTripId), { title }),
          localUpdate: (trip) => ({ ...trip, title, updatedAt: new Date().toISOString() }),
          errorMessage: "제목 업데이트에 실패했습니다.",
          set,
        });
      },

      addPlace: async (placeData) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        // Check max limit (10 places)
        if (currentTrip.places.length >= 10) {
          alert("최대 10개의 장소만 추가할 수 있습니다.");
          return;
        }

        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        console.log("🔍 addPlace 디버깅:");
        console.log("  - isAuthenticated:", isAuthenticated);
        console.log("  - currentTrip.ownerType:", currentTrip.ownerType);
        console.log("  - currentTrip.id:", currentTrip.id);
        console.log("  - Will use API:", isAuthenticated && currentTrip.ownerType === "USER");

        if (isAuthenticated && currentTrip.ownerType === "USER") {
          // 로그인한 유저: API로 서버에 추가
          console.log("✅ API를 통해 장소 추가 중...");
          try {
            // Calculate new order and day
            const lastOrder =
              currentTrip.places.length > 0
                ? Math.max(...currentTrip.places.map((p) => p.order))
                : 0;

            let targetDay = 1;
            if (currentTrip.places.length > 0) {
              const lastPlace = currentTrip.places.reduce((prev, current) => 
                (current.order > prev.order) ? current : prev
              );
              targetDay = lastPlace.day || 1;
            } else {
              targetDay = currentTrip.totalDays || 1;
            }

            const apiTrip = await tripApi.addPlace(parseInt(currentTripId), {
              placeId: placeData.placeId,
              name: placeData.name,
              lat: placeData.lat,
              lng: placeData.lng,
              order: lastOrder + 1.0,
              day: targetDay,
              visitTime: placeData.visitTime,
              durationMin: placeData.durationMin,
              cost: placeData.cost,
              currency: placeData.currency,
              memo: placeData.memo,
            });
            
            console.log("✅ API 응답 받음:", apiTrip);
            console.log("  - totalDays:", apiTrip.totalDays);
            console.log("  - places count:", apiTrip.places?.length);
            
            const updatedTrip = apiTripToTrip(apiTrip);
            console.log("✅ 변환된 Trip:", {
              id: updatedTrip.id,
              totalDays: updatedTrip.totalDays,
              placesCount: updatedTrip.places.length
            });
            
            set({
              trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
              currentTrip: updatedTrip,
            });
          } catch (error) {
            console.error("❌ API 호출 실패:", error);
            alert("장소 추가에 실패했습니다.");
            throw error;
          }
        } else {
          // 로그인하지 않은 유저: localStorage에만 저장
          console.log("📦 localStorage에만 저장 중...");
          // Calculate new order
          const lastOrder =
            currentTrip.places.length > 0
              ? Math.max(...currentTrip.places.map((p) => p.order))
              : 0;

          // Find the day of the last place (by order), or use totalDays if no places
          let targetDay = 1;
          if (currentTrip.places.length > 0) {
            // Find the place with the highest order
            const lastPlace = currentTrip.places.reduce((prev, current) => 
              (current.order > prev.order) ? current : prev
            );
            targetDay = lastPlace.day || 1;
          } else {
            // If no places yet, use totalDays (or 1 if not set)
            targetDay = currentTrip.totalDays || 1;
          }

          const newPlace: Place = {
            ...placeData,
            id: uuidv4(),
            order: lastOrder + 1.0,
            day: targetDay,
          };

          const updatedTrip = {
            ...currentTrip,
            places: [...currentTrip.places, newPlace],
            updatedAt: new Date().toISOString(),
          };

          set({
            trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
            currentTrip: updatedTrip,
          });
        }
      },

      removePlace: async (placeId) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const place = currentTrip.places.find((p) => p.id === placeId);

        if (isAuthenticated && currentTrip.ownerType === "USER" && place) {
          // 로그인한 유저: API로 서버에서 삭제
          try {
            // placeId는 프론트엔드의 UUID이므로, 백엔드 ID를 찾아야 함
            // 하지만 현재 구조에서는 백엔드 ID를 저장하지 않음
            // 임시로 placeId로 찾아서 삭제 (나중에 구조 개선 필요)
            // 현재는 Google Place ID로 찾아야 함
            const apiTrip = await tripApi.deletePlace(
              parseInt(currentTripId),
              parseInt(placeId) // 이 부분은 나중에 수정 필요
            );
            
            const updatedTrip = apiTripToTrip(apiTrip);
            set({
              trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
              currentTrip: updatedTrip,
            });
          } catch (error) {
            console.error("Failed to remove place:", error);
            // API 실패 시에도 localStorage에서는 삭제
            const updatedTrip = {
              ...currentTrip,
              places: currentTrip.places.filter((p) => p.id !== placeId),
              updatedAt: new Date().toISOString(),
            };

            set({
              trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
              currentTrip: updatedTrip,
            });
          }
        } else {
          // 로그인하지 않은 유저: localStorage에서만 삭제
          const updatedTrip = {
            ...currentTrip,
            places: currentTrip.places.filter((p) => p.id !== placeId),
            updatedAt: new Date().toISOString(),
          };

          set({
            trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
            currentTrip: updatedTrip,
          });
        }
      },

      updatePlaceOrder: async (places) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: () => {
            const placeOrders = places.map((place, index) => ({
              placeId: place.placeId,
              order: index + 1,
            }));
            return tripApi.reorderPlaces(parseInt(currentTripId), { places: placeOrders });
          },
          localUpdate: (trip) => ({ ...trip, places, updatedAt: new Date().toISOString() }),
          errorMessage: "장소 순서 업데이트에 실패했습니다.",
          set,
        });
      },

      updatePlaceDay: async (placeId, day) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        const place = currentTrip.places.find((p) => p.id === placeId);

        if (isAuthenticated && currentTrip.ownerType === "USER" && place) {
          // 로그인한 유저: API로 서버에 업데이트
          try {
            // 백엔드 ID가 필요하지만, 현재 구조에서는 없음
            // 임시로 localStorage만 업데이트 (나중에 구조 개선 필요)
            const updatedPlaces = currentTrip.places.map((p) =>
              p.id === placeId ? { ...p, day } : p
            );

            const updatedTrip = {
              ...currentTrip,
              places: updatedPlaces,
              updatedAt: new Date().toISOString(),
            };

            set({
              trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
              currentTrip: updatedTrip,
            });
          } catch (error) {
            console.error("Failed to update place day:", error);
          }
        } else {
          // 로그인하지 않은 유저: localStorage에만 저장
          const updatedPlaces = currentTrip.places.map((place) =>
            place.id === placeId ? { ...place, day } : place
          );

          const updatedTrip = {
            ...currentTrip,
            places: updatedPlaces,
            updatedAt: new Date().toISOString(),
          };

          set({
            trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
            currentTrip: updatedTrip,
          });
        }
      },

      updatePlaceTime: async (placeId, visitTime) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        // localStorage 업데이트 (로그인 여부와 관계없이)
        const updatedPlaces = currentTrip.places.map((place) =>
          place.id === placeId 
            ? { ...place, visitTime } 
            : place
        );

        const updatedTrip = {
          ...currentTrip,
          places: updatedPlaces,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });

        // 로그인한 유저는 백그라운드에서 API 호출 (비동기)
        if (isAuthenticated && currentTrip.ownerType === "USER") {
          // TODO: API 엔드포인트 추가 필요
          // 현재는 localStorage만 업데이트
        }
      },

      updatePlaceCost: async (placeId, cost, currency) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        // localStorage 업데이트 (로그인 여부와 관계없이)
        const updatedPlaces = currentTrip.places.map((place) =>
          place.id === placeId 
            ? { ...place, cost, currency } 
            : place
        );

        const updatedTrip = {
          ...currentTrip,
          places: updatedPlaces,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });

        // 로그인한 유저는 백그라운드에서 API 호출 (비동기)
        if (isAuthenticated && currentTrip.ownerType === "USER") {
          // TODO: API 엔드포인트 추가 필요
          // 현재는 localStorage만 업데이트
        }
      },

      updatePlaceMemo: async (placeId, memo) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        // localStorage 업데이트 (로그인 여부와 관계없이)
        const updatedPlaces = currentTrip.places.map((place) =>
          place.id === placeId 
            ? { ...place, memo } 
            : place
        );

        const updatedTrip = {
          ...currentTrip,
          places: updatedPlaces,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });

        // 로그인한 유저는 백그라운드에서 API 호출 (비동기)
        if (isAuthenticated && currentTrip.ownerType === "USER") {
          // TODO: API 엔드포인트 추가 필요
          // 현재는 localStorage만 업데이트
        }
      },

      addDay: async () => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const currentTotalDays = currentTrip.totalDays || 1;
        const newTotalDays = currentTotalDays + 1;

        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: () => tripApi.updateTrip(parseInt(currentTripId), { totalDays: newTotalDays }),
          localUpdate: (trip) => ({ ...trip, totalDays: newTotalDays, updatedAt: new Date().toISOString() }),
          errorMessage: "일정 추가에 실패했습니다.",
          set,
        });
      },

      removeDay: async (day) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        // Cannot remove the last day (must have at least 1 day)
        const currentTotalDays = currentTrip.totalDays || 1;
        if (currentTotalDays <= 1) {
          alert("최소 1일은 유지해야 합니다.");
          return;
        }

        // Remove all places in this day
        const filteredPlaces = currentTrip.places.filter((place) => place.day !== day);

        // Adjust day numbers for places after the removed day
        const adjustedPlaces = filteredPlaces.map((place) => ({
          ...place,
          day: place.day && place.day > day ? place.day - 1 : place.day,
        }));

        const newTotalDays = currentTotalDays - 1;

        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: async () => {
            const apiTrip = await tripApi.updateTrip(parseInt(currentTripId), { totalDays: newTotalDays });
            // TODO: 각 place를 개별적으로 삭제하거나 일괄 업데이트 API 필요
            return apiTrip;
          },
          localUpdate: (trip) => ({
            ...trip,
            places: adjustedPlaces,
            totalDays: newTotalDays,
            updatedAt: new Date().toISOString(),
          }),
          errorMessage: "일정 삭제에 실패했습니다.",
          set,
        });
      },

      setDayTransitionOwnership: (fromDay, toDay, owningDay) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const key = `${fromDay}-${toDay}`;
        const newOwnership = { ...(currentTrip.dayTransitionOwnership || {}), [key]: owningDay };

        const updatedTrip = {
          ...currentTrip,
          dayTransitionOwnership: newOwnership,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateRouteSummary: (summary) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          routeSummary: summary,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateRouteSegments: (segments) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          routeSegments: segments,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateDirectionsResult: (result) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          directionsResult: result,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateTravelMode: async (mode) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const isAuthenticated = useAuthStore.getState().isAuthenticated;

        // localStorage 업데이트 (로그인 여부와 관계없이)
        const updatedTrip = {
          ...currentTrip,
          travelMode: mode,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });

        // 로그인한 유저는 백그라운드에서 API 호출 (비동기)
        if (isAuthenticated && currentTrip.ownerType === "USER") {
          // TODO: API 엔드포인트 추가 필요
          // 현재는 localStorage만 업데이트
        }
      },

      updateSegmentTravelMode: (fromPlaceId, toPlaceId, mode) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedSegments = (currentTrip.routeSegments || []).map((segment) =>
          segment.fromPlaceId === fromPlaceId && segment.toPlaceId === toPlaceId
            ? { ...segment, travelMode: mode }
            : segment
        );

        const updatedTrip = {
          ...currentTrip,
          routeSegments: updatedSegments,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateSegmentDepartureTime: (fromPlaceId, toPlaceId, departureTime) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        // Update segment departure time
        const updatedSegments = (currentTrip.routeSegments || []).map((segment) =>
          segment.fromPlaceId === fromPlaceId && segment.toPlaceId === toPlaceId
            ? { ...segment, departureTime }
            : segment
        );

        // Calculate arrival time for the destination place
        const segment = updatedSegments.find(
          (seg) => seg.fromPlaceId === fromPlaceId && seg.toPlaceId === toPlaceId
        );

        let updatedPlaces = currentTrip.places;
        if (segment && departureTime) {
          const [hours, minutes] = departureTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + segment.durationMin;
          const arrivalHours = Math.floor(totalMinutes / 60) % 24;
          const arrivalMinutes = totalMinutes % 60;
          const arrivalTime = `${String(arrivalHours).padStart(2, '0')}:${String(arrivalMinutes).padStart(2, '0')}`;

          // Update destination place's visitTime
          updatedPlaces = currentTrip.places.map((place) =>
            place.placeId === toPlaceId ? { ...place, visitTime: arrivalTime } : place
          );
        }

        const updatedTrip = {
          ...currentTrip,
          routeSegments: updatedSegments,
          places: updatedPlaces,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      optimizePlaces: async (places, summary) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        await updateCurrentTrip({
          currentTrip,
          currentTripId,
          trips,
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          apiUpdate: () => {
            const placeOrders = places.map((place, index) => ({
              placeId: place.placeId,
              order: index + 1,
            }));
            return tripApi.reorderPlaces(parseInt(currentTripId), { places: placeOrders });
          },
          localUpdate: (trip) => ({
            ...trip,
            places,
            routeSummary: summary,
            updatedAt: new Date().toISOString(),
          }),
          errorMessage: "경로 최적화에 실패했습니다.",
          set,
        });
      },

      /**
       * 게스트 여행을 서버로 마이그레이션
       * 로그인/회원가입 후 자동으로 호출됨
       */
      migrateGuestTrips: async () => {
        const { trips } = get();
        const guestTrips = trips.filter((t) => t.ownerType === "GUEST");
        
        if (guestTrips.length === 0) {
          console.log("🔍 마이그레이션할 게스트 여행이 없습니다.");
          return { success: 0, failed: 0 };
        }

        console.log(`🚀 ${guestTrips.length}개의 게스트 여행 마이그레이션 시작...`);

        let successCount = 0;
        let failedCount = 0;

        // 각 게스트 여행을 서버로 마이그레이션
        for (let i = 0; i < guestTrips.length; i++) {
          const guestTrip = guestTrips[i];
          console.log(`\n📦 [${i + 1}/${guestTrips.length}] "${guestTrip.title}" 마이그레이션 중...`);
          
          try {
            // 1. 서버에 여행 생성
            console.log(`  ✏️ 여행 생성: ${guestTrip.places.length}개의 장소 포함`);
            const apiTrip = await tripApi.createTrip({
              title: guestTrip.title,
              city: guestTrip.city,
              startLocation: guestTrip.cityLocation,
              startDate: guestTrip.startDate,
              totalDays: guestTrip.totalDays || 1,
              ownerType: "USER",
            });
            console.log(`  ✅ 여행 생성 완료 (ID: ${apiTrip.id})`);

            // 2. 장소들을 순차적으로 서버에 추가
            let updatedApiTrip = apiTrip;
            let addedPlacesCount = 0;
            
            if (guestTrip.places.length > 0) {
              console.log(`  📍 ${guestTrip.places.length}개의 장소 추가 중...`);
              
              for (const place of guestTrip.places) {
                try {
                  console.log(`    - ${place.name} 추가 중...`);
                  updatedApiTrip = await tripApi.addPlace(apiTrip.id!, {
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
                  });
                  addedPlacesCount++;
                  console.log(`    ✅ ${place.name} 추가 완료`);
                } catch (placeError: any) {
                  console.error(`    ❌ ${place.name} 추가 실패:`, placeError.response?.data || placeError.message);
                }
              }
              console.log(`  ✅ 장소 추가 완료: ${addedPlacesCount}/${guestTrip.places.length}`);
            }

            // 3. Route segments 마이그레이션 (있는 경우)
            if (guestTrip.routeSegments && guestTrip.routeSegments.length > 0) {
              console.log(`  🛣️ ${guestTrip.routeSegments.length}개의 경로 세그먼트 추가 중...`);
              
              // TODO: Route segments API 구현 필요
              // 현재는 백엔드에 route segments API가 없으면 건너뜀
              console.log(`  ⚠️ Route segments는 places와 함께 자동 생성됩니다.`);
            }

            // 4. localStorage에서 게스트 여행 제거하고 서버 여행으로 교체
            const migratedTrip = apiTripToTrip(updatedApiTrip);
            
            set((state) => ({
              trips: [
                ...state.trips.filter((t) => t.id !== guestTrip.id),
                migratedTrip,
              ],
              // 현재 여행이 마이그레이션된 여행이면 업데이트
              currentTrip: state.currentTripId === guestTrip.id ? migratedTrip : state.currentTrip,
              currentTripId: state.currentTripId === guestTrip.id ? migratedTrip.id : state.currentTripId,
            }));

            successCount++;
            console.log(`  ✅ "${guestTrip.title}" 마이그레이션 완료!\n`);
          } catch (error: any) {
            console.error(`  ❌ "${guestTrip.title}" 마이그레이션 실패:`, error.response?.data || error.message);
            failedCount++;
          }
        }

        console.log(`\n🎉 마이그레이션 완료: 성공 ${successCount}개, 실패 ${failedCount}개`);
        return { success: successCount, failed: failedCount };
      },
    }),
    {
      name: "trip-storage", // localStorage key
      partialize: (state) => ({
        trips: state.trips.map((trip) => ({
          ...trip,
          directionsResult: undefined, // Don't persist DirectionsResult (can't be serialized)
        })),
        currentTripId: state.currentTripId,
      }),
      version: 6,
      migrate: (persistedState: any, version: number) => {
        // Version 3 -> 4: Migrate from single currentTrip to trips array
        if (version < 4) {
          if (persistedState?.currentTrip) {
            const trip = persistedState.currentTrip;
            
            // Apply old migrations to the trip
            if (trip.startLocation && !trip.cityLocation) {
              trip.cityLocation = trip.startLocation;
              delete trip.startLocation;
            }
            
            if (trip.places && Array.isArray(trip.places)) {
              trip.places = trip.places.map((place: any) => ({
                ...place,
                day: place.day || 1,
              }));
            }
            
            if (!trip.startDate) {
              trip.startDate = new Date().toISOString().split("T")[0];
            }
            
            if (!trip.totalDays) {
              const maxDay = trip.places && trip.places.length > 0
                ? Math.max(...trip.places.map((p: any) => p.day || 1))
                : 1;
              trip.totalDays = maxDay;
            }
            
            // Add default travel mode if missing
            if (!trip.travelMode) {
              trip.travelMode = "DRIVING";
            }
            
            // Migrate to new structure
            return {
              trips: [trip],
              currentTripId: trip.id,
            };
          }
          
          // No currentTrip, start fresh
          return {
            trips: [],
            currentTripId: null,
          };
        }
        
        // Version 4 -> 5: Add travelMode to existing trips
        if (version < 5 && persistedState?.trips) {
          persistedState.trips = persistedState.trips.map((trip: any) => ({
            ...trip,
            travelMode: trip.travelMode || "DRIVING",
          }));
        }
        
        // Version 5 -> 6: Add ownerType to existing trips
        if (persistedState?.trips) {
          persistedState.trips = persistedState.trips.map((trip: any) => {
            if (!trip.ownerType) {
              // ID가 숫자라면 서버에서 가져온 것으로 간주
              const isServerTrip = !isNaN(parseInt(trip.id));
              return {
                ...trip,
                ownerType: isServerTrip ? "USER" : "GUEST",
              };
            }
            return trip;
          });
        }
        
        return persistedState;
      },
    }
  )
);
