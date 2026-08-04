import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBottomNavigation } from '../../hooks/useBottomNavigation';
import TopNavbar from './TopNavbar';
import BottomNavigation from './BottomNavigation';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
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


  return (
    <div className="min-h-screen bg-background flex flex-col lg:hidden">
      {/* Top Navigation - Now fixed with blur effect */}
      <TopNavbar 
        isMobile={true} 
        onMobileMenuToggle={handleToggleMobileMenu} 
      />

      {/* Main Content - Add top padding to account for fixed navbar */}
      <main className={cn(
        "flex-1 overflow-auto bg-background pt-16", // pt-16 to account for fixed navbar height
        isBottomNavVisible && "pb-20" // Extra padding for FAB
      )}>
        {children}
      </main>

      {/* Floating Action Button
      {showFAB() && isBottomNavVisible && (
        <Button
          size="lg"
          className={cn(
            "fixed bottom-20 right-4 z-40",
            "h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90",
            "text-primary-foreground",
            "flex items-center justify-center",
            "animate-in zoom-in-95 duration-200",
            "lg:hidden"
          )}
          onClick={() => {
            const action = getFABAction();
            console.log(`FAB clicked: ${action.label} - navigating to ${action.path}`);
            navigate(action.path);
          }}
          aria-label={getFABAction().label}
        >
          <span className="text-2xl font-bold text-primary-foreground">+</span>
        </Button>
      )} */}

      {/* Bottom Navigation */}
      {isBottomNavVisible && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
