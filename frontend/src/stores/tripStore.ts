import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, Place, Location, RouteSummary, RouteSegment, TravelMode, Currency } from "../types/trip";
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
  updateStartDate: (startDate: string) => void;
  updateTitle: (title: string) => void;

  // Place Actions
  addPlace: (place: Omit<Place, "id" | "order">) => void;
  removePlace: (placeId: string) => void;
  updatePlaceOrder: (places: Place[]) => void;
  updatePlaceDay: (placeId: string, day: number) => void;
  updatePlaceTime: (placeId: string, visitTime: string) => void;
  updatePlaceCost: (placeId: string, cost: number, currency: Currency) => void;
  updatePlaceMemo: (placeId: string, memo: string) => void;

  // Day Actions
  addDay: () => void;
  removeDay: (day: number) => void;
  setDayTransitionOwnership: (fromDay: number, toDay: number, owningDay: number) => void;

  // Route Actions
  updateRouteSummary: (summary: RouteSummary) => void;
  updateRouteSegments: (segments: RouteSegment[]) => void;
  updateDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  updateTravelMode: (mode: TravelMode) => void;
  updateSegmentTravelMode: (fromPlaceId: string, toPlaceId: string, mode: TravelMode) => void;
  updateSegmentDepartureTime: (fromPlaceId: string, toPlaceId: string, departureTime: string) => void;
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
          travelMode: "DRIVING",
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

      updateStartDate: (startDate) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          startDate,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
      },

      updateTitle: (title) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          title,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
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

      updatePlaceTime: (placeId, visitTime) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

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
      },

      updatePlaceCost: (placeId, cost, currency) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

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
      },

      updatePlaceMemo: (placeId, memo) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

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

      updateTravelMode: (mode) => {
        const { currentTrip, currentTripId, trips } = get();
        if (!currentTrip || !currentTripId) return;

        const updatedTrip = {
          ...currentTrip,
          travelMode: mode,
          updatedAt: new Date().toISOString(),
        };

        set({
          trips: trips.map((t) => (t.id === currentTripId ? updatedTrip : t)),
          currentTrip: updatedTrip,
        });
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
      version: 5,
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
        
        return persistedState;
      },
    }
  )
);
