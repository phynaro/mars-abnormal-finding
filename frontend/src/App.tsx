import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import RequestAccessPage from './pages/auth/RequestAccessPage';
import WelcomePage from './pages/home/WelcomePage';
import HomePage from './pages/home/HomePage';

import DashboardMaintenanceKPIPage from './pages/dashboard/DashboardMaintenanceKPIPage';
import DashboardPreventiveMaintenancePage from './pages/dashboard/DashboardPreventiveMaintenancePage';
import DashboardCalibrationPage from './pages/dashboard/DashboardCalibrationPage';
import DashboardMCCPage from './pages/dashboard/DashboardMCCPage';
import DashboardSparePartPage from './pages/dashboard/DashboardSparePartPage';
import DashboardBacklogPage from './pages/dashboard/DashboardBacklogPage';
import DashboardBacklogDetailPage from './pages/dashboard/DashboardBacklogDetailPage';
import AbnormalReportDashboardV2Page from './pages/dashboard/AbnormalReportDashboardV2Page';
import PersonalKPIComparisonPage from './pages/dashboard/PersonalKPIComparisonPage';
import DepartmentUserKPIDashboardPage from './pages/dashboard/DepartmentUserKPIDashboardPage';
import UserActivityChartPage from './pages/charts/UserActivityChartPage';
import TargetManagementPage from './pages/settings/TargetManagementPage';
import UserManagementPage from './pages/settings/UserManagementPage';
import RoleManagementPage from './pages/settings/RoleManagementPage';
// Removed old machine pages from menu in favor of Assets
import WorkOrdersPage from './pages/works/WorkOrdersPage';
import WorkOrderDetailsPage from './pages/works/WorkOrderDetailsPage';
import WorkRequestsPage from './pages/works/WorkRequestsPage';
import PreventiveMaintenancePage from './pages/dashboard/PreventiveMaintenancePage';
import WorkRequestDetailsPage from './pages/works/WorkRequestDetailsPage';
import InventoryOverviewPage from './pages/asset/InventoryOverviewPage';
import InventoryCatalogPage from './pages/asset/InventoryCatalogPage';
import InventoryStoresPage from './pages/asset/InventoryStoresPage';
import InventoryVendorsPage from './pages/asset/InventoryVendorsPage';
import InventoryAnalyticsPage from './pages/asset/InventoryAnalyticsPage';
import InventoryCatalogDetailsPage from './pages/asset/InventoryCatalogDetailsPage';
import OrgDepartmentsPage from './pages/org/OrgDepartmentsPage';
import OrgDepartmentDetailsPage from './pages/org/OrgDepartmentDetailsPage';
import OrgGroupsPage from './pages/org/OrgGroupsPage';
import OrgGroupDetailsPage from './pages/org/OrgGroupDetailsPage';
import OrgTitlesPage from './pages/org/OrgTitlesPage';
import OrgTitleDetailsPage from './pages/org/OrgTitleDetailsPage';
import OrgUsersPage from './pages/org/OrgUsersPage';
import OrgUserDetailsPage from './pages/org/OrgUserDetailsPage';
import TicketManagementPage from './pages/tickets/TicketManagementPage';
import TicketDetailsPage from './pages/tickets/TicketDetailsPage';
import TicketCreatePage from './pages/tickets/TicketCreatePage';
import TicketCreateWizardPage from './pages/tickets/TicketCreateWizardPage';
import ProfilePage from './pages/profile/ProfilePage';
import HierarchyViewPage from './pages/settings/HierarchyViewPage';
import TicketApprovalManagementPage from './pages/settings/TicketApprovalManagementPage';
import WorkflowTypesPage from './pages/works/WorkflowTypesPage';
import Loading from './components/common/Loading';

