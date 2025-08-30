import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import RoleManagementPage from './pages/RoleManagementPage';
import MachineManagementPage from './pages/MachineManagementPage';
import MachineDashboardPage from './pages/MachineDashboardPage';
import TicketManagementPage from './pages/TicketManagementPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import TicketCreatePage from './pages/TicketCreatePage';
import TicketCreateWizardPage from './pages/TicketCreateWizardPage';
import ProfilePage from './pages/ProfilePage';

// Main App Component with Routing
const AppContent: React.FC = () => {
  // Protected Route Component (moved inside to access auth context)
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading, storeRedirectUrl } = useAuth();
    const location = useLocation();
    const hasStoredRedirect = useRef(false);
    
    // Store redirect URL when user is not authenticated (in useEffect to avoid render-time updates)
    useEffect(() => {
      if (!isAuthenticated && !isLoading && !hasStoredRedirect.current) {
        const currentPath = location.pathname + location.search;
        storeRedirectUrl(currentPath);
        hasStoredRedirect.current = true;
      }
      
      // Reset flag when user becomes authenticated
      if (isAuthenticated) {
        hasStoredRedirect.current = false;
      }
    }, [isAuthenticated, isLoading, location.pathname, location.search, storeRedirectUrl]);
    
    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
  };

  // Public Route Component (moved inside to access auth context)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, redirectUrl, clearRedirectUrl } = useAuth();
    
    if (isAuthenticated) {
      // Handle redirect URL if present, otherwise go to dashboard
      if (redirectUrl) {
        const destination = redirectUrl;
        clearRedirectUrl(); // Clear immediately to prevent loops
        return <Navigate to={destination} replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
    
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />
        <Route path="/verify-email" element={
          <PublicRoute>
            <VerifyEmailPage />
          </PublicRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Machine Management Routes */}
          <Route path="machines" element={<MachineManagementPage />} />
          <Route path="machines/list" element={<MachineManagementPage />} />
          <Route path="machines/maintenance" element={<MachineDashboardPage />} />
          
          {/* User Management Routes */}
          <Route path="users" element={<UserManagementPage />} />
          <Route path="users/list" element={<UserManagementPage />} />
          <Route path="users/roles" element={<RoleManagementPage />} />
          
          {/* Ticket Management Routes */}
          <Route path="tickets" element={<TicketManagementPage />} />
          <Route path="tickets/create" element={<TicketCreatePage />} />
          <Route path="tickets/create/wizard" element={<TicketCreateWizardPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Catch all route - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

// Root App Component with Providers
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
