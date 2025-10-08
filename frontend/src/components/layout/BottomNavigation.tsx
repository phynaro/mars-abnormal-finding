import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  LayoutDashboard, 
  Ticket, 
  User
} from 'lucide-react';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permissionLevel: number;
}

interface BottomNavigationProps {
  className?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Define bottom navigation items (main sections only)
  const bottomNavItems: BottomNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      path: '/home',
      permissionLevel: 1,
    },
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
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
      path: '/profile',
      permissionLevel: 1,
    },
  ];

  const canAccess = (permissionLevel: number) => {
    if (user?.permissionLevel === undefined) {
      return true;
    }
    return user.permissionLevel >= permissionLevel;
  };

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-t border-border shadow-lg",
        "lg:hidden", // Only show on mobile/tablet
        "animate-in slide-in-from-bottom-2 duration-300",
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {bottomNavItems.map((item) => {
          if (!canAccess(item.permissionLevel)) {
            return null;
          }

          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1",
                "transition-all duration-200 ease-in-out",
                "focus:outline-none",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
              aria-label={`Navigate to ${item.label}`}
              aria-current={active ? 'page' : undefined}
            >
              <div className={cn(
                "mb-1 transition-all duration-200 relative",
                active ? "scale-110" : "scale-100"
              )}>
                {item.icon}
                
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium truncate max-w-full",
                "transition-all duration-200",
                active ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              
              {/* Active background indicator */}
              {/* {active && (
                <div className="absolute inset-0 bg-primary/10 rounded-lg -z-10" />
              )} */}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
