import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import workorderVolumeService, { type PersonalWorkOrderVolumeItem, type PersonalWorkOrderVolumeByPeriodItem } from '@/services/dashboard/workorderVolumeService';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

type WorkOrderVolumeItem = {
  companyYear: number;
  periodNo: number;
  history: number;
  closeToHistory: number;
  finish: number;
  inProgress: number;
  scheduled: number;
  planResource: number;
  workInitiated: number;
  downtime: number;
};

// KPI Cards Component
const KPICards: React.FC<{
  summary: {
    totalWorkOrders: number;
    completionRate: number;
    totalDowntime: number;
    onTimeRate: number;
  };
}> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Work Orders</p>
              <p className="text-2xl font-bold">{summary.totalWorkOrders.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">{summary.completionRate.toFixed(1)}%</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Downtime</p>
              <p className="text-2xl font-bold">{summary.totalDowntime.toFixed(1)}h</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">On-time Rate</p>
              <p className="text-2xl font-bold">{summary.onTimeRate.toFixed(1)}%</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Personal Chart Component for Department Personnel Performance
const PersonalChart: React.FC<{
  data: PersonalWorkOrderVolumeItem[];
  loading: boolean;
  error: string | null;
}> = ({ data, loading, error }) => {
  // Transform data for chart (same structure as main chart but with assignee names)
  const chartData = useMemo(() => {
    return data.map(item => ({
      assignee: item.assignee.length > 15 ? item.assignee.substring(0, 15) + '...' : item.assignee,
      History: item.history,
      CloseToHistory: item.closeToHistory,
      Finish: item.finish,
      InProgress: item.inProgress,
      Scheduled: item.scheduled,
      PlanResource: item.planResource,
      WorkInitiated: item.workInitiated,
      Downtime: item.downtime || 0,
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Total Work Order This Year by Assignee</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
            No personal data available
          </div>
        ) : (
          <div className="h-full" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assignee" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                {/* Stacked status bars */}
                <Bar yAxisId="left" dataKey="History" name="History" stackId="status" fill="#28A96E" />
                <Bar yAxisId="left" dataKey="CloseToHistory" name="CloseToHistory" stackId="status" fill="#56D79D" />
                <Bar yAxisId="left" dataKey="Finish" name="Finish" stackId="status" fill="#A0E9C8" />
                <Bar yAxisId="left" dataKey="InProgress" name="InProgress" stackId="status" fill="#f97316" />
                <Bar yAxisId="left" dataKey="Scheduled" name="Scheduled" stackId="status" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="PlanResource" name="PlanResource" stackId="status" fill="#8b5cf6" />
                <Bar yAxisId="left" dataKey="WorkInitiated" name="WorkInitiated" stackId="status" fill="#9ca3af" />
                {/* Downtime line - rendered last to appear at end of legend */}
                <Line yAxisId="right" type="monotone" dataKey="Downtime" name="Downtime" stroke="#111827" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}
      </CardContent>
    </Card>
  );
};

// Individual Person Chart Component
const IndividualPersonChart: React.FC<{
  personName: string;
  personData: PersonalWorkOrderVolumeByPeriodItem[];
}> = ({ personName, personData }) => {
  // Transform data for this specific person
  const chartData = useMemo(() => {
    // Create all 13 periods with default values
    const allPeriods = Array.from({ length: 13 }, (_, i) => {
      const periodNo = i + 1;
      const periodKey = `P${String(periodNo).padStart(2, '0')}`;
      
      // Find data for this period
      const periodData = personData?.find(item => 
        item.periodNo === periodNo
      );
      
      return {
        period: periodKey,
        woCount: periodData ? Number(periodData.woCount) || 0 : 0,
        history: periodData ? Number(periodData.history) || 0 : 0,
        closeToHistory: periodData ? Number(periodData.closeToHistory) || 0 : 0,
        finish: periodData ? Number(periodData.finish) || 0 : 0,
        inProgress: periodData ? Number(periodData.inProgress) || 0 : 0,
        scheduled: periodData ? Number(periodData.scheduled) || 0 : 0,
        planResource: periodData ? Number(periodData.planResource) || 0 : 0,
        workInitiated: periodData ? Number(periodData.workInitiated) || 0 : 0,
        downtime: periodData ? Number(periodData.downtime) || 0 : 0,
      };
    });
    
    return allPeriods;
  }, [personData, personName]);

  // Don't render if no data
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">{personName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{personName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-full" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              {/* Stacked status bars */}
              <Bar yAxisId="left" dataKey="history" name="History" stackId="status" fill="#28A96E" />
              <Bar yAxisId="left" dataKey="closeToHistory" name="CloseToHistory" stackId="status" fill="#56D79D" />
              <Bar yAxisId="left" dataKey="finish" name="Finish" stackId="status" fill="#A0E9C8" />
              <Bar yAxisId="left" dataKey="inProgress" name="InProgress" stackId="status" fill="#f97316" />
              <Bar yAxisId="left" dataKey="scheduled" name="Scheduled" stackId="status" fill="#3b82f6" />
              <Bar yAxisId="left" dataKey="planResource" name="PlanResource" stackId="status" fill="#8b5cf6" />
              <Bar yAxisId="left" dataKey="workInitiated" name="WorkInitiated" stackId="status" fill="#9ca3af" />
              {/* Downtime line - rendered last to appear at end of legend */}
              <Line yAxisId="right" type="monotone" dataKey="downtime" name="Downtime" stroke="#111827" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Personal Period Chart Component - Shows one chart per person
const PersonalPeriodChart: React.FC<{
  data: PersonalWorkOrderVolumeByPeriodItem[];
  loading: boolean;
  error: string | null;
}> = ({ data, loading, error }) => {
  // Group data by person
  const personDataMap = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return new Map<string, PersonalWorkOrderVolumeByPeriodItem[]>();
    }
    
    const map = new Map<string, PersonalWorkOrderVolumeByPeriodItem[]>();
    
    data.forEach(item => {
      if (item && item.assignee) {
        const personName = item.assignee;
        if (!map.has(personName)) {
          map.set(personName, []);
        }
        map.get(personName)!.push(item);
      }
    });
    
    return map;
  }, [data]);

  const personNames = Array.from(personDataMap.keys()).sort();

  if (loading) {
    return (
      <div>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Personal Performance Over Time</CardTitle>
          </CardHeader>
        </Card>
        <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Personal Performance Over Time</CardTitle>
          </CardHeader>
        </Card>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Personal Performance Over Time</CardTitle>
        </CardHeader>
      </Card>
      
      {personNames.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
          No personal period data available
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {personNames.map(personName => (
            <IndividualPersonChart
              key={personName}
              personName={personName}
              personData={personDataMap.get(personName) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardMaintenanceKPIPage: React.FC = () => {

  // Filters (defaults)
  const [companyYear, setCompanyYear] = useState<number | null>(null);
  const [assignee, setAssignee] = useState<string>('');
  const [woTypeNo, setWoTypeNo] = useState<string>('');
  const [deptno, setDeptno] = useState<string>('');
  const [puno, setPuno] = useState<string>('');

  const [data, setData] = useState<WorkOrderVolumeItem[]>([]);
  const [summary, setSummary] = useState<{
    totalWorkOrders: number;
    completionRate: number;
    totalDowntime: number;
    onTimeRate: number;
  }>({
    totalWorkOrders: 0,
    completionRate: 0,
    totalDowntime: 0,
    onTimeRate: 0,
  });
  const [filters, setFilters] = useState<{
    assignees: Array<{ id: number; name: string }>;
    woTypes: Array<{ id: number; code?: string; name: string }>;
    departments: Array<{ id: number; code?: string; name: string }>;
    productionUnits: Array<{ id: number; name: string }>;
    companyYears: number[];
  }>({ assignees: [], woTypes: [], departments: [], productionUnits: [], companyYears: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal chart state
  const [personalData, setPersonalData] = useState<PersonalWorkOrderVolumeItem[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  // Personal period chart state
  const [personalPeriodData, setPersonalPeriodData] = useState<PersonalWorkOrderVolumeByPeriodItem[]>([]);
  const [personalPeriodLoading, setPersonalPeriodLoading] = useState(false);
  const [personalPeriodError, setPersonalPeriodError] = useState<string | null>(null);

  // Initialize page with default company year and load initial filters
  useEffect(() => {
    const init = async () => {
      try {
        // Get current company year
        const resp = await workorderVolumeService.getCurrentCompanyYear();
        const yr = resp?.data?.currentCompanyYear;
        if (yr) {
          setCompanyYear(Number(yr));
          // Load initial filter options with default company year
          await loadFilterOptions({ companyYear: Number(yr) });
        } else {
          // If current year not available, load filter options first to get available years
          await loadFilterOptions({});
          // Then set to the maximum available year
          if (filters.companyYears.length > 0) {
            const maxYear = Math.max(...filters.companyYears);
            setCompanyYear(maxYear);
            await loadFilterOptions({ companyYear: maxYear });
          }
        }
      } catch (e) {
        console.error('Failed to initialize Maintenance KPI page', e);
      }
    };
    init();
  }, []);

  // Load filter options based on current filter state
  const loadFilterOptions = async (override?: Partial<{ companyYear: number | null; assignee: string; woTypeNo: string; deptno: string; puno: string }>) => {
    try {
      const params = {
        companyYear: override?.companyYear ?? companyYear,
        assignee: override?.assignee ?? assignee,
        woTypeNo: override?.woTypeNo ?? woTypeNo,
        deptno: override?.deptno ?? deptno,
        puno: override?.puno ?? puno,
      };
      const json = await workorderVolumeService.getWorkOrderVolumeFilterOptions(params);
      setFilters(json.data.filters);
    } catch (e: any) {
      console.error('Error loading filter options:', e);
    }
  };

  // Fetch chart data only (separate from filter options)
  const fetchData = async (
    override?: Partial<{ companyYear: number | null; assignee: string; woTypeNo: string; deptno: string; puno: string }>
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        companyYear: override?.companyYear ?? companyYear,
        assignee: override?.assignee ?? assignee,
        woTypeNo: override?.woTypeNo ?? woTypeNo,
        deptno: override?.deptno ?? deptno,
        puno: override?.puno ?? puno,
      };
      const json = await workorderVolumeService.getWorkOrderVolume(params);
      setData(json.data.statistics || []);
      setSummary({
        totalWorkOrders: json.data.summary?.totalWorkOrders || 0,
        completionRate: json.data.summary?.completionRate || 0,
        totalDowntime: json.data.summary?.totalDowntime || 0,
        onTimeRate: json.data.summary?.onTimeRate || 0,
      });
      console.log('Data:', json.data);
    } catch (e: any) {
      setError(e?.message || 'Error fetching data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch personal data when department is selected
  const fetchPersonalData = async (
    override?: Partial<{ companyYear: number | null; assignee: string; woTypeNo: string; deptno: string; puno: string }>
  ) => {
    const currentDeptno = override?.deptno ?? deptno;
    const currentCompanyYear = override?.companyYear ?? companyYear;
    
    // Only fetch personal data if department and company year are selected
    if (!currentDeptno || !currentCompanyYear) {
      setPersonalData([]);
      return;
    }

    try {
      setPersonalLoading(true);
      setPersonalError(null);

      const params = {
        companyYear: currentCompanyYear,
        assignee: override?.assignee ?? assignee,
        woTypeNo: override?.woTypeNo ?? woTypeNo,
        deptno: currentDeptno,
        puno: override?.puno ?? puno,
      };
      const json = await workorderVolumeService.getPersonalWorkOrderVolume(params);
      setPersonalData(json.data.statistics || []);
    } catch (e: any) {
      setPersonalError(e?.message || 'Error fetching personal data');
      setPersonalData([]);
    } finally {
      setPersonalLoading(false);
    }
  };

  // Fetch personal period data when department is selected
  const fetchPersonalPeriodData = async (
    override?: Partial<{ companyYear: number | null; assignee: string; woTypeNo: string; deptno: string; puno: string }>
  ) => {
    const currentDeptno = override?.deptno ?? deptno;
    const currentCompanyYear = override?.companyYear ?? companyYear;
    
    // Only fetch personal period data if department and company year are selected
    if (!currentDeptno || !currentCompanyYear) {
      setPersonalPeriodData([]);
      return;
    }

    try {
      setPersonalPeriodLoading(true);
      setPersonalPeriodError(null);

      const params = {
        companyYear: currentCompanyYear,
        assignee: override?.assignee ?? assignee,
        woTypeNo: override?.woTypeNo ?? woTypeNo,
        deptno: currentDeptno,
        puno: override?.puno ?? puno,
      };
      const json = await workorderVolumeService.getPersonalWorkOrderVolumeByPeriod(params);
      setPersonalPeriodData(json.data.statistics || []);
    } catch (e: any) {
      setPersonalPeriodError(e?.message || 'Error fetching personal period data');
      setPersonalPeriodData([]);
    } finally {
      setPersonalPeriodLoading(false);
    }
  };

  // Handle cascading filter changes
  const handleCompanyYearChange = async (value: string) => {
    // Company year is required, so value should never be empty
    if (!value) return;
    
    const newYear = Number(value);
    setCompanyYear(newYear);
    // Reset dependent filters when company year changes
    if (newYear !== companyYear) {
      setAssignee('');
      setWoTypeNo('');
      setDeptno('');
      setPuno('');
      // Load new filter options for the selected year
      await loadFilterOptions({ companyYear: newYear });
    }
  };

  const handleAssigneeChange = async (value: string) => {
    setAssignee(value);
    // Reset dependent filters when assignee changes
    if (value !== assignee) {
      setWoTypeNo('');
      setDeptno('');
      setPuno('');
      // Load new filter options for the selected assignee
      await loadFilterOptions({ companyYear, assignee: value });
    }
  };

  const handleWoTypeChange = async (value: string) => {
    setWoTypeNo(value);
    // Reset dependent filters when WO type changes
    if (value !== woTypeNo) {
      setDeptno('');
      setPuno('');
      // Load new filter options for the selected WO type
      await loadFilterOptions({ companyYear, assignee, woTypeNo: value });
    }
  };

  const handleDeptChange = async (value: string) => {
    setDeptno(value);
    // Reset dependent filters when department changes
    if (value !== deptno) {
      setPuno('');
      // Load new filter options for the selected department
      await loadFilterOptions({ companyYear, assignee, woTypeNo, deptno: value });
    }
    // Fetch personal data when department changes
    await fetchPersonalData({ companyYear, assignee, woTypeNo, deptno: value, puno });
    // Fetch personal period data when department changes
    await fetchPersonalPeriodData({ companyYear, assignee, woTypeNo, deptno: value, puno });
  };
  // Do not auto-fetch on filter change; only init and Apply.
  // Prepare chart data
  const chartData = useMemo(() => {
    return data.map((d) => ({
      period: `P${String(d.periodNo).padStart(2, '0')}`,
      History: d.history || 0,
      CloseToHistory: d.closeToHistory || 0,
      Finish: d.finish || 0,
      InProgress: d.inProgress || 0,
      Scheduled: d.scheduled || 0,
      PlanResource: d.planResource || 0,
      WorkInitiated: d.workInitiated || 0,
      Downtime: d.downtime || 0,
    }));
  }, [data]);

  return (
    <div className="p-4 sm:p-6">
     {/* <PageHeader title="Maintenance KPI" description="Work Order Volume by Period" /> */}

      {/* Responsive layout: filters on left for large screens, on top for small screens */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters card - sticky on large screens */}
        <div className="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
                 <div>
                   <label className="text-xs text-muted-foreground">Company Year *</label>
                   <SearchableCombobox
                     options={filters.companyYears.map((y) => ({ value: String(y), label: String(y) }))}
                     value={companyYear != null ? String(companyYear) : ''}
                     onValueChange={handleCompanyYearChange}
                     placeholder="Select Year"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground">Department</label>
                   <SearchableCombobox
                     options={[
                       { value: '', label: 'All Departments' },
                       ...filters.departments.map((d) => ({ value: String(d.id), label: d.name, description: d.code })),
                     ]}
                     value={deptno}
                     onValueChange={handleDeptChange}
                     placeholder="All Departments"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground">WO Type</label>
                   <SearchableCombobox
                     options={[
                       { value: '', label: 'All WO Types' },
                       ...filters.woTypes.map((t) => ({ value: String(t.id), label: t.name, description: t.code })),
                     ]}
                     value={woTypeNo}
                     onValueChange={handleWoTypeChange}
                     placeholder="All WO Types"
                   />
                 </div>
                 
                 <div>
                   <label className="text-xs text-muted-foreground">Assignee</label>
                   <SearchableCombobox
                     options={[
                       { value: '', label: 'All Assignees' },
                       ...filters.assignees.map((a) => ({ value: String(a.id), label: a.name })),
                     ]}
                     value={assignee}
                     onValueChange={handleAssigneeChange}
                     placeholder="All Assignees"
                   />
                 </div>
                 <div>
                   <label className="text-xs text-muted-foreground">Production Unit</label>
                   <SearchableCombobox
                     options={[
                       { value: '', label: 'All Production Units' },
                       ...filters.productionUnits.map((p) => ({ value: String(p.id), label: p.name })),
                     ]}
                     value={puno}
                     onValueChange={setPuno}
                     placeholder="All Production Units"
                   />
                 </div>
              </div>
               <div className="mt-3 flex flex-col sm:flex-row gap-2">
                 <Button
                   variant="outline"
                   onClick={() => { setAssignee(''); setWoTypeNo(''); setDeptno(''); setPuno(''); }}
                   className="flex-1 sm:flex-none"
                 >
                   Clear Filters
                 </Button>
                 <Button onClick={() => fetchData()} className="flex-1 sm:flex-none">Apply</Button>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            {/* KPI Cards */}
            <KPICards summary={summary} />
            
            {/* Main card with chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Work Order Count by Period</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[420px] text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <div className="h-full" style={{ height: 420 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis yAxisId="left" allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                      {/* Stacked status bars */}
                      <Bar yAxisId="left" dataKey="History" name="History" stackId="status" fill="#28A96E" />
                      <Bar yAxisId="left" dataKey="CloseToHistory" name="CloseToHistory" stackId="status" fill="#56D79D" />
                      <Bar yAxisId="left" dataKey="Finish" name="Finish" stackId="status" fill="#A0E9C8" />
                      <Bar yAxisId="left" dataKey="InProgress" name="InProgress" stackId="status" fill="#f97316" />
                      <Bar yAxisId="left" dataKey="Scheduled" name="Scheduled" stackId="status" fill="#3b82f6" />
                      <Bar yAxisId="left" dataKey="PlanResource" name="PlanResource" stackId="status" fill="#8b5cf6" />
                      <Bar yAxisId="left" dataKey="WorkInitiated" name="WorkInitiated" stackId="status" fill="#9ca3af" />
                        {/* Downtime line - rendered last to appear at end of legend */}
                        <Line yAxisId="right" type="monotone" dataKey="Downtime" name="Downtime" stroke="#111827" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}
              </CardContent>
            </Card>

            {/* Personal Chart - Only show when department is selected */}
            {deptno && (
              <div className="mt-6">
                <PersonalChart 
                  data={personalData} 
                  loading={personalLoading} 
                  error={personalError} 
                />
              </div>
            )}

            {/* Personal Period Chart - Only show when department is selected */}
            {deptno && (
              <div className="mt-6">
                <PersonalPeriodChart 
                  data={personalPeriodData} 
                  loading={personalPeriodLoading} 
                  error={personalPeriodError} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMaintenanceKPIPage;
