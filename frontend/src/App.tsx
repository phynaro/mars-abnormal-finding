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
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import DashboardMaintenanceKPIPage from './pages/dashboard/DashboardMaintenanceKPIPage';
import DashboardPreventiveMaintenancePage from './pages/dashboard/DashboardPreventiveMaintenancePage';
import DashboardCalibrationPage from './pages/dashboard/DashboardCalibrationPage';
import DashboardMCCPage from './pages/dashboard/DashboardMCCPage';
import DashboardSparePartPage from './pages/dashboard/DashboardSparePartPage';
import DashboardBacklogPage from './pages/dashboard/DashboardBacklogPage';
import DashboardBacklogDetailPage from './pages/dashboard/DashboardBacklogDetailPage';
import AbnormalReportDashboardV2Page from './pages/dashboard/AbnormalReportDashboardV2Page';
import UserActivityChartPage from './pages/charts/UserActivityChartPage';
import TargetManagementPage from './pages/TargetManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import RoleManagementPage from './pages/RoleManagementPage';
// Removed old machine pages from menu in favor of Assets
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetailsPage from './pages/WorkOrderDetailsPage';
import WorkRequestsPage from './pages/WorkRequestsPage';
import PreventiveMaintenancePage from './pages/PreventiveMaintenancePage';
import WorkRequestDetailsPage from './pages/WorkRequestDetailsPage';
import InventoryOverviewPage from './pages/InventoryOverviewPage';
import InventoryCatalogPage from './pages/InventoryCatalogPage';
import InventoryStoresPage from './pages/InventoryStoresPage';
import InventoryVendorsPage from './pages/InventoryVendorsPage';
import InventoryAnalyticsPage from './pages/InventoryAnalyticsPage';
import InventoryCatalogDetailsPage from './pages/InventoryCatalogDetailsPage';
import OrgDepartmentsPage from './pages/org/OrgDepartmentsPage';
import OrgDepartmentDetailsPage from './pages/org/OrgDepartmentDetailsPage';
import OrgGroupsPage from './pages/org/OrgGroupsPage';
import OrgGroupDetailsPage from './pages/org/OrgGroupDetailsPage';
import OrgTitlesPage from './pages/org/OrgTitlesPage';
import OrgTitleDetailsPage from './pages/org/OrgTitleDetailsPage';
import OrgUsersPage from './pages/org/OrgUsersPage';
import OrgUserDetailsPage from './pages/org/OrgUserDetailsPage';
import TicketManagementPage from './pages/TicketManagementPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import TicketCreatePage from './pages/TicketCreatePage';
import TicketCreateWizardPage from './pages/TicketCreateWizardPage';
import NewTicketForm from './pages/NewTicketForm';
import ProfilePage from './pages/ProfilePage';
import AssetSitesPage from './pages/AssetSitesPage';
import AssetDepartmentsPage from './pages/AssetDepartmentsPage';
import ProductionUnitPage from './pages/ProductionUnitPage';
import EquipmentPage from './pages/EquipmentPage';
import AssetHierarchyPage from './pages/AssetHierarchyPage';
import WorkflowTypesPage from './pages/WorkflowTypesPage';
import PlantManagementPage from './pages/PlantManagementPage';
import AreaManagementPage from './pages/AreaManagementPage';
import LineManagementPage from './pages/LineManagementPage';
import MachineManagementPage from './pages/MachineManagementPage';
import TicketApprovalManagementPage from './pages/TicketApprovalManagementPage';

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
          <Route path="dashboard/abnormal-v2" element={<AbnormalReportDashboardV2Page />} />
          <Route path="dashboard/maintenance-kpi" element={<DashboardMaintenanceKPIPage />} />
          <Route path="dashboard/preventive-maintenance" element={<DashboardPreventiveMaintenancePage />} />
          <Route path="dashboard/calibration" element={<DashboardCalibrationPage />} />
          <Route path="dashboard/mcc" element={<DashboardMCCPage />} />
          <Route path="dashboard/spare-part" element={<DashboardSparePartPage />} />
          <Route path="dashboard/backlog" element={<DashboardBacklogPage />} />
          <Route path="dashboard/backlog/department/:deptCode" element={<DashboardBacklogDetailPage />} />
          <Route path="dashboard/backlog/user/:personName" element={<DashboardBacklogDetailPage />} />
          <Route path="dashboard/targets" element={<TargetManagementPage />} />
          
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
          <Route path="tickets/create/new" element={<NewTicketForm />} />
          <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Asset Management Routes */}
          <Route path="assets" element={<AssetSitesPage />} />
          <Route path="assets/sites" element={<AssetSitesPage />} />
          <Route path="assets/departments" element={<AssetDepartmentsPage />} />
          <Route path="assets/production-units" element={<ProductionUnitPage />} />
          <Route path="assets/equipment" element={<EquipmentPage />} />
          <Route path="assets/hierarchy" element={<AssetHierarchyPage />} />
          <Route path="assets/plants" element={<PlantManagementPage />} />
          <Route path="assets/areas" element={<AreaManagementPage />} />
          <Route path="assets/lines" element={<LineManagementPage />} />
          <Route path="assets/machines" element={<MachineManagementPage />} />
          <Route path="assets/ticket-approvals" element={<TicketApprovalManagementPage />} />

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
