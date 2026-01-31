import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, Place, Location, RouteSummary, RouteSegment } from "../types/trip";
import { v4 as uuidv4 } from "uuid";

interface TripState {
  currentTrip: Trip | null;

  // Actions
  createTrip: (title: string, city: string, cityLocation: Location, startDate?: string) => void;
  addPlace: (place: Omit<Place, "id" | "order">) => void;
  removePlace: (placeId: string) => void;
  updatePlaceOrder: (places: Place[]) => void;
  updatePlaceDay: (placeId: string, day: number) => void;
  addDay: () => void;
  removeDay: (day: number) => void;
  setDayTransitionOwnership: (fromDay: number, toDay: number, owningDay: number) => void;
  updateRouteSummary: (summary: RouteSummary) => void;
  updateRouteSegments: (segments: RouteSegment[]) => void;
  updateDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  optimizePlaces: (places: Place[], summary: RouteSummary) => void;
  clearTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      currentTrip: null,

      createTrip: (title, city, cityLocation, startDate) => {
        const newTrip: Trip = {
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ currentTrip: newTrip });
      },

      addPlace: (placeData) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        // Check max limit (10 places)
        if (currentTrip.places.length >= 10) {
          alert("최대 10개의 장소만 추가할 수 있습니다.");
          return;
        }

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

        set({
          currentTrip: {
            ...currentTrip,
            places: [...currentTrip.places, newPlace],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      removePlace: (placeId) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            places: currentTrip.places.filter((p) => p.id !== placeId),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updatePlaceOrder: (places) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            places,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updatePlaceDay: (placeId, day) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        const updatedPlaces = currentTrip.places.map((place) =>
          place.id === placeId ? { ...place, day } : place
        );

        set({
          currentTrip: {
            ...currentTrip,
            places: updatedPlaces,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      addDay: () => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        const currentTotalDays = currentTrip.totalDays || 1;
        set({
          currentTrip: {
            ...currentTrip,
            totalDays: currentTotalDays + 1,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      removeDay: (day) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

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

        set({
          currentTrip: {
            ...currentTrip,
            places: adjustedPlaces,
            totalDays: currentTotalDays - 1,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setDayTransitionOwnership: (fromDay, toDay, owningDay) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        const key = `${fromDay}-${toDay}`;
        const newOwnership = { ...(currentTrip.dayTransitionOwnership || {}), [key]: owningDay };

        set({
          currentTrip: {
            ...currentTrip,
            dayTransitionOwnership: newOwnership,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateRouteSummary: (summary) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            routeSummary: summary,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateRouteSegments: (segments) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            routeSegments: segments,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateDirectionsResult: (result) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            directionsResult: result,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      optimizePlaces: (places, summary) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({
          currentTrip: {
            ...currentTrip,
            places,
            routeSummary: summary,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      clearTrip: () => {
        set({ currentTrip: null });
      },
    }),
    {
      name: "trip-storage", // localStorage key
      partialize: (state) => ({
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              directionsResult: undefined, // Don't persist DirectionsResult (can't be serialized)
            }
          : null,
      }),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // Migrate from old version to new version
        if (persistedState?.currentTrip) {
          const trip = persistedState.currentTrip;
          
          // Version 0 -> 1: Migrate startLocation to cityLocation
          if (version < 1) {
            if (trip.startLocation && !trip.cityLocation) {
              trip.cityLocation = trip.startLocation;
              delete trip.startLocation;
            }
          }
          
          // Version 1 -> 2: Add day to places if missing
          if (version < 2) {
            if (trip.places && Array.isArray(trip.places)) {
              trip.places = trip.places.map((place: any) => ({
                ...place,
                day: place.day || 1, // Default to day 1
              }));
            }
            
            // Add startDate if missing (default to today)
            if (!trip.startDate) {
              trip.startDate = new Date().toISOString().split("T")[0];
            }
          }
          
          // Version 2 -> 3: Add totalDays
          if (version < 3) {
            if (!trip.totalDays) {
              // Calculate totalDays from existing places
              const maxDay = trip.places && trip.places.length > 0
                ? Math.max(...trip.places.map((p: any) => p.day || 1))
                : 1;
              trip.totalDays = maxDay;
            }
          }
        }
        return persistedState;
      },
    }
  )
);
