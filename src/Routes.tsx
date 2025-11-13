import { Routes as ReactRoutes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Instances from "./pages/Instances";
import Contacts from "./pages/Contacts";
import Campaigns from "./pages/Campaigns";
import ContactDetails from "./pages/ContactDetails";
import Logs from "./pages/Logs";
import CampaignLogs from "./pages/CampaignLogs";
import ProfilePage from "./pages/Profile";
import CRM from "./pages/CRM"; // Importar a nova página CRM
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider, useSession } from "./components/auth/SessionContextProvider";
import React from "react";

// ProtectedRoute component to guard routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    // Redirect to login is handled by SessionContextProvider
    return null;
  }

  return <>{children}</>;
};

export const Routes = () => (
  <ReactRoutes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/instances"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Instances />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/contacts"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Contacts />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/contacts/:listId"
      element={
        <ProtectedRoute>
          <MainLayout>
            <ContactDetails />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/campaigns"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Campaigns />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/campaigns/:campaignId/logs"
      element={
        <ProtectedRoute>
          <MainLayout>
            <CampaignLogs />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/logs"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Logs />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile" // New route for Profile page
      element={
        <ProtectedRoute>
          <MainLayout>
            <ProfilePage />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm" // Nova rota para a página CRM
      element={
        <ProtectedRoute>
          <MainLayout>
            <CRM />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </ReactRoutes>
);