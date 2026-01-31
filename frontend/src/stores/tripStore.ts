import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, Place, Location, RouteSummary } from "../types/trip";
import { v4 as uuidv4 } from "uuid";

interface TripState {
  currentTrip: Trip | null;

  // Actions
  createTrip: (title: string, city: string, cityLocation: Location) => void;
  addPlace: (place: Omit<Place, "id" | "order">) => void;
  removePlace: (placeId: string) => void;
  updatePlaceOrder: (places: Place[]) => void;
  updateRouteSummary: (summary: RouteSummary) => void;
  updateDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  optimizePlaces: (places: Place[], summary: RouteSummary) => void;
  clearTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      currentTrip: null,

      createTrip: (title, city, cityLocation) => {
        const newTrip: Trip = {
          id: uuidv4().slice(0, 8),
          ownerType: "GUEST",
          title,
          city,
          cityLocation,
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

        // Check duplicate
        if (currentTrip.places.some((p) => p.placeId === placeData.placeId)) {
          return;
        }

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

        const newPlace: Place = {
          ...placeData,
          id: uuidv4(),
          order: lastOrder + 1.0,
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
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migrate from old version to new version
        if (version === 0 && persistedState?.currentTrip) {
          const trip = persistedState.currentTrip;
          // Migrate startLocation to cityLocation
          if (trip.startLocation && !trip.cityLocation) {
            trip.cityLocation = trip.startLocation;
            delete trip.startLocation;
          }
        }
        return persistedState;
      },
    }
  )
);
