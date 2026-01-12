import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  calculatePeriodForDate, 
  getDateRangeForAreaDashboard,
  getPeriodDateRange 
} from '@/utils/periodCalculations';
import areaDashboardService, { 
  type AreaDashboardConfig, 
  type AreaMetrics 
} from '@/services/areaDashboardService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'react-router-dom';
import { getAreaConfig } from '@/config/areaDashboardConfig';

const AreaDashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { areaName } = useParams<{ areaName: string }>();
  
  // Get configuration for the current area
  const areaConfig = areaName ? getAreaConfig(areaName) : [];

  // Time range filters
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentPeriodInfo = calculatePeriodForDate(now, currentYear);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [timeFilter, setTimeFilter] = useState<'period' | 'ytd'>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(currentPeriodInfo.period);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');

  // Data state
  const [areaData, setAreaData] = useState<AreaMetrics[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate period options (1-13)
  const periodOptions = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => i + 1);
  }, []);

  // Generate week options (1-4)
  const weekOptions = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => i + 1);
  }, []);

  // Generate year options (current year and previous 2 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 3; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  // Fetch area metrics
  const fetchAreaMetrics = async () => {
    if (!areaName) {
      setError('Area name is required');
      return;
    }
    
    if (!areaConfig || areaConfig.length === 0) {
      setError(`No configuration found for area: ${areaName}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const dateRange = getDateRangeForAreaDashboard(
        timeFilter,
        selectedYear,
        timeFilter === 'period' ? selectedPeriod : undefined,
        selectedWeek !== 'all' ? selectedWeek : undefined,
        selectedDate !== 'all' ? selectedDate : undefined
      );

      const response = await areaDashboardService.getAreaMetrics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        week: selectedWeek !== 'all' ? selectedWeek : undefined,
        date: selectedDate !== 'all' ? selectedDate : undefined,
        areaConfig
      });

      if (response.success) {
        setAreaData(response.data);
      } else {
        setError('Failed to fetch area metrics');
      }
    } catch (err: any) {
      console.error('Error fetching area metrics:', err);
      setError(err.message || 'Failed to fetch area metrics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    fetchAreaMetrics();
  }, [selectedYear, timeFilter, selectedPeriod, selectedWeek, selectedDate]);

  // Handle cell click for drill-down
  const handleCellClick = (
    areaCode: string,
    machineCode: string | null,
    puno: number | null,
    metricType?: string,
    teamType?: 'operator' | 'reliability',
    puIds?: number[]
  ) => {
    const dateRange = getDateRangeForAreaDashboard(
      timeFilter,
      selectedYear,
      timeFilter === 'period' ? selectedPeriod : undefined,
      selectedWeek !== 'all' ? selectedWeek : undefined,
      selectedDate !== 'all' ? selectedDate : undefined
    );

    const params = new URLSearchParams();
    params.set('startDate', dateRange.startDate);
    params.set('endDate', dateRange.endDate);
    
    // Don't pass area code - rely only on PU IDs
    // If multiple PU IDs provided (for machine with multiple PUs), use them
    // Otherwise use single puno if provided
    if (puIds && puIds.length > 0) {
      params.set('puno', puIds.join(','));
    } else if (puno) {
      params.set('puno', puno.toString());
    }

    // Add status filter based on metric type
    // Open tickets: all statuses NOT IN ('closed', 'finished', 'canceled', 'rejected_final')
    // This matches the logic in areaDashboardController.js
    if (metricType === 'open') {
      params.set('status', 'open,accepted,planed,in_progress,rejected_pending_l3_review,reviewed,escalated,reopened_in_progress');
    } else if (metricType === 'closed') {
      // Closed tickets: 'closed' and 'finished' statuses
      params.set('status', 'closed,finished');
    } else if (metricType === 'pending') {
      // Pending tickets have various statuses
      params.set('status', 'in_progress,escalated,planed,accepted');
    } else if (metricType === 'delay') {
      params.set('delay', 'true');
    }

    if (teamType) {
      params.set('team', teamType);
    }

    navigate(`/tickets?${params.toString()}`);
  };

  // Get all PU IDs from all machines in an area
  const getAllAreaPuIds = (area: AreaMetrics): number[] => {
    const allPuIds: number[] = [];
    area.machines.forEach(machine => {
      if (machine.puIds && machine.puIds.length > 0) {
        allPuIds.push(...machine.puIds);
      }
    });
    return allPuIds;
  };

  // Get area display name from config
  const areaDisplayName = areaConfig.length > 0 ? areaConfig[0].areaName : areaName || 'Area';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={`Area Dashboard - ${areaDisplayName}`}
        description="Ticket metrics by area and machine"
      />

      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Time Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Year Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year *</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period/YTD Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Period/YTD *</label>
              <Select
                value={timeFilter}
                onValueChange={(value) => {
                  setTimeFilter(value as 'period' | 'ytd');
                  if (value === 'ytd') {
                    setSelectedPeriod(1);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Period</SelectItem>
                  <SelectItem value="ytd">YTD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selector (if Period selected) */}
            {timeFilter === 'period' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select
                  value={selectedPeriod.toString()}
                  onValueChange={(value) => setSelectedPeriod(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period} value={period.toString()}>
                        P{period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Week Selector (optional) */}
            {timeFilter === 'period' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Week (Optional)</label>
                <Select
                  value={selectedWeek === 'all' ? 'all' : selectedWeek.toString()}
                  onValueChange={(value) => 
                    setSelectedWeek(value === 'all' ? 'all' : parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {weekOptions.map((week) => (
                      <SelectItem key={week} value={week.toString()}>
                        Week {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Selector (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date (Optional)</label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => 
                  setSelectedDate(e.target.value || 'all')
                }
              />
              {selectedDate !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate('all')}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Area Data Tables */}
      {!loading && !error && areaData.length > 0 && (
        <div className="space-y-8">
          {areaData.map((area) => (
            <div key={area.areaCode} className="space-y-4">
              <h2 className="text-xl font-semibold">{area.areaName} ({area.areaCode})</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Machine Table (2/3 width) */}
                <div className="lg:col-span-2">
                  <Card>
                    {/* <CardHeader>
                      <CardTitle>Machine Metrics</CardTitle>
                    </CardHeader> */}
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Machine</TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'open', undefined, getAllAreaPuIds(area))}
                              >
                                Open
                              </TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'closed', undefined, getAllAreaPuIds(area))}
                              >
                                Closed
                              </TableHead>
                              <TableHead className="text-center">%Closed</TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'closed', 'operator', getAllAreaPuIds(area))}
                              >
                                %Closed by Op
                              </TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'closed', 'reliability', getAllAreaPuIds(area))}
                              >
                                %Closed by Rel
                              </TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'pending', 'operator', getAllAreaPuIds(area))}
                              >
                                Pending by Op
                              </TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'pending', 'reliability', getAllAreaPuIds(area))}
                              >
                                Pending by Rel
                              </TableHead>
                              <TableHead className="text-center cursor-pointer hover:bg-muted"
                                onClick={() => handleCellClick(area.areaCode, null, null, 'delay', undefined, getAllAreaPuIds(area))}
                              >
                                Delay
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {area.machines.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">
                                  No machines found
                                </TableCell>
                              </TableRow>
                            ) : (
                              area.machines.map((machine, index) => (
                                <TableRow key={`${machine.machineName}-${index}`}>
                                  <TableCell className="font-medium">
                                    {machine.machineName}
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'open', undefined, machine.puIds)}
                                  >
                                    {machine.metrics.openTickets}
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'closed', undefined, machine.puIds)}
                                  >
                                    {machine.metrics.closedTickets}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {machine.metrics.percentClosed}%
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'closed', 'operator', machine.puIds)}
                                  >
                                    {machine.metrics.percentClosedByOperator}%
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'closed', 'reliability', machine.puIds)}
                                  >
                                    {machine.metrics.percentClosedByReliability}%
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'pending', 'operator', machine.puIds)}
                                  >
                                    {machine.metrics.pendingByOperator}
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'pending', 'reliability', machine.puIds)}
                                  >
                                    {machine.metrics.pendingByReliability}
                                  </TableCell>
                                  <TableCell className="text-center cursor-pointer hover:bg-muted"
                                    onClick={() => handleCellClick(area.areaCode, null, null, 'delay', undefined, machine.puIds)}
                                  >
                                    {machine.metrics.delayTickets}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Area KPI Card (1/3 width) */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Area Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Open</span>
                          <span 
                            className="text-lg font-bold cursor-pointer hover:text-primary"
                            onClick={() => handleCellClick(area.areaCode, null, null, 'open', undefined, getAllAreaPuIds(area))}
                          >
                            {area.areaMetrics.openTickets}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Closed</span>
                          <span 
                            className="text-lg font-bold cursor-pointer hover:text-primary"
                            onClick={() => handleCellClick(area.areaCode, null, null, 'closed', undefined, getAllAreaPuIds(area))}
                          >
                            {area.areaMetrics.closedTickets}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">%Closed</span>
                          <span className="text-lg font-bold">
                            {area.areaMetrics.percentClosed}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && areaData.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AreaDashboardPage;
