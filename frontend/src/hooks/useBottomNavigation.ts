import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseBottomNavigationOptions {
  hideOnPaths?: string[];
  showOnMobileOnly?: boolean;
}

export const useBottomNavigation = (options: UseBottomNavigationOptions = {}) => {
  const { hideOnPaths = [], showOnMobileOnly = true } = options;
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we should hide bottom navigation on current path
  const shouldHideOnPath = hideOnPaths.some(path => 
    location.pathname.startsWith(path)
  );

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileView);
      
      if (showOnMobileOnly) {
        setIsVisible(isMobileView && !shouldHideOnPath);
      } else {
        setIsVisible(!shouldHideOnPath);
      }
    };

    // Check on mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [shouldHideOnPath, showOnMobileOnly]);

  // Update visibility when path changes
  useEffect(() => {
    if (showOnMobileOnly) {
      setIsVisible(isMobile && !shouldHideOnPath);
    } else {
      setIsVisible(!shouldHideOnPath);
    }
  }, [location.pathname, isMobile, shouldHideOnPath, showOnMobileOnly]);

  return {
    isVisible,
    isMobile,
  };
};