// Main App Component with Routing
const AppContent: React.FC = () => {
  // Protected Route Component (moved inside to access auth context)
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading, liffLoading, liffError, storeRedirectUrl, user } = useAuth();
    const location = useLocation();
    
    // Check if we have LINE login callback params and user needs lineId setup
    const lineLoginParams = location.search.includes('code=') && location.search.includes('liffClientId=');
    const needsLineIdSetup = !user?.lineId;
    const hasStoredRedirect = useRef(false);
    const [showCatLoading, setShowCatLoading] = useState(false);
    const [catStartTime, setCatStartTime] = useState<number | null>(null);
    
    // Handle cat loading timing
    useEffect(() => {
      if (isLoading || liffLoading) {
        if (!showCatLoading) {
          setShowCatLoading(true);
          setCatStartTime(Date.now());
        }
      } else if (showCatLoading && catStartTime) {
        const elapsed = Date.now() - catStartTime;
        const minDisplayTime = 3000; // 3 seconds
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        if (remaining > 0) {
          const timer = setTimeout(() => {
            setShowCatLoading(false);
            setCatStartTime(null);
          }, remaining);
          
          return () => clearTimeout(timer);
        } else {
          setShowCatLoading(false);
          setCatStartTime(null);
        }
      }
    }, [isLoading, liffLoading, showCatLoading, catStartTime]);

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

    // Show loading state while checking authentication or initializing LIFF OR during minimum display time
    if (isLoading || liffLoading || showCatLoading) {
      return (
        <Loading 
          message={liffLoading ? 'Initializing LINE LIFF...' : 'Checking authentication...'}
          size="sm"
          showCat={true}
        />
      );
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    // If user came back from LINE login and needs lineId setup, redirect to welcome
    if (lineLoginParams && needsLineIdSetup && location.pathname !== '/welcome') {
      return <Navigate to="/welcome" replace />;
    }
    
    return <>{children}</>;
  };

  // Public Route Component (moved inside to access auth context)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, redirectUrl, clearRedirectUrl, user } = useAuth();
    const location = useLocation();
  
    if (isAuthenticated) {
      const needsLineIdSetup = !user?.lineId;
      
      // Redirect users without lineId to welcome page to optionally link LINE
      if (needsLineIdSetup && location.pathname !== '/welcome') {
        return <Navigate to="/welcome" replace />;
      }
      
      // Handle stored redirect URL if present
      if (redirectUrl) {
        const destination = redirectUrl;
        clearRedirectUrl();
        return <Navigate to={destination} replace />;
      }
      
      // Redirect authenticated users away from public pages to home
      if (!needsLineIdSetup && location.pathname !== '/home' && location.pathname !== '/welcome') {
        return <Navigate to="/home" replace />;
      }
    }
    
    return <>{children}</>;
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
        <Route path="/request-access" element={
          <PublicRoute>
            <RequestAccessPage />
          </PublicRoute>
        } />
        <Route path="/welcome" element={
          <ProtectedRoute>
            <WelcomePage />
          </ProtectedRoute>
        } />
        
        {/* Standalone Chart Routes (No Layout) */}
        <Route path="/charts/user-activity" element={
          <ProtectedRoute>
            <UserActivityChartPage />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<Navigate to="/dashboard/abnormal" replace />} />
          <Route path="dashboard/abnormal" element={<AbnormalReportDashboardV2Page />} />
          <Route path="dashboard/personal-kpi-comparison" element={<PersonalKPIComparisonPage />} />
          <Route path="dashboard/department-user-kpi" element={<DepartmentUserKPIDashboardPage />} />
          <Route path="dashboard/maintenance-kpi" element={<DashboardMaintenanceKPIPage />} />
          <Route path="dashboard/preventive-maintenance" element={<DashboardPreventiveMaintenancePage />} />
          <Route path="dashboard/calibration" element={<DashboardCalibrationPage />} />
          <Route path="dashboard/mcc" element={<DashboardMCCPage />} />
          <Route path="dashboard/spare-part" element={<DashboardSparePartPage />} />
          <Route path="dashboard/backlog" element={<DashboardBacklogPage />} />
          <Route path="dashboard/backlog/department/:deptCode" element={<DashboardBacklogDetailPage />} />
          <Route path="dashboard/backlog/user/:personName" element={<DashboardBacklogDetailPage />} />
         
          
          {/* Maintenance Routes */}
          <Route path="maintenance" element={<WorkOrdersPage />} />
          <Route path="maintenance/work-orders" element={<WorkOrdersPage />} />
          <Route path="maintenance/work-orders/:woId" element={<WorkOrderDetailsPage />} />
          <Route path="maintenance/work-requests" element={<WorkRequestsPage />} />
          <Route path="maintenance/work-requests/:wrId" element={<WorkRequestDetailsPage />} />
          <Route path="maintenance/preventive-maintenance" element={<PreventiveMaintenancePage />} />

          {/* Inventory */}
          <Route path="inventory" element={<InventoryOverviewPage />} />
          <Route path="inventory/catalog" element={<InventoryCatalogPage />} />
          <Route path="inventory/stores" element={<InventoryStoresPage />} />
          <Route path="inventory/vendors" element={<InventoryVendorsPage />} />
          <Route path="inventory/analytics" element={<InventoryAnalyticsPage />} />
          
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

          {/* Asset Management Routes */}
          <Route path="settings" element={<HierarchyViewPage />} />
          <Route path="settings/hierarchy" element={<HierarchyViewPage />} />
          <Route path="settings/ticket-approvals" element={<TicketApprovalManagementPage />} />
          <Route path="settings/targets" element={<TargetManagementPage />} />
          {/* Spare Part (Inventory) */}
          <Route path="spare" element={<InventoryOverviewPage />} />
          <Route path="spare/overview" element={<InventoryOverviewPage />} />
          <Route path="spare/catalog" element={<InventoryCatalogPage />} />
          <Route path="spare/catalog/:itemId" element={<InventoryCatalogDetailsPage />} />
          <Route path="spare/stores" element={<InventoryStoresPage />} />
          <Route path="spare/vendors" element={<InventoryVendorsPage />} />
          <Route path="spare/analytics" element={<InventoryAnalyticsPage />} />

          {/* Organization */}
          <Route path="org/departments" element={<OrgDepartmentsPage />} />
          <Route path="org/departments/:id" element={<OrgDepartmentDetailsPage />} />
          <Route path="org/groups" element={<OrgGroupsPage />} />
          <Route path="org/groups/:id" element={<OrgGroupDetailsPage />} />
          <Route path="org/titles" element={<OrgTitlesPage />} />
          <Route path="org/titles/:id" element={<OrgTitleDetailsPage />} />
          <Route path="org/users" element={<OrgUsersPage />} />
          <Route path="org/users/:id" element={<OrgUserDetailsPage />} />

          {/* Workflow */}
          <Route path="workflow" element={<WorkflowTypesPage />} />
          <Route path="workflow/types" element={<WorkflowTypesPage />} />
          
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
