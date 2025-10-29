import React from 'react';
import { 
  LayoutDashboard,
  Ticket,
  BarChart3,
  Clock,
  FileText,
  Boxes,
  Home,
  Factory,
  MapPin,
  Layers,
  Cpu,
  UserCheck,
  Target,
  Settings,
  TrendingUp,
  Users,
  Bell
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permissionLevel: number;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    //icon: <Home className="h-5 w-5" />,
    icon: <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center"><img src="/MARS-icon.png" alt="MARS Logo" className="h-6 w-6" /></div>,
    path: '/home',
    permissionLevel: 1,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
    permissionLevel: 1,
    children: [
     // { id: 'dashboard-abnormal', label: 'Abnormal Report', icon: <FileText className="h-4 w-4" />, path: '/dashboard/abnormal', permissionLevel: 1 },
      { id: 'dashboard-abnormal', label: 'Abnormal Report', icon: <FileText className="h-4 w-4" />, path: '/dashboard/abnormal', permissionLevel: 1 },
      // { id: 'dashboard-backlog', label: 'Backlog', icon: <FileText className="h-4 w-4" />, path: '/dashboard/backlog', permissionLevel: 1 },
      // { id: 'dashboard-maintenance-kpi', label: 'Maintenance KPI', icon: <BarChart3 className="h-4 w-4" />, path: '/dashboard/maintenance-kpi', permissionLevel: 1 },
      // { id: 'dashboard-preventive-maintenance', label: 'Preventive Maintenance', icon: <Clock className="h-4 w-4" />, path: '/dashboard/preventive-maintenance', permissionLevel: 1 },
      // { id: 'dashboard-calibration', label: 'Calibration', icon: <FileText className="h-4 w-4" />, path: '/dashboard/calibration', permissionLevel: 1 },
      // { id: 'dashboard-mcc', label: 'MCC', icon: <FileText className="h-4 w-4" />, path: '/dashboard/mcc', permissionLevel: 1 },
      // { id: 'dashboard-spare-part', label: 'Spare Part', icon: <Boxes className="h-4 w-4" />, path: '/dashboard/spare-part', permissionLevel: 1 },
     { id: 'dashboard-personal-kpi', label: 'Personal KPI', icon: <BarChart3 className="h-4 w-4" />, path: '/dashboard/personal-kpi-comparison', permissionLevel: 1 },
     { id: 'dashboard-department-user-kpi', label: 'Department User KPI', icon: <Users className="h-4 w-4" />, path: '/dashboard/department-user-kpi', permissionLevel: 1 },
    ]
  },
  // {
  //   id: 'workflow',
  //   label: 'Workflow',
  //   icon: <GitBranch className="h-5 w-5" />,
  //   path: '/workflow',
  //   permissionLevel: 1,
  //   children: [
  //     { id: 'workflow-types', label: 'Workflow Type', icon: <FileText className="h-4 w-4" />, path: '/workflow/types', permissionLevel: 1 },
  //   ]
  // },
  // {
  //   id: 'org',
  //   label: 'Organization',
  //   icon: <Building className="h-5 w-5" />,
  //   path: '/org',
  //   permissionLevel: 1,
  //   children: [
  //     { id: 'org-departments', label: 'Department', icon: <FileText className="h-4 w-4" />, path: '/org/departments', permissionLevel: 1 },
  //     { id: 'org-groups', label: 'Group', icon: <FileText className="h-4 w-4" />, path: '/org/groups', permissionLevel: 1 },
  //     { id: 'org-titles', label: 'Title', icon: <FileText className="h-4 w-4" />, path: '/org/titles', permissionLevel: 1 },
  //     { id: 'org-users', label: 'User', icon: <Users className="h-4 w-4" />, path: '/org/users', permissionLevel: 1 },
  //   ]
  // },
  // {
  //   id: 'spare',
  //   label: 'Spare Part',
  //   icon: <Boxes className="h-5 w-5" />,
  //   path: '/spare',
  //   permissionLevel: 1,
  //   children: [
  //     { id: 'spare-overview', label: 'Overview', icon: <FileText className="h-4 w-4" />, path: '/spare/overview', permissionLevel: 1 },
  //     { id: 'spare-catalog', label: 'Catalog', icon: <FileText className="h-4 w-4" />, path: '/spare/catalog', permissionLevel: 1 },
  //     { id: 'spare-stores', label: 'Store', icon: <FileText className="h-4 w-4" />, path: '/spare/stores', permissionLevel: 1 },
  //     { id: 'spare-vendors', label: 'Vendor', icon: <FileText className="h-4 w-4" />, path: '/spare/vendors', permissionLevel: 1 },
  //     { id: 'spare-analytics', label: 'Analytic', icon: <BarChart3 className="h-4 w-4" />, path: '/spare/analytics', permissionLevel: 1 },
  //   ]
  // },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: <Ticket className="h-5 w-5" />,
    path: '/tickets',
    permissionLevel: 1,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings',
    permissionLevel: 1,
    children: [
      { id: 'settings-hierarchy', label: 'Hierarchy View', icon: <TrendingUp className="h-4 w-4" />, path: '/settings/hierarchy', permissionLevel: 1 },
      { id: 'settings-ticket-approvals', label: 'Ticket Approvals', icon: <UserCheck className="h-4 w-4" />, path: '/settings/ticket-approvals', permissionLevel: 1 },
      { id: 'settings-targets', label: 'Target Management', icon: <Target className="h-4 w-4" />, path: '/settings/targets', permissionLevel: 1 },
      { id: 'settings-notification-schedules', label: 'Notification Schedules', icon: <Bell className="h-4 w-4" />, path: '/settings/notification-schedules', permissionLevel: 1 },
    ]
  },
  

  // {
  //   id: 'maintenance',
  //   label: 'Maintenance',
  //   icon: <Wrench className="h-5 w-5" />,
  //   path: '/maintenance',
  //   permissionLevel: 1,
  //   children: [
  //     { id: 'maintenance-work-orders', label: 'Work Orders', icon: <FileText className="h-4 w-4" />, path: '/maintenance/work-orders', permissionLevel: 1 },
  //     { id: 'maintenance-work-requests', label: 'Work Requests', icon: <FileText className="h-4 w-4" />, path: '/maintenance/work-requests', permissionLevel: 1 },
  //     { id: 'maintenance-preventive', label: 'Preventive Maintenance', icon: <Clock className="h-4 w-4" />, path: '/maintenance/preventive-maintenance', permissionLevel: 1 },
  //   ]
  // },
  // {
  //   id: 'reports',
  //   label: 'Reports',
  //   icon: <BarChart3 className="h-5 w-5" />,
  //   path: '/reports',
  //   permissionLevel: 2,
  //   children: [
  //     { id: 'reports-performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" />, path: '/reports/performance', permissionLevel: 2 },
  //     { id: 'reports-downtime', label: 'Downtime', icon: <Clock className="h-4 w-4" />, path: '/reports/downtime', permissionLevel: 2 },
  //     { id: 'reports-user-activity', label: 'User Activity', icon: <Users className="h-4 w-4" />, path: '/reports/user-activity', permissionLevel: 3 },
  //   ]
  // },
  // {
  //   id: 'users',
  //   label: 'Users',
  //   icon: <Users className="h-5 w-5" />,
  //   path: '/users',
  //   permissionLevel: 3,
  //   children: [
  //     { id: 'users-list', label: 'User List', icon: <Users className="h-4 w-4" />, path: '/users/list', permissionLevel: 3 },
  //     { id: 'users-roles', label: 'Role Management', icon: <Settings className="h-4 w-4" />, path: '/users/roles', permissionLevel: 3 },
  //   ]
  // },
  // {
  //   id: 'settings',
  //   label: 'Settings',
  //   icon: <Settings className="h-5 w-5" />,
  //   path: '/settings',
  //   permissionLevel: 3,
  // }
];
