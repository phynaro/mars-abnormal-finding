import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actionButton?: ActionButton;
  rightContent?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'UserPlus':
      return <UserPlus className="h-4 w-4" />;
    case 'Plus':
      return <Plus className="h-4 w-4" />;
    default:
      return <Plus className="h-4 w-4" />;
  }
};

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  actionButton,
  rightContent,
  showBackButton = false,
  onBack
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {showBackButton && onBack && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            ← {t('common.back')}
          </Button>
        )}
        <div>
          <h1 className="font-bold text-xl sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">{description}</p>
          )}
        </div>
      </div>
      {rightContent ? (
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {rightContent}
        </div>
      ) : actionButton ? (
        <Button 
          onClick={actionButton.onClick} 
          variant={actionButton.variant || 'default'}
          className="flex items-center gap-2"
        >
          {actionButton.icon && getIcon(actionButton.icon)}
          {actionButton.label}
        </Button>
      ) : null}
    </div>
  );
};
