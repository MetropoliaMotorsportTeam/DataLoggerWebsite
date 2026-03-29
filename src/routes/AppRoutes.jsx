import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import HomePage from "../pages/HomePage";
import FirmwarePage from "../pages/FirmwarePage";
import DataPage from "../pages/DataPage";
import SettingsPage from "../pages/SettingsPage";
import SessionsPage from "../pages/SessionsPage";
import Packinglist from "../pages/PackingList";
import LoginPage from "../pages/LoginPage";
// import CreateUser from "../pages/CreateUser";

function ProtectedRoute({ children }) {
  const isAuthenticated = sessionStorage.getItem("auth") === "true";
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* /create-user route removed as requested */}

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HomePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/firmware"
        element={
          <ProtectedRoute>
            <Layout>
              <FirmwarePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/data"
        element={
          <ProtectedRoute>
            <Layout>
              <DataPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Layout>
              <SessionsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/packinglist"
        element={
          <ProtectedRoute>
            <Layout>
              <Packinglist />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
