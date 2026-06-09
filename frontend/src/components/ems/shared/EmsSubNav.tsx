import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isMenuChildPathActive } from '@/components/layout/menuConfig';
import type { LucideIcon } from 'lucide-react';

export interface EmsNavTab {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface EmsSubNavProps {
  tabs: EmsNavTab[];
  className?: string;
}

const EmsSubNav: React.FC<EmsSubNavProps> = ({ tabs, className }) => {
  return (
    <nav
      className={cn(
        'inline-flex h-10 w-full sm:w-auto max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground scrollbar-thin',
        className
      )}
      aria-label="EMS sections"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          isActive={(_, location) => isMenuChildPathActive(location.pathname, to)}
          className={({ isActive }) =>
            cn(
              'inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/60 hover:text-foreground'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default EmsSubNav;
