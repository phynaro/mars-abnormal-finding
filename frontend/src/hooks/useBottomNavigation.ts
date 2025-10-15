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
      const newVisibility = showOnMobileOnly ? (isMobileView && !shouldHideOnPath) : !shouldHideOnPath;
      
      setIsMobile(isMobileView);
      setIsVisible(newVisibility);
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
    const newVisibility = showOnMobileOnly ? (isMobile && !shouldHideOnPath) : !shouldHideOnPath;
    setIsVisible(newVisibility);
  }, [location.pathname, isMobile, shouldHideOnPath, showOnMobileOnly]);

  return {
    isVisible,
    isMobile,
  };
};
