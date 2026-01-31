import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { Header } from "./components/Header/Header";
import { HomePage } from "./pages/HomePage";
import { TripPlanPage } from "./pages/TripPlanPage";
import { ScheduleView } from "./pages/ScheduleView";
import { SharedTripPage } from "./pages/SharedTripPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
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
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/plan" element={<TripPlanPage />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/trip/:tripId" element={<SharedTripPage />} />
      </Routes>
    </Router>
  );
}

export default App;
