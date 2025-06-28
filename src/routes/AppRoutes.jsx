import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import FirmwarePage from '../pages/FirmwarePage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/firmware" element={<FirmwarePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
    

    </Routes>
  );
}

export default AppRoutes;