import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { menuItems, type MenuItem } from './menuConfig';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodWeek } from '@/hooks/usePeriodWeek';
import { Globe, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { getAvatarUrl } from '../../utils/url';

interface IconRailProps {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const IconRail: React.FC<IconRailProps> = ({ activeId, onSelect }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { periodWeek } = usePeriodWeek();

  // Permission checks disabled: show all items regardless of user level
  const canAccess = (_item: MenuItem) => true;

  // If user clicked an icon that has submenu but hasn't navigated yet,
  // highlight only that icon (not the previous route's icon)
  const activeMenu = menuItems.find(m => m.id === activeId);
  const forceHighlightById = !!activeMenu?.children?.length && !location.pathname.startsWith(activeMenu.path);

  return (
    <div className="sticky top-0 self-start flex h-[100dvh] flex-col justify-between bg-primary text-primary-foreground w-10 min-w-[48px] flex-none z-50">
      <TooltipProvider>
        <div className="flex flex-col items-center py-3 gap-2">
          {menuItems.map(item => {
            const isActive = forceHighlightById ? (activeId === item.id) : location.pathname.startsWith(item.path);
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${isActive ? 'bg-primary-foreground/20' : 'hover:bg-primary-foreground/10'}`}
                    onClick={() => {
                      onSelect(item.id);
                      if (item.children && item.children.length > 0) {
                        const first = item.children[0];
                        navigate(first.path);
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    {isActive && (
                      <span className="absolute left-0 h-6 w-1 bg-primary-foreground rounded-full" />
                    )}
                    <span className="[&>*]:text-primary-foreground">{item.icon}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[9999]">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        

        
        <div className="flex flex-col items-center py-3 gap-2">


          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-primary-foreground/10" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-[9999]">Theme</TooltipContent>
          </Tooltip>
          {/* Language switch */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-primary-foreground/10">
                <Globe className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[9999]">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent text-accent-foreground' : ''}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('th')} className={language === 'th' ? 'bg-accent text-accent-foreground' : ''}>ไทย</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Profile/Logout with Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-primary-foreground/10 overflow-hidden">
                <Avatar className="h-8 w-8">
                  {user?.avatarUrl ? (
                    <AvatarImage src={getAvatarUrl(user.avatarUrl)} />
                  ) : null}
                  <AvatarFallback className="bg-primary-foreground text-primary">
                    {(user?.firstName?.[0] || 'U')}{(user?.lastName?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[9999]">
              <DropdownMenuLabel>{user?.firstName} {user?.lastName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { try { await logout(); } catch {} }}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

                            {/* Period/Week Display */}
        {periodWeek && (
          <div className="flex flex-col items-center py-1 px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center justify-center h-10 w-10 rounded-md">
                <span className="text-[10px] font-bold text-primary-foreground leading-none">
                    {periodWeek.display}
                  </span>
                <span className="text-xm text-primary-foreground/70 leading-none">
                    {periodWeek.year}
                  </span>


                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[9999]">
                <div className="text-center">
                  <div className="font-medium">Current Period & Week</div>
                  <div className="text-sm text-muted-foreground">
                    Period {periodWeek.period}, Week {periodWeek.week}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {periodWeek.date}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        </div>
      </TooltipProvider>

      
    </div>
  );
};

export default IconRail;
