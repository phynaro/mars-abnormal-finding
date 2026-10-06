import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Filter, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import dashboardService from '@/services/dashboardService';
import type {
  PersonalKPIComparisonDataPoint,
  Department,
  AssignedBreakdownRow,
  UnassignedByPlant
} from '@/types/personalKPIComparison';
import PersonalKPIComparisonFilter from '@/components/dashboard/PersonalKPIComparisonFilter';
import PersonalKPIComparisonChart from '@/components/dashboard/PersonalKPIComparisonChart';
import AssignedTicketStackedChart from '@/components/dashboard/AssignedTicketStackedChart';
import { calculatePeriodForDate, getCompanyYearDateRange, getPeriodDateRange, formatLocalDate } from '@/utils/periodCalculations';

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
  const [selectedKPI, setSelectedKPI] = useState<string>('ticketCountAssigned');
  const [filterMode, setFilterMode] = useState<'year' | 'period'>('period');

  // Data state
  const [allUsers, setAllUsers] = useState<PersonalKPIComparisonDataPoint[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [assignedRows, setAssignedRows] = useState<AssignedBreakdownRow[]>([]);
  const [unassignedByPlant, setUnassignedByPlant] = useState<UnassignedByPlant[]>([]);
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
    } catch (err) {
      console.error('Error calculating date range:', err);
      return {
        startDate: new Date(selectedYear, 0, 1).toISOString().split('T')[0],
        endDate: new Date(selectedYear, 11, 31).toISOString().split('T')[0],
        compare_startDate: '',
        compare_endDate: ''
      };
    }
  }, [filterMode, selectedYear, selectedPeriod]);

  // Filter users based on department selection first.
  // An empty department selection means none selected (Clear), not "all departments".
  const usersFilteredByDept = useMemo(() => {
    if (selectedDepartments.length === 0) {
      return [];
    }
    if (selectedDepartments.length === availableDepartments.length) {
      return allUsers;
    }
    return allUsers.filter(user =>
      user.deptNo && selectedDepartments.includes(user.deptNo)
    );
  }, [allUsers, selectedDepartments, availableDepartments]);

  // Filter users based on user selection.
  // An empty user selection means none selected (Clear), not "all users".
  const filteredUsers = useMemo(() => {
    if (selectedUsers.length === 0) {
      return [];
    }
    return usersFilteredByDept.filter(user => selectedUsers.includes(user.personno));
  }, [usersFilteredByDept, selectedUsers]);

  // Assigned breakdown rows filtered by department + users (Unassigned ignored here)
  const filteredAssignedRows = useMemo(() => {
    if (selectedDepartments.length === 0 || selectedUsers.length === 0) {
      return [];
    }
    return assignedRows.filter((row) => {
      const deptOk =
        selectedDepartments.length === availableDepartments.length ||
        (row.deptNo != null && selectedDepartments.includes(row.deptNo));
      const userOk = selectedUsers.includes(row.personno);
      return deptOk && userOk;
    });
  }, [assignedRows, selectedDepartments, selectedUsers, availableDepartments.length]);

  // Auto-select everyone only on the first successful load.
  const selectionInitializedRef = useRef(false);

  // Fetch comparison + assigned breakdown when date range changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [comparisonResponse, breakdownResponse] = await Promise.all([
          dashboardService.getPersonalKPIComparison({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }),
          dashboardService.getPersonalKPIAssignedBreakdown({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          })
        ]);

        if (!comparisonResponse.success) {
          setError(t('dashboard.personalKPIComparison.errorFetchingData'));
          return;
        }

        const breakdownRows = breakdownResponse.success ? breakdownResponse.data.rows : [];
        const unassigned = breakdownResponse.success ? breakdownResponse.data.unassigned : [];
        setAssignedRows(breakdownRows);
        setUnassignedByPlant(unassigned);

        // Totals per person across plants for summary cards / merge
        const assignedTotals = new Map<number, number>();
        const breakdownPeople = new Map<number, AssignedBreakdownRow>();
        for (const row of breakdownRows) {
          const total =
            row.closedOnTime + row.closedDelay + row.openNotDue + row.openOverdue;
          assignedTotals.set(row.personno, (assignedTotals.get(row.personno) || 0) + total);
          if (!breakdownPeople.has(row.personno)) {
            breakdownPeople.set(row.personno, row);
          }
        }

        const comparisonUsers = comparisonResponse.data.users.map((user) => ({
          ...user,
          ticketCountAssigned: assignedTotals.get(user.personno) || 0
        }));

        // Merge people who appear only in the assigned breakdown
        const existingIds = new Set(comparisonUsers.map((u) => u.personno));
        const extraUsers: PersonalKPIComparisonDataPoint[] = [];
        for (const [personno, row] of breakdownPeople) {
          if (existingIds.has(personno)) continue;
          extraUsers.push({
            personno: row.personno,
            personName: row.personName,
            deptNo: row.deptNo,
            deptCode: row.deptCode,
            deptName: row.deptName,
            avatarUrl: row.avatarUrl,
            initials: row.initials,
            bgColor: row.bgColor,
            ticketCountCreated: 0,
            ticketCountClosed: 0,
            downtimeSavedCreated: 0,
            downtimeSavedAssigned: 0,
            costSavedCreated: 0,
            costSavedAssigned: 0,
            ontimePercentage: 0,
            avgResolutionHours: 0,
            ticketCountAssigned: assignedTotals.get(personno) || 0
          });
        }

        const mergedUsers = [...comparisonUsers, ...extraUsers].sort((a, b) =>
          a.personName.localeCompare(b.personName)
        );

        // Merge departments from comparison + breakdown-only people
        const deptMap = new Map<number, Department>();
        for (const dept of comparisonResponse.data.departments) {
          deptMap.set(dept.DEPTNO, dept);
        }
        for (const user of extraUsers) {
          if (user.deptNo != null && !deptMap.has(user.deptNo)) {
            deptMap.set(user.deptNo, {
              DEPTNO: user.deptNo,
              DEPTCODE: user.deptCode || '',
              DEPTNAME: user.deptName || ''
            });
          }
        }
        const departments = Array.from(deptMap.values()).sort((a, b) =>
          a.DEPTNAME.localeCompare(b.DEPTNAME)
        );

        setAllUsers(mergedUsers);
        setAvailableDepartments(departments);

        if (!selectionInitializedRef.current) {
          selectionInitializedRef.current = true;
          setSelectedDepartments(departments.map((dept) => dept.DEPTNO));
          setSelectedUsers(mergedUsers.map((user) => user.personno));
        } else {
          const departmentIds = new Set(departments.map((dept) => dept.DEPTNO));
          const userIds = new Set(mergedUsers.map((user) => user.personno));
          setSelectedDepartments((prev) => prev.filter((id) => departmentIds.has(id)));
          setSelectedUsers((prev) => prev.filter((id) => userIds.has(id)));
        }

        if (!breakdownResponse.success) {
          console.warn('Assigned breakdown fetch failed; chart may be empty');
        }
      } catch (err) {
        console.error('Error fetching personal KPI comparison data:', err);
        setError(
          err instanceof Error
            ? err.message
            : t('dashboard.personalKPIComparison.errorFetchingData')
        );
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
      const availableUserIds = allUsers.map((user) => user.personno);
      const validSelectedUsers = selectedUsers.filter((userId) =>
        availableUserIds.includes(userId)
      );

      if (validSelectedUsers.length !== selectedUsers.length) {
        setSelectedUsers(validSelectedUsers.length > 0 ? validSelectedUsers : availableUserIds);
      }
    }
  }, [allUsers, selectedUsers]);

  const isAssignedKPI = selectedKPI === 'ticketCountAssigned';

  // Totals per assigned-state category (for KPI tiles above the chart)
  const assignedStateTotals = useMemo(() => {
    const totals = {
      closedOnTime: 0,
      closedDelay: 0,
      openNotDue: 0,
      openOverdue: 0,
      unassigned: unassignedByPlant.reduce((sum, item) => sum + item.count, 0)
    };
    for (const row of filteredAssignedRows) {
      totals.closedOnTime += row.closedOnTime;
      totals.closedDelay += row.closedDelay;
      totals.openNotDue += row.openNotDue;
      totals.openOverdue += row.openOverdue;
    }
    return totals;
  }, [filteredAssignedRows, unassignedByPlant]);

  const openAssignedStateTickets = (
    bucket: 'closedOnTime' | 'closedDelay' | 'openNotDue' | 'openOverdue' | 'unassigned'
  ) => {
    const params = new URLSearchParams();
    params.set('assignedBucket', bucket);

    if (bucket === 'unassigned') {
      params.set('startDate', dateRange.startDate);
      params.set('endDate', dateRange.endDate);
    } else {
      params.set('dueStartDate', dateRange.startDate);
      params.set('dueEndDate', dateRange.endDate);
      // Match tile totals: only the currently selected users (omit when all selected)
      if (
        selectedUsers.length > 0 &&
        selectedUsers.length < allUsers.length
      ) {
        params.set('assigned_to', selectedUsers.join(','));
      }
    }

    window.open(`/tickets?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (isAssignedKPI) {
      const totalsByPerson = new Map<number, number>();
      for (const row of filteredAssignedRows) {
        const total =
          row.closedOnTime + row.closedDelay + row.openNotDue + row.openOverdue;
        totalsByPerson.set(row.personno, (totalsByPerson.get(row.personno) || 0) + total);
      }
      const values = Array.from(totalsByPerson.values());
      if (values.length === 0) {
        return { totalUsers: 0, avgValue: 0, maxValue: 0, minValue: 0 };
      }
      const sum = values.reduce((acc, val) => acc + val, 0);
      return {
        totalUsers: values.length,
        avgValue: sum / values.length,
        maxValue: Math.max(...values),
        minValue: Math.min(...values)
      };
    }

    if (filteredUsers.length === 0) {
      return { totalUsers: 0, avgValue: 0, maxValue: 0, minValue: 0 };
    }

    const values = filteredUsers.map(
      (user) => user[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number
    );

    const sum = values.reduce((acc, val) => acc + val, 0);
    return {
      totalUsers: filteredUsers.length,
      avgValue: sum / values.length,
      maxValue: Math.max(...values),
      minValue: Math.min(...values)
    };
  }, [filteredUsers, selectedKPI, isAssignedKPI, filteredAssignedRows]);

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
    } else if (
      selectedKPI === 'avgResolutionHours' ||
      selectedKPI === 'downtimeSavedCreated' ||
      selectedKPI === 'downtimeSavedAssigned'
    ) {
      return `${value.toFixed(1)}h`;
    } else {
      return value.toFixed(0);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('dashboard.personalKPIComparison.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.personalKPIComparison.description')}
          </p>
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
              <span>{t('common.showFilters')}</span>
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
      <div
        className={`grid gap-6 transition-all duration-300 ${
          isFilterPanelOpen ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'
        }`}
      >
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
          {/* Summary Cards / Assigned state tiles */}
          {isAssignedKPI ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {(
                [
                  {
                    key: 'closedOnTime',
                    label: t('dashboard.personalKPIComparison.closedOnTime'),
                    value: assignedStateTotals.closedOnTime,
                    color: '#166534'
                  },
                  {
                    key: 'closedDelay',
                    label: t('dashboard.personalKPIComparison.closedDelay'),
                    value: assignedStateTotals.closedDelay,
                    color: '#84CC16'
                  },
                  {
                    key: 'openNotDue',
                    label: t('dashboard.personalKPIComparison.openNotDue'),
                    value: assignedStateTotals.openNotDue,
                    color: '#FACC15'
                  },
                  {
                    key: 'openOverdue',
                    label: t('dashboard.personalKPIComparison.openOverdue'),
                    value: assignedStateTotals.openOverdue,
                    color: '#DC2626'
                  },
                  {
                    key: 'unassigned',
                    label: t('dashboard.personalKPIComparison.unassigned'),
                    value: assignedStateTotals.unassigned,
                    color: '#9CA3AF'
                  }
                ] as const
              ).map((tile) => (
                <Card
                  key={tile.key}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openAssignedStateTickets(tile.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openAssignedStateTickets(tile.key);
                    }
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium leading-snug">
                      {tile.label}
                    </CardTitle>
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: tile.color }}
                      aria-hidden
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tile.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
          )}

          {/* Chart Panel */}
          {isAssignedKPI ? (
            <AssignedTicketStackedChart
              rows={filteredAssignedRows}
              unassigned={unassignedByPlant}
              loading={loading}
              error={error}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          ) : (
            <PersonalKPIComparisonChart
              data={filteredUsers}
              selectedKPI={selectedKPI}
              loading={loading}
              error={error}
            />
          )}

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
                    })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PersonalKPIComparisonPage;
