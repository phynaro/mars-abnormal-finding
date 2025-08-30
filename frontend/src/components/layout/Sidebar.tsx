import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  LayoutDashboard,
  Ticket,
  Settings,
  Users,
  BarChart3,
  Wrench,
  FileText,
  ChevronRight,
  ChevronDown,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permissionLevel: number;
  children?: MenuItem[];
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  isMobile = false,
  isMobileOpen = false,
  onMobileToggle
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/dashboard',
      permissionLevel: 1
    },
    {
      id: 'tickets',
      label: t('nav.tickets'),
      icon: <Ticket className="h-5 w-5" />,
      path: '/tickets',
      permissionLevel: 1
    },
    {
      id: 'machines',
      label: t('nav.machines'),
      icon: <Wrench className="h-5 w-5" />,
      path: '/machines',
      permissionLevel: 2,
      children: [
        {
          id: 'machines-list',
          label: 'Machine List',
          icon: <FileText className="h-4 w-4" />,
          path: '/machines/list',
          permissionLevel: 2
        },
        {
          id: 'machines-maintenance',
          label: 'Maintenance Schedule',
          icon: <Clock className="h-4 w-4" />,
          path: '/machines/maintenance',
          permissionLevel: 2
        }
      ]
    },
    {
      id: 'reports',
      label: t('nav.reports'),
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/reports',
      permissionLevel: 2,
      children: [
        {
          id: 'reports-performance',
          label: 'Performance Metrics',
          icon: <BarChart3 className="h-4 w-4" />,
          path: '/reports/performance',
          permissionLevel: 2
        },
        {
          id: 'reports-downtime',
          label: 'Downtime Analysis',
          icon: <Clock className="h-4 w-4" />,
          path: '/reports/downtime',
          permissionLevel: 2
        },
        {
          id: 'reports-user-activity',
          label: 'User Activity',
          icon: <Users className="h-4 w-4" />,
          path: '/reports/user-activity',
          permissionLevel: 3
        }
      ]
    },
    {
      id: 'users',
      label: t('nav.users'),
      icon: <Users className="h-5 w-5" />,
      path: '/users',
      permissionLevel: 3,
      children: [
        {
          id: 'users-list',
          label: 'User List',
          icon: <Users className="h-4 w-4" />,
          path: '/users/list',
          permissionLevel: 3
        },
        {
          id: 'users-roles',
          label: 'Role Management',
          icon: <Settings className="h-4 w-4" />,
          path: '/users/roles',
          permissionLevel: 3
        }
      ]
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: <Settings className="h-5 w-5" />,
      path: '/settings',
      permissionLevel: 3,
      children: [
        {
          id: 'settings-system',
          label: 'System Settings',
          icon: <Settings className="h-4 w-4" />,
          path: '/settings/system',
          permissionLevel: 3
        },
        {
          id: 'settings-notifications',
          label: 'Notification Settings',
          icon: <AlertTriangle className="h-4 w-4" />,
          path: '/settings/notifications',
          permissionLevel: 3
        }
      ]
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const canAccess = (permissionLevel: number) => {
    return (user?.permissionLevel || 0) >= permissionLevel;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close mobile menu after navigation
    if (isMobile && onMobileToggle) {
      onMobileToggle();
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    if (!canAccess(item.permissionLevel)) {
      return null;
    }

    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    const isActive = location.pathname === item.path;
    
    return (
      <div key={item.id}>
        <Button
          variant={isActive ? "default" : "ghost"}
          className={cn(
            "w-full justify-start h-auto p-3 text-sm font-medium",
            hasChildren ? "hover:bg-accent" : "",
            isCollapsed && !isMobile && "justify-center px-2",
            isActive && "bg-primary text-primary-foreground"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.path);
            }
          }}
        >
          <div className={cn(
            "flex items-center w-full",
            isCollapsed && !isMobile ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center space-x-3">
              {item.icon}
              {(!isCollapsed || isMobile) && <span>{item.label}</span>}
            </div>
            {hasChildren && (!isCollapsed || isMobile) && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </div>
        </Button>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (!isCollapsed || isMobile) && (
          <div className={cn(
            "border-l border-border",
            isCollapsed ? "ml-2" : "ml-4"
          )}>
            {item.children!.map(child => {
              const isChildActive = location.pathname === child.path;
              
              return (
                <Button
                  key={child.id}
                  variant={isChildActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto p-2 text-sm",
                    isChildActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground",
                    !canAccess(child.permissionLevel) && "opacity-50 cursor-not-allowed",
                    isCollapsed && !isMobile && "justify-center px-2"
                  )}
                  disabled={!canAccess(child.permissionLevel)}
                  onClick={() => {
                    if (canAccess(child.permissionLevel)) {
                      handleNavigation(child.path);
                    }
                  }}
                >
                <div className="flex items-center space-x-3">
                  {child.icon}
                  {(!isCollapsed || isMobile) && <span>{child.label}</span>}
                </div>
              </Button>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onMobileToggle}
            />
            
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">M</span>
                  </div>
                  <span className="text-lg font-semibold">CMMS</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMobileToggle}
                  className="lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <nav className="py-4 flex-1 overflow-y-auto">
                {menuItems.map(renderMenuItem)}
              </nav>

              {/* User Info at Bottom */}
              <div className="p-4 border-t border-border bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    {user?.avatarUrl && (
                      <AvatarImage src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '').replace(/\/api$/, '')}${user.avatarUrl}`} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.department} • {user?.shift}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className={cn(
      "bg-card border-r border-border h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out flex-shrink-0",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-semibold">CMMS</span>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="py-4 flex-1">
        {menuItems.map(renderMenuItem)}
      </nav>

      {/* User Info at Bottom - Always visible */}
      <div className="p-4 border-t border-border bg-muted/50">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            {user?.avatarUrl && (
              <AvatarImage src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '').replace(/\/api$/, '')}${user.avatarUrl}`} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.department} • {user?.shift}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
