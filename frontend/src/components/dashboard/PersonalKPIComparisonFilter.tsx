import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Filter, X, ChevronLeft, ChevronRight, Building2, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PersonalKPIComparisonDataPoint, Department } from '@/types/personalKPIComparison';

export interface PersonalKPIComparisonFilterProps {
  selectedYear: number;
  selectedPeriod: number;
  selectedUsers: number[];
  selectedDepartments: number[];
  selectedKPI: string;
  filterMode: 'year' | 'period';
  availableUsers: PersonalKPIComparisonDataPoint[];
  availableDepartments: Department[];
  onYearChange: (year: number) => void;
  onPeriodChange: (period: number) => void;
  onUsersChange: (users: number[]) => void;
  onDepartmentsChange: (departments: number[]) => void;
  onKPIChange: (kpi: string) => void;
  onFilterModeChange: (mode: 'year' | 'period') => void;
  onHideFilters: () => void;
}

const KPI_OPTIONS = [
  { value: 'ticketCountCreated', label: 'dashboard.personalKPIComparison.ticketCountCreated' },
  { value: 'ticketCountClosed', label: 'dashboard.personalKPIComparison.ticketCountClosed' },
  { value: 'downtimeSavedCreated', label: 'dashboard.personalKPIComparison.downtimeSavedCreated' },
  { value: 'downtimeSavedAssigned', label: 'dashboard.personalKPIComparison.downtimeSavedAssigned' },
  { value: 'costSavedCreated', label: 'dashboard.personalKPIComparison.costSavedCreated' },
  { value: 'costSavedAssigned', label: 'dashboard.personalKPIComparison.costSavedAssigned' },
  { value: 'ontimePercentage', label: 'dashboard.personalKPIComparison.ontimePercentage' },
  { value: 'avgResolutionHours', label: 'dashboard.personalKPIComparison.avgResolutionHours' }
];

