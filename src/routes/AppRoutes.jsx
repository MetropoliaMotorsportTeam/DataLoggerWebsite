import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import FirmwarePage from '../pages/FirmwarePage';
import DataPage from '../pages/DataPage';
import SettingsPage from '../pages/SettingsPage';
import SessionsPage from '../pages/SessionsPage';


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/firmware" element={<FirmwarePage />} />
      <Route path="/data" element={<DataPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
    

    </Routes>
  );
}

export default AppRoutes;