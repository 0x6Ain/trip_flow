import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, Place, Location, RouteSummary, RouteSegment } from "../types/trip";
import { v4 as uuidv4 } from "uuid";

interface TripState {
  trips: Trip[]; // All saved trips
  currentTripId: string | null; // ID of currently active trip
  currentTrip: Trip | null; // Computed from trips and currentTripId

  // Trip Management Actions
  createTrip: (title: string, city: string, cityLocation: Location, startDate?: string) => void;
  loadTrip: (tripId: string) => void;
  deleteTrip: (tripId: string) => void;
  clearTrip: () => void;

  // Place Actions
  addPlace: (place: Omit<Place, "id" | "order">) => void;
  removePlace: (placeId: string) => void;
  updatePlaceOrder: (places: Place[]) => void;
  updatePlaceDay: (placeId: string, day: number) => void;

  // Day Actions
  addDay: () => void;
  removeDay: (day: number) => void;
  setDayTransitionOwnership: (fromDay: number, toDay: number, owningDay: number) => void;

  // Route Actions
  updateRouteSummary: (summary: RouteSummary) => void;
  updateRouteSegments: (segments: RouteSegment[]) => void;
  updateDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  optimizePlaces: (places: Place[], summary: RouteSummary) => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      currentTripId: null,
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
        set((state) => ({
          trips: [...state.trips, newTrip],
          currentTripId: newTrip.id,
          currentTrip: newTrip,
        }));
      },

      loadTrip: (tripId) => {
        const { trips } = get();
        const trip = trips.find((t) => t.id === tripId);
        if (trip) {
          set({ currentTripId: tripId, currentTrip: trip });
        }
      },

      deleteTrip: (tripId) => {
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

      addPlace: (placeData) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

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

        const updatedTrip = {
          ...currentTrip,
          places: [...currentTrip.places, newPlace],
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      removePlace: (placeId) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          places: currentTrip.places.filter((p) => p.id !== placeId),
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updatePlaceOrder: (places) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          places,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updatePlaceDay: (placeId, day) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

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
      },

      addDay: () => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const currentTotalDays = currentTrip.totalDays || 1;
        const updatedTrip = {
          ...currentTrip,
          totalDays: currentTotalDays + 1,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      removeDay: (day) => {
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

        const updatedTrip = {
          ...currentTrip,
          places: adjustedPlaces,
          totalDays: currentTotalDays - 1,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
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

      optimizePlaces: (places, summary) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          places,
          routeSummary: summary,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
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
      version: 4,
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
        
        return persistedState;
      },
    }
  )
);
