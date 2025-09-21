import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import dashboardService, { type GroupBy, type TrendPoint } from '@/services/dashboardService';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import personnelService from '@/services/personnelService';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';

const DashboardMaintenanceKPIPageBackup: React.FC = () => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [groupBy, setGroupBy] = useState<GroupBy>('daily');
  const [startDate, setStartDate] = useState(fmt(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(fmt(today));
  const [woType, setWoType] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [site, setSite] = useState<string>('');
  const [assign, setAssign] = useState<string>('');

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [filters, setFilters] = useState<{ woTypes: any[]; departments: any[]; sites: any[] }>({ woTypes: [], departments: [], sites: [] });
  const [periodInfo, setPeriodInfo] = useState<Record<string, any>>({});
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Personnel data for assign filter
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [personnelLoading, setPersonnelLoading] = useState<boolean>(false);

  // Period range selectors
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [fromPeriod, setFromPeriod] = useState<string>('');
  const [toPeriod, setToPeriod] = useState<string>('');
  const [fromYear, setFromYear] = useState<string>('');
  const [toYear, setToYear] = useState<string>('');

  // Load personnel data for assign filter
  const loadPersonnel = async () => {
    try {
      setPersonnelLoading(true);
      console.log('🔍 Dashboard - Loading personnel data...');
      const response = await personnelService.getPersons({ limit: 1000 }); // Get all personnel
      console.log('🔍 Dashboard - Personnel response:', response);
      console.log('🔍 Dashboard - Personnel count:', response.data?.length || 0);
      setPersonnel(response.data);
    } catch (error) {
      console.error('🔍 Dashboard - Error loading personnel:', error);
    } finally {
      setPersonnelLoading(false);
    }
  };

  const formatDateForChart = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return dateString; // Return original if parsing fails
    }
  };

  // Helper function to format X-axis labels based on grouping
  const formatXAxisLabel = (value: string, groupBy: GroupBy) => {
    if (groupBy === 'daily') {
      // For daily: show date (MM/DD format)
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch {
        return value;
      }
    } else if (groupBy === 'weekly') {
      // For weekly: show P..W.. format
      // Assuming the API returns format like "2024-W01"
      const match = value.match(/(\d{4})-W(\d{2})/);
      if (match) {
        const week = match[2];
        // Calculate period number based on week
        const weekNum = parseInt(week);
        const periodNum = Math.ceil(weekNum / 4);
        const weekInPeriod = ((weekNum - 1) % 4) + 1;
        return `P${periodNum}W${weekInPeriod}`;
      }
      return value;
    } else if (groupBy === 'period') {
      // For period: show P.. format with year indicator for first period
      // Assuming the API returns format like "2024-P01"
      const match = value.match(/(\d{4})-P(\d+)/);
      if (match) {
        const year = match[1];
        const period = match[2];
        
        // Show year for first period of each year
        if (period === '01') {
          return `${year}\nP${period}`;
        }
        return `P${period}`;
      }
      return value;
    }
    return value;
  };

  const load = async (params?: Partial<{ groupBy: GroupBy; startDate: string; endDate: string; woType: string; department: string; site: string; assign: string }>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on grouping
      let finalStartDate = params?.startDate || startDate;
      let finalEndDate = params?.endDate || endDate;
      
      if (groupBy !== 'daily' && selectedYear && fromPeriod && toPeriod) {
        const yearInfo = periodInfo[selectedYear];
        if (yearInfo) {
          const fromPeriodInfo = yearInfo.periods.find((p: any) => p.period === parseInt(fromPeriod));
          const toPeriodInfo = yearInfo.periods.find((p: any) => p.period === parseInt(toPeriod));
          
          if (fromPeriodInfo && toPeriodInfo) {
            finalStartDate = fromPeriodInfo.startDate;
            finalEndDate = toPeriodInfo.endDate;
          }
        }
      }
      
      // For period grouping, use year range
      if (groupBy === 'period' && fromYear && toYear) {
        // Use full year range
        finalStartDate = `${fromYear}-01-01`;
        finalEndDate = `${toYear}-12-31`;
      }
      
      const res = await dashboardService.getWorkOrderVolumeTrend({
        groupBy: params?.groupBy || groupBy,
        startDate: finalStartDate,
        endDate: finalEndDate,
        woType: params?.woType ?? (woType || undefined),
        department: params?.department ?? (department || undefined),
        site: params?.site ?? (site || undefined),
        assign: params?.assign ?? (assign || undefined),
        year: groupBy !== 'daily' && groupBy !== 'period' ? selectedYear : undefined,
        fromPeriod: groupBy !== 'daily' && groupBy !== 'period' ? fromPeriod : undefined,
        toPeriod: groupBy !== 'daily' && groupBy !== 'period' ? toPeriod : undefined,
        fromYear: groupBy === 'period' ? fromYear : undefined,
        toYear: groupBy === 'period' ? toYear : undefined,
      });
      
      console.log('Dashboard API Response:', res);
      
      const payload = res?.data;
    
      setTrend(Array.isArray(payload?.trend) ? payload.trend : []);
      setFilters(payload?.filters || { woTypes: [], departments: [], sites: [] });
      setPeriodInfo(payload?.periodInfo || {});
      setTotal(payload?.summary?.totalWorkOrders || 0);
      
    } catch (e: any) {
      console.error('Dashboard load error:', e);
      setError(e.message || 'Failed to load trend');
      setTrend([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load personnel data on mount
  useEffect(() => {
    loadPersonnel();
  }, []);

  // Create personnel options for combobox
  const personnelOptions = useMemo(() => {
    console.log('🔍 Dashboard - Creating personnel options from:', personnel);
    const options = personnel.map(person => ({
      value: String(person.PERSONNO),
      label: person.PERSON_NAME || `${person.FIRSTNAME} ${person.LASTNAME}`,
      description: person.PERSONCODE ? `Code: ${person.PERSONCODE}` : undefined
    }));
    
    // Add "All Assignees" option at the beginning
    const finalOptions = [
      { value: '', label: 'All Assignees', description: 'Show work orders for all assignees' },
      ...options
    ];
    
    console.log('🔍 Dashboard - Final personnel options:', finalOptions);
    return finalOptions;
  }, [personnel]);

  // Reset period selectors when grouping changes
  useEffect(() => {
    if (groupBy !== 'daily') {
      // Set default year to current year or first available year
      const availableYears = Object.keys(periodInfo);
      if (availableYears.length > 0) {
        if (groupBy === 'period') {
          // For period grouping, set both from and to year
          if (!fromYear) setFromYear(availableYears[0]);
          if (!toYear) setToYear(availableYears[0]);
        } else {
          // For weekly grouping, set single year
          if (!selectedYear) setSelectedYear(availableYears[0]);
        }
      }
    }
  }, [groupBy, periodInfo, selectedYear, fromYear, toYear]);

  const onApply = () => {
    load();
  };

  //const xKey = 'date';
  const chartData = useMemo(() => {
    console.log('Raw trend data:', trend); // Debug log
    
    // Single line chart data
    const transformed = trend.map(t => ({ 
      date: formatDateForChart(t.date), // Transform date format
      count: Number(t.count || 0) 
    }));
    console.log('Single-line chart data:', transformed);
    return transformed;
  }, [trend]);
  
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Maintenance KPI (Backup)" description="Work Order Volume Trend - Original Version" />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Group by</label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="period">Period</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Date Range Selectors - Conditional based on grouping */}
        {groupBy === 'daily' ? (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
            </div>
          </>
        ) : groupBy === 'period' ? (
          <>
            <div>
              <label className="text-xs text-muted-foreground">From Year</label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="From Year" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(periodInfo).map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To Year</label>
              <Select value={toYear} onValueChange={setToYear}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="To Year" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(periodInfo).map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(periodInfo).map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From Period</label>
              <Select value={fromPeriod} onValueChange={setFromPeriod}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="From" /></SelectTrigger>
                <SelectContent>
                  {selectedYear && periodInfo[selectedYear]?.periods.map((p: any) => (
                    <SelectItem key={p.period} value={String(p.period)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To Period</label>
              <Select value={toPeriod} onValueChange={setToPeriod}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="To" /></SelectTrigger>
                <SelectContent>
                  {selectedYear && periodInfo[selectedYear]?.periods.map((p: any) => (
                    <SelectItem key={p.period} value={String(p.period)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div>
          <label className="text-xs text-muted-foreground">WO Type</label>
          <Select value={woType || 'all'} onValueChange={(v) => setWoType(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {filters.woTypes.map((t: any) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.code ? `${t.code} - ` : ''}{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Department</label>
          <Select value={department || 'all'} onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {filters.departments.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.code ? `${d.code} - ` : ''}{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Site</label>
          <Select value={site || 'all'} onValueChange={(v) => setSite(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {filters.sites.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.code ? `${s.code} - ` : ''}{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs text-muted-foreground">Assignee</label>
          <SearchableCombobox
            options={personnelOptions}
            value={assign}
            onValueChange={setAssign}
            placeholder="All Assignees"
            searchPlaceholder="Search by name or code..."
            className="w-[240px]"
            loading={personnelLoading}
          />
        </div>
        <div className="pb-0.5">
          <Button onClick={onApply} disabled={loading}>Apply</Button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Total Work Orders</CardTitle></CardHeader>
          <CardContent className="p-4"><div className="text-2xl font-semibold">{total}</div></CardContent>
        </Card>
        <div className="sm:col-span-2" />
      </div>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Work Order Volume Trend</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <div>Loading...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <div>No data available</div>
            </div>
          ) : (
   
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatXAxisLabel(value, groupBy)}
                    angle={groupBy === 'daily' ? 0 : -45}
                    textAnchor={groupBy === 'daily' ? 'middle' : 'end'}
                    height={groupBy === 'daily' ? 30 : groupBy === 'period' ? 80 : 60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    labelFormatter={(value) => formatXAxisLabel(value, groupBy)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Work Orders" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMaintenanceKPIPageBackup;
