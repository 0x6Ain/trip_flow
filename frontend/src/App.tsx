import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { HomePage } from "./pages/HomePage";
import { TripPlanPage } from "./pages/TripPlanPage";
import { SharedTripPage } from "./pages/SharedTripPage";
import { initGoogleMaps } from "./services/googleMapsService";
import { env } from "./config/env";

// Unified Google Maps configuration
const libraries: ("places" | "drawing" | "geometry" | "visualization" | "marker")[] = [
  "places",
  "marker",
];

function App() {
  // Load Google Maps API once at the top level
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: env.googleMapsApiKey,
    libraries,
    version: "beta", // Required for AdvancedMarkerElement
  });

  // Initialize Google Maps services when API is loaded
  useEffect(() => {
    if (isLoaded) {
      initGoogleMaps().catch((error) => {
        console.error("Google Maps 초기화 실패:", error);
      });
    }
  }, [isLoaded]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plan" element={<TripPlanPage />} />
        <Route path="/trip/:tripId" element={<SharedTripPage />} />
      </Routes>
    </Router>
  );
}

export default App;
