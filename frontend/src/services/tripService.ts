import { apiClient } from "./api";
import type { Trip } from "../types/trip";

export const tripService = {
  // Save trip to server (for sharing)
  saveTrip: async (trip: Trip): Promise<{ id: string; shareUrl: string }> => {
    const response = await apiClient.post("/trips/", trip);
    return response.data;
  },

  // Get trip by ID (for viewing shared trip)
  getTrip: async (tripId: string): Promise<Trip> => {
    const response = await apiClient.get(`/trips/${tripId}/`);
    return response.data;
  },

  // Get user's trips (if logged in)
  getUserTrips: async (): Promise<Trip[]> => {
    const response = await apiClient.get("/trips/");
    return response.data;
  },
};
