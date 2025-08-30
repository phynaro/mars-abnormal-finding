import React from 'react';
import { 
  LayoutDashboard,
  Ticket,
  Wrench,
  BarChart3,
  Users,
  Settings,
  Clock,
  FileText
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
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
    permissionLevel: 1,
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: <Ticket className="h-5 w-5" />,
    path: '/tickets',
    permissionLevel: 1,
  },
  {
    id: 'machines',
    label: 'Machines',
    icon: <Wrench className="h-5 w-5" />,
    path: '/machines',
    permissionLevel: 2,
    children: [
      { id: 'machines-list', label: 'Machine List', icon: <FileText className="h-4 w-4" />, path: '/machines/list', permissionLevel: 2 },
      { id: 'machines-maintenance', label: 'Maintenance', icon: <Clock className="h-4 w-4" />, path: '/machines/maintenance', permissionLevel: 2 },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    permissionLevel: 2,
    children: [
      { id: 'reports-performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" />, path: '/reports/performance', permissionLevel: 2 },
      { id: 'reports-downtime', label: 'Downtime', icon: <Clock className="h-4 w-4" />, path: '/reports/downtime', permissionLevel: 2 },
      { id: 'reports-user-activity', label: 'User Activity', icon: <Users className="h-4 w-4" />, path: '/reports/user-activity', permissionLevel: 3 },
    ]
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users className="h-5 w-5" />,
    path: '/users',
    permissionLevel: 3,
    children: [
      { id: 'users-list', label: 'User List', icon: <Users className="h-4 w-4" />, path: '/users/list', permissionLevel: 3 },
      { id: 'users-roles', label: 'Role Management', icon: <Settings className="h-4 w-4" />, path: '/users/roles', permissionLevel: 3 },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings',
    permissionLevel: 3,
  }
];
