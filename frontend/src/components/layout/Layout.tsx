import React, { useState, useEffect } from 'react';
import MobileLayout from './MobileLayout';
import { ChevronLeft, Menu } from 'lucide-react';
import IconRail from './IconRail';
import SubmenuPanel from './SubmenuPanel';
import { useLocation } from 'react-router-dom';
import { menuItems } from './menuConfig';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileView);
    };

    // Check on mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const location = useLocation();
  const findActiveId = () => {
    const match = menuItems.find(m => location.pathname.startsWith(m.path));
    return match ? match.id : 'dashboard';
  };
  const [activeId, setActiveId] = useState<string>(findActiveId());
  const [submenuCollapsed, setSubmenuCollapsed] = useState<boolean>(() => {
    const v = localStorage.getItem('submenu-collapsed-global');
    return v ? v === '1' : false
  });

  useEffect(() => {
    setActiveId(findActiveId());
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('submenu-collapsed-global', submenuCollapsed ? '1' : '0');
  }, [submenuCollapsed]);

  // Use MobileLayout for mobile devices
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop: Icon rail + optional submenu */}
      <IconRail
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          // Auto-expand submenu when selecting a main menu item that has children
          const selectedItem = menuItems.find(m => m.id === id);
          if (selectedItem?.children?.length) {
            setSubmenuCollapsed(false);
          }
        }}
      />
      {(() => {
        const active = menuItems.find(m => m.id === activeId);
        const hasChildren = !!active?.children?.length;
        if (!hasChildren) return null;
        return (
          <div className="relative sticky top-0 self-start h-[100dvh]">
            <SubmenuPanel activeId={activeId} collapsed={submenuCollapsed} />
            <button
              className="absolute top-11 -right-3 z-[60] h-7 w-7 flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors ring-1 ring-black/5"
              onClick={() => setSubmenuCollapsed(v => !v)}
              title={submenuCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
              {submenuCollapsed ? (
                <Menu className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </button>
          </div>
        );
      })()}

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
