import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import "./index.css";
import Feedback from "./components/Feedback/Feedback";

function App() {
  return (
    <>
      <Router>
        <AppRoutes />
      </Router>
      <Feedback />
    </>
  );
}

export default App;
