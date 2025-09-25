import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { menuItems, type MenuItem } from './menuConfig';
import { useAuth } from '@/contexts/AuthContext';

interface SubmenuPanelProps {
  activeId: string | null;
  collapsed?: boolean;
}

export const SubmenuPanel: React.FC<SubmenuPanelProps> = ({ activeId, collapsed = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Permission checks disabled for submenu: show all children
  const canAccess = (_item: MenuItem) => true;

  const active = menuItems.find(m => m.id === activeId) || null;
  const hasChildren = !!active?.children?.length;
  // Render container to support slide animation even when collapsed

  const items = (active?.children || []);

  return (
    <div className={`sticky top-0 self-start h-[100dvh] border-r bg-card flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden ${!active || !hasChildren ? 'w-0 min-w-0' : (collapsed ? 'w-0 min-w-0' : 'w-48 min-w-[128px]')}`}>
      {active && hasChildren && !collapsed && (
        <>
          <div className="px-4 py-3 flex items-center justify-between border-b min-w-0">
            <div className="font-medium truncate">{active.label}</div>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 transition-opacity duration-300 opacity-100">
            {items.map(child => {
              const isActive = location.pathname === child.path;
              return (
                <button
                  key={child.id}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground min-w-0 ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                  onClick={() => navigate(child.path)}
                >
                  <span className="">{child.icon}</span>
                  <span className="text-sm truncate">{child.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
};

export default SubmenuPanel;
