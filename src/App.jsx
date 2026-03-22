import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import "./index.css";

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
