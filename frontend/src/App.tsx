import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TripPlanPage } from "./pages/TripPlanPage";
import { SharedTripPage } from "./pages/SharedTripPage";

function App() {
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
