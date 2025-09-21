import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { menuItems } from './menuConfig';

function getTrail(pathname: string) {
  const parent = menuItems.find(m => pathname.startsWith(m.path));
  if (!parent) return [] as { label: string; path: string }[];
  const children = (parent.children || []);
  const child = children.find(c => pathname === c.path || pathname.startsWith(c.path + '/'));
  const trail = [{ label: parent.label, path: parent.path }];
  if (child) trail.push({ label: child.label, path: child.path });
  return trail;
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const state = (location.state || {}) as any;
  let trail = getTrail(location.pathname);
  // Allow pages to tweak breadcrumb via navigation state
  if (state?.breadcrumbHideParent && trail.length > 1) {
    // Drop the top-level parent to show only submenu
    trail = trail.slice(1);
  }
  if (state?.breadcrumbExtra) {
    trail = [...trail, { label: String(state.breadcrumbExtra), path: '' }];
  }
  if (!trail.length) return null;
  return (
    <nav className="px-4 py-2 text-sm text-muted-foreground border-b bg-background/60 sticky top-0 z-10 backdrop-blur">
      <ol className="flex items-center gap-2">
        {trail.map((t, i) => (
          <li key={t.path} className="flex items-center gap-2">
            {i > 0 && <span className="opacity-50">/</span>}
            {i < trail.length - 1 && t.path ? (
              <Link to={t.path} className="hover:text-foreground">{t.label}</Link>
            ) : (
              <span className="text-foreground font-medium">{t.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
