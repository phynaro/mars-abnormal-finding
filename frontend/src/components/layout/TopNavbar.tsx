import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePeriodWeek } from '../../hooks/usePeriodWeek';
import {
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavbarProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  onMobileMenuToggle,
  isMobile = false
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { periodWeek } = usePeriodWeek();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and Period/Week */}
        <div className="flex items-center gap-4">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${theme === 'dark' ? 'bg-white' : ''}`}>
            <img
              src="/Eden_Logo.png"
              alt="MARS Logo"
              className="h-6 w-6"
              onClick={() => navigate('/home')}
            />
          </div>

        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          {/* <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button> */}

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {language === 'en' ? 'EN' : 'TH'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'bg-accent text-accent-foreground' : ''}
              >
                {t('language.english')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('th')}
                className={language === 'th' ? 'bg-accent text-accent-foreground' : ''}
              >
                {t('language.thai')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Period/Week Display - Right most side */}
          {periodWeek && (
            <div className="flex items-center gap-2 px-3 py-1">
              <span className="text-sm font-medium text-primary">
                {periodWeek.display}
              </span>
              <span className="text-xs text-muted-foreground">
                {periodWeek.year}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