const PersonalKPIComparisonFilter: React.FC<PersonalKPIComparisonFilterProps> = ({
  selectedYear,
  selectedPeriod,
  selectedUsers,
  selectedDepartments,
  selectedKPI,
  filterMode,
  availableUsers,
  availableDepartments,
  onYearChange,
  onPeriodChange,
  onUsersChange,
  onDepartmentsChange,
  onKPIChange,
  onFilterModeChange,
  onHideFilters
}) => {
  const { t } = useLanguage();

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate period options (1-13)
  const periodOptions = Array.from({ length: 13 }, (_, i) => i + 1);

  // Navigation handlers
  const handlePrevious = () => {
    if (filterMode === 'period') {
      if (selectedPeriod > 1) {
        onPeriodChange(selectedPeriod - 1);
      } else {
        onYearChange(selectedYear - 1);
        onPeriodChange(13);
      }
    } else {
      onYearChange(selectedYear - 1);
    }
  };

  const handleNext = () => {
    if (filterMode === 'period') {
      if (selectedPeriod < 13) {
        onPeriodChange(selectedPeriod + 1);
      } else {
        onYearChange(selectedYear + 1);
        onPeriodChange(1);
      }
    } else {
      onYearChange(selectedYear + 1);
    }
  };

  const handleUserToggle = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      onUsersChange(selectedUsers.filter(id => id !== userId));
    } else {
      onUsersChange([...selectedUsers, userId]);
    }
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === availableUsers.length) {
      onUsersChange([]);
    } else {
      onUsersChange(availableUsers.map(user => user.personno));
    }
  };

  const handleClearAllUsers = () => {
    onUsersChange([]);
  };

  const handleDepartmentToggle = (deptNo: number) => {
    if (selectedDepartments.includes(deptNo)) {
      onDepartmentsChange(selectedDepartments.filter(id => id !== deptNo));
    } else {
      onDepartmentsChange([...selectedDepartments, deptNo]);
    }
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === availableDepartments.length) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange(availableDepartments.map(dept => dept.DEPTNO));
    }
  };

  const handleClearAllDepartments = () => {
    onDepartmentsChange([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>{t('dashboard.personalKPIComparison.filters')}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHideFilters}
            className="h-8 w-8 p-0"
            title={t("common.hideFilters")}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Mode Toggle */}
        <div className="space-y-2">
          <Label>{t('dashboard.personalKPIComparison.filterMode')}</Label>
          <div className="flex space-x-1 p-1 bg-muted rounded-lg">
            <Button
              variant={filterMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterModeChange('year')}
              className="flex-1"
            >
              {t('dashboard.personalKPIComparison.year')}
            </Button>
            <Button
              variant={filterMode === 'period' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterModeChange('period')}
              className="flex-1"
            >
              {t('dashboard.personalKPIComparison.period')}
            </Button>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="space-y-2">
          <Label>{t('dashboard.personalKPIComparison.navigation')}</Label>
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {/* <span>{t('dashboard.personalKPIComparison.previous')}</span> */}
            </Button>
            
            <div className="text-center font-medium">
              {filterMode === 'year' 
                ? selectedYear.toString()
                : `${selectedYear} P${selectedPeriod}`
              }
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="flex items-center space-x-1"
            >
              {/* <span>{t('dashboard.personalKPIComparison.next')}</span> */}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Year and Period Selection */}
        {filterMode === 'period' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year-select">{t('dashboard.personalKPIComparison.year')}</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.personalKPIComparison.selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-select">{t('dashboard.personalKPIComparison.period')}</Label>
              <Select value={selectedPeriod.toString()} onValueChange={(value) => onPeriodChange(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.personalKPIComparison.selectPeriod')} />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(period => (
                    <SelectItem key={period} value={period.toString()}>
                      P{period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filterMode === 'year' && (
          <div className="space-y-2">
            <Label htmlFor="year-select">{t('dashboard.personalKPIComparison.year')}</Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.personalKPIComparison.selectYear')} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* KPI Selection */}
        <div className="space-y-2">
          <Label htmlFor="kpi-select">{t('dashboard.personalKPIComparison.kpi')}</Label>
          <Select value={selectedKPI} onValueChange={onKPIChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('dashboard.personalKPIComparison.selectKPI')} />
            </SelectTrigger>
            <SelectContent>
              {KPI_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>{t('dashboard.personalKPIComparison.department')}</span>
            </Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllDepartments}
                disabled={availableDepartments.length === 0}
                className="text-xs px-2 py-1"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAllDepartments}
                className="text-xs px-2 py-1"
              >
                <Square className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Department List */}
          <div className="max-h-48 overflow-y-auto border rounded-md">
            {availableDepartments.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {t('dashboard.personalKPIComparison.noDepartmentsFound')}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableDepartments.map(dept => (
                  <div
                    key={dept.DEPTNO}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleDepartmentToggle(dept.DEPTNO)}
                  >
                    <Checkbox
                      checked={selectedDepartments.includes(dept.DEPTNO)}
                      onChange={() => handleDepartmentToggle(dept.DEPTNO)}
                    />
                    <span className="text-sm flex-1">{dept.DEPTNAME}</span>
                    <Badge variant="outline" className="text-xs">{dept.DEPTCODE}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('dashboard.personalKPIComparison.users')}</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllUsers}
                disabled={availableUsers.length === 0}
                className="text-xs px-2 py-1"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAllUsers}
                className="text-xs px-2 py-1"
              >
                <Square className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {availableUsers.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {t('dashboard.personalKPIComparison.noUsersFound')}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableUsers.map(user => (
                  <div
                    key={user.personno}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleUserToggle(user.personno)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.personno)}
                      onChange={() => handleUserToggle(user.personno)}
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatarUrl} alt={user.personName} />
                      <AvatarFallback style={{ backgroundColor: user.bgColor, color: 'white' }} className="text-xs">
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.personName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {filterMode === 'year' 
              ? t('dashboard.personalKPIComparison.yearSummary', {
                  year: selectedYear,
                  kpi: t(KPI_OPTIONS.find(opt => opt.value === selectedKPI)?.label || ''),
                  userCount: selectedUsers.length,
                  totalUsers: availableUsers.length
                })
              : t('dashboard.personalKPIComparison.periodSummary', {
                  year: selectedYear,
                  period: selectedPeriod,
                  kpi: t(KPI_OPTIONS.find(opt => opt.value === selectedKPI)?.label || ''),
                  userCount: selectedUsers.length,
                  totalUsers: availableUsers.length
                })
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalKPIComparisonFilter;
