import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Sun, 
  Moon, 
  Globe, 
  User, 
  LogOut, 
  Settings, 
  Bell,
  Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getAvatarUrl } from '../../utils/url';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'L1_Operator':
        return t('role.l1_operator');
      case 'L2_Engineer':
        return t('role.l2_engineer');
      case 'L3_Manager':
        return t('role.l3_manager');
      default:
        return role;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center">
          <img 
            src="/MARS-icon.png" 
            alt="MARS Logo" 
            className="h-8 w-8"
          />
        </div>

        {/* Right side - Actions and User Menu */}
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 px-2">
                <Avatar className="h-8 w-8">
                  {user?.avatarUrl && (
                    <AvatarImage src={getAvatarUrl(user.avatarUrl)} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleDisplayName(user?.role || '')}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 mr-2" />
                {t('profile.title')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                {t('settings.title')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
