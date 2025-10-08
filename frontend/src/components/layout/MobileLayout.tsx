import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomNavigation } from '../../hooks/useBottomNavigation';
import TopNavbar from './TopNavbar';
import BottomNavigation from './BottomNavigation';
import { cn } from '@/lib/utils';
import { Plus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  // Bottom navigation hook
  const { isVisible: isBottomNavVisible } = useBottomNavigation({
    hideOnPaths: ['/login', '/register', '/verify-email'],
    showOnMobileOnly: true,
  });

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Show floating action button on certain pages
  const showFAB = () => {
    const fabPaths = ['/tickets', '/dashboard', '/home'];
    return fabPaths.some(path => location.pathname.startsWith(path));
  };

  const getFABAction = () => {
    if (location.pathname.startsWith('/tickets')) {
      return { label: 'Create Ticket', path: '/tickets/create' };
    }
    if (location.pathname.startsWith('/dashboard')) {
      return { label: 'Quick Report', path: '/reports/quick' };
    }
    return { label: 'Quick Action', path: '/home' };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:hidden">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-background">
        <TopNavbar 
          isMobile={true} 
          onMobileMenuToggle={handleToggleMobileMenu} 
        />
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto bg-background",
        isBottomNavVisible && "pb-20" // Extra padding for FAB
      )}>
        {children}
      </main>

      {/* Floating Action Button */}
      {showFAB() && isBottomNavVisible && (
        <Button
          size="lg"
          className={cn(
            "fixed bottom-20 right-4 z-40",
            "h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90",
            "animate-in zoom-in-95 duration-200",
            "lg:hidden"
          )}
          onClick={() => {
            const action = getFABAction();
            // Handle FAB action - you can customize this
            console.log(`FAB clicked: ${action.label}`);
          }}
          aria-label={getFABAction().label}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Bottom Navigation */}
      {isBottomNavVisible && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
