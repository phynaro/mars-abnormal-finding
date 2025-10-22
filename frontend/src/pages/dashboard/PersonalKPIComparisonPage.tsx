import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Filter, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import dashboardService from '@/services/dashboardService';
import type { PersonalKPIComparisonDataPoint, Department } from '@/types/personalKPIComparison';
import PersonalKPIComparisonFilter from '@/components/dashboard/PersonalKPIComparisonFilter';
import PersonalKPIComparisonChart from '@/components/dashboard/PersonalKPIComparisonChart';
import { getDateRangeForFilter, calculatePeriodForDate, getCompanyYearDateRange, getPeriodDateRange, formatLocalDate } from '@/utils/periodCalculations';

const PersonalKPIComparisonPage: React.FC = () => {
  const { t } = useLanguage();

  // Filter panel visibility state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);

  // Filter state - auto-select current year and period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentPeriodInfo = calculatePeriodForDate(now, currentYear);
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(currentPeriodInfo.period);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<string>('ticketCountCreated');
  const [filterMode, setFilterMode] = useState<'year' | 'period'>('period');

  // Data state
  const [allUsers, setAllUsers] = useState<PersonalKPIComparisonDataPoint[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on filter mode
  const dateRange = useMemo(() => {
    try {
      if (filterMode === 'year') {
        const { startDate, endDate } = getCompanyYearDateRange(selectedYear);
        return {
          startDate: formatLocalDate(startDate),
          endDate: formatLocalDate(endDate),
          compare_startDate: '',
          compare_endDate: ''
        };
      } else {
        const { startDate, endDate } = getPeriodDateRange(selectedYear, selectedPeriod);
        return {
          startDate: formatLocalDate(startDate),
          endDate: formatLocalDate(endDate),
          compare_startDate: '',
          compare_endDate: ''
        };
      }
    } catch (error) {
      console.error('Error calculating date range:', error);
      return {
        startDate: new Date(selectedYear, 0, 1).toISOString().split('T')[0],
        endDate: new Date(selectedYear, 11, 31).toISOString().split('T')[0],
        compare_startDate: '',
        compare_endDate: ''
      };
    }
  }, [filterMode, selectedYear, selectedPeriod]);

  // Filter users based on department selection first
  const usersFilteredByDept = useMemo(() => {
    if (selectedDepartments.length === 0 || selectedDepartments.length === availableDepartments.length) {
      return allUsers;
    }
    return allUsers.filter(user => 
      user.deptNo && selectedDepartments.includes(user.deptNo)
    );
  }, [allUsers, selectedDepartments, availableDepartments]);

  // Filter users based on user selection
  const filteredUsers = useMemo(() => {
    if (selectedUsers.length === 0) {
      return usersFilteredByDept;
    }
    return usersFilteredByDept.filter(user => selectedUsers.includes(user.personno));
  }, [usersFilteredByDept, selectedUsers]);

  // Fetch data when year or period changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardService.getPersonalKPIComparison({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });

        if (response.success) {
          setAllUsers(response.data.users);
          console.log(response.data.users);
          setAvailableDepartments(response.data.departments);
          console.log(response.data.departments);
          // Auto-select all departments if none are selected
          if (selectedDepartments.length === 0) {
            setSelectedDepartments(response.data.departments.map(dept => dept.DEPTNO));
          }
          
          // Auto-select all users if none are selected
          if (selectedUsers.length === 0) {
            setSelectedUsers(response.data.users.map(user => user.personno));
          }
        } else {
          setError(t('dashboard.personalKPIComparison.errorFetchingData'));
        }
      } catch (err) {
        console.error('Error fetching personal KPI comparison data:', err);
        setError(err instanceof Error ? err.message : t('dashboard.personalKPIComparison.errorFetchingData'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange.startDate, dateRange.endDate, t]);

  // Keyboard shortcut for toggling filter panel (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset selected users when data changes (if selected users are no longer available)
  useEffect(() => {
    if (allUsers.length > 0 && selectedUsers.length > 0) {
      const availableUserIds = allUsers.map(user => user.personno);
      const validSelectedUsers = selectedUsers.filter(userId => availableUserIds.includes(userId));
      
      if (validSelectedUsers.length !== selectedUsers.length) {
        setSelectedUsers(validSelectedUsers.length > 0 ? validSelectedUsers : availableUserIds);
      }
    }
  }, [allUsers, selectedUsers]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredUsers.length === 0) {
      return {
        totalUsers: 0,
        avgValue: 0,
        maxValue: 0,
        minValue: 0
      };
    }

    const values = filteredUsers.map(user => 
      user[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number
    );
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      totalUsers: filteredUsers.length,
      avgValue: avg,
      maxValue: max,
      minValue: min
    };
  }, [filteredUsers, selectedKPI]);

  // Format value for display
  const formatValue = (value: number): string => {
    if (selectedKPI === 'costSavedCreated' || selectedKPI === 'costSavedAssigned') {
      if (value >= 1000000) {
        return `฿${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `฿${(value / 1000).toFixed(0)}K`;
      } else {
        return `฿${value.toFixed(0)}`;
      }
    } else if (selectedKPI === 'ontimePercentage') {
      return `${value.toFixed(1)}%`;
    } else if (selectedKPI === 'avgResolutionHours' || selectedKPI === 'downtimeSavedCreated' || selectedKPI === 'downtimeSavedAssigned') {
      return `${value.toFixed(1)}h`;
    } else {
      return value.toFixed(0);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.personalKPIComparison.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.personalKPIComparison.description')}</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isFilterPanelOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterPanelOpen(true)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>{t("common.showFilters")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Layout: Filter Panel (Left) + Content (Right) */}
      <div className={`grid gap-6 transition-all duration-300 ${isFilterPanelOpen ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'}`}>
        {/* Filter Panel - Left Side */}
        {isFilterPanelOpen && (
          <div className="lg:col-span-1">
            <PersonalKPIComparisonFilter
              selectedYear={selectedYear}
              selectedPeriod={selectedPeriod}
              selectedUsers={selectedUsers}
              selectedDepartments={selectedDepartments}
              selectedKPI={selectedKPI}
              filterMode={filterMode}
              availableUsers={usersFilteredByDept}
              availableDepartments={availableDepartments}
              onYearChange={setSelectedYear}
              onPeriodChange={setSelectedPeriod}
              onUsersChange={setSelectedUsers}
              onDepartmentsChange={setSelectedDepartments}
              onKPIChange={setSelectedKPI}
              onFilterModeChange={setFilterMode}
              onHideFilters={() => setIsFilterPanelOpen(false)}
            />
          </div>
        )}

        {/* Right Side Content */}
        <div className={`space-y-6 ${isFilterPanelOpen ? 'lg:col-span-3' : 'col-span-1'}`}>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.personalKPIComparison.totalUsers')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.personalKPIComparison.outOf', { total: allUsers.length })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.personalKPIComparison.average')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatValue(summaryStats.avgValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.personalKPIComparison.averageDescription')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.personalKPIComparison.highest')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatValue(summaryStats.maxValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.personalKPIComparison.highestDescription')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.personalKPIComparison.lowest')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatValue(summaryStats.minValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.personalKPIComparison.lowestDescription')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Panel */}
          <PersonalKPIComparisonChart
            data={filteredUsers}
            selectedKPI={selectedKPI}
            loading={loading}
            error={error}
          />

          {/* Date Range Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('dashboard.personalKPIComparison.dateRange')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {filterMode === 'year' 
                  ? t('dashboard.personalKPIComparison.yearRangeDescription', {
                      year: selectedYear,
                      startDate: new Date(dateRange.startDate).toLocaleDateString(),
                      endDate: new Date(dateRange.endDate).toLocaleDateString()
                    })
                  : t('dashboard.personalKPIComparison.periodRangeDescription', {
                      year: selectedYear,
                      period: selectedPeriod,
                      startDate: new Date(dateRange.startDate).toLocaleDateString(),
                      endDate: new Date(dateRange.endDate).toLocaleDateString()
                    })
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PersonalKPIComparisonPage;
