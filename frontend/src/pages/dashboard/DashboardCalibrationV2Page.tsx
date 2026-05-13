import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/useToast';
import { calculatePeriodForDate, getDateRangeForFilter } from '@/utils/periodCalculations';
import {
  PM_CALIBRATION_PLANT_OPTIONS,
  labelForPmCalibrationPlant,
  serializePmCalibrationPlants,
} from '@/utils/pmCalibrationPlantMap';
import { cn } from '@/lib/utils';
import calibrationService from '@/services/calibrationService';
import type {
  CalibrationUserEvent,
  CalibrationUserEventCategoryOption,
  PmCalendarView,
  PmScheduleListItem,
  PmScheduleEquipmentTypeCount,
  PmScheduleTeamMember,
} from '@/services/calibrationService';
import type { CalibrationAssigneePeriodSummary } from '@/services/calibrationService';
import personnelService from '@/services/personnelService';
import type { Department } from '@/services/personnelService';
import workorderVolumeService from '@/services/dashboard/workorderVolumeService';
import CalibrationBigCalendar from '@/components/dashboard/calibration/CalibrationBigCalendar';
import CalibrationUserEventModal from '@/components/dashboard/calibration/CalibrationUserEventModal';
import PmScheduleDetailModal from '@/components/dashboard/calibration/PmScheduleDetailModal';
import CalibrationOverduePanel from '@/components/dashboard/calibration/CalibrationOverduePanel';
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  Users,
  CalendarDays,
  Plus,
  Pencil,
  PieChart as PieChartIcon,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format as formatDateFns,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TabKey = 'overview' | 'equipment-types' | 'team' | 'calendar' | 'user-events' | 'overdue';
type TimeFilterKey = 'this-year' | 'this-period' | 'select-period';

interface FilterPending {
  timeFilter: TimeFilterKey;
  year: number;
  periods: number[];
  plants: string[];
  deptNos: number[];
  assigneeIds: string[];
}

interface FilterApplied {
  startDate: string;
  endDate: string;
  /** The company year the user explicitly selected — used directly for the Team chart. */
  companyYear: number;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeApplied(pending: FilterPending): FilterApplied {
  const periods =
    pending.timeFilter === 'select-period' && pending.periods.length > 0
      ? [...pending.periods].sort((a, b) => a - b)
      : pending.timeFilter === 'select-period'
        ? [calculatePeriodForDate(new Date(), pending.year).period]
        : undefined;
  const dr = getDateRangeForFilter(pending.timeFilter, pending.year, undefined, periods);
  const plant = serializePmCalibrationPlants(pending.plants);
  return {
    startDate: dr.startDate,
    endDate: dr.endDate,
    companyYear: pending.year,
    ...(plant ? { plant } : {}),
    ...(pending.deptNos.length ? { dept: pending.deptNos.join(',') } : {}),
    ...(pending.assigneeIds.length ? { assigneeIds: pending.assigneeIds.join(',') } : {}),
  };
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 10 && s[4] === '-') return s.slice(0, 10);
  if (s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function parseLocalDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let y: number, m: number, d: number;
  if (s.length >= 10 && s[4] === '-') {
    y = parseInt(s.slice(0, 4), 10);
    m = parseInt(s.slice(5, 7), 10) - 1;
    d = parseInt(s.slice(8, 10), 10);
  } else if (s.length >= 8) {
    y = parseInt(s.slice(0, 4), 10);
    m = parseInt(s.slice(4, 6), 10) - 1;
    d = parseInt(s.slice(6, 8), 10);
  } else {
    return null;
  }
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d, 0, 0, 0);
}

function toIsoDate(date: Date): string {
  return formatDateFns(date, 'yyyy-MM-dd');
}

function getCalendarVisibleRange(view: PmCalendarView, date: Date) {
  if (view === 'week') {
    return {
      start: startOfWeek(date),
      end: endOfWeek(date),
    };
  }

  if (view === 'agenda') {
    return {
      start: startOfDay(date),
      end: endOfDay(addDays(date, 29)),
    };
  }

  return {
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  };
}

function woStatusBadge(item: PmScheduleListItem) {
  if (item.woStatusNo === 9)
    return <Badge className="bg-green-100 text-green-800 border-green-200">Done</Badge>;
  if (item.WONo != null)
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">No WO</Badge>;
}

const LIST_LIMIT = 15;

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const DashboardCalibrationV2Page: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Company year -------------------------------------------------------
  const [companyYear, setCompanyYear] = useState<number | null>(null);
  useEffect(() => {
    workorderVolumeService
      .getCurrentCompanyYear()
      .then((res) => setCompanyYear(res?.data?.currentCompanyYear ?? new Date().getFullYear()))
      .catch(() => setCompanyYear(new Date().getFullYear()));
  }, []);

  const defaultYear = companyYear ?? new Date().getFullYear();

  // ---- Tab state (URL-synced) ---------------------------------------------
  const activeTab = (searchParams.get('tab') as TabKey | null) ?? 'overview';
  const setActiveTab = (tab: TabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // ---- Filter state -------------------------------------------------------
  const initialPeriod = calculatePeriodForDate(new Date(), defaultYear).period;
  const [pending, setPending] = useState<FilterPending>({
    timeFilter: 'this-period',
    year: defaultYear,
    periods: [initialPeriod],
    plants: [],
    deptNos: [],
    assigneeIds: [],
  });
  const [applied, setApplied] = useState<FilterApplied>(() =>
    computeApplied({
      timeFilter: 'this-period',
      year: defaultYear,
      periods: [initialPeriod],
      plants: [],
      deptNos: [],
      assigneeIds: [],
    })
  );

  // Sync pending year when companyYear loads
  useEffect(() => {
    if (companyYear != null) {
      setPending((p) => ({ ...p, year: companyYear }));
    }
  }, [companyYear]);

  // ---- Meta data (departments, assignees) ---------------------------------
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  useEffect(() => {
    Promise.all([
      personnelService.getDepartments({ limit: 1000 }),
      calibrationService.getPmScheduleAssignees(),
    ])
      .then(([deptRes, assigneeRes]) => {
        if (deptRes.success) setDepartments(deptRes.data);
        if (assigneeRes.success) {
          const list = assigneeRes.data.users ?? [];
          setUsers(list);
          const allowed = new Set(list.map((u) => String(u.id)));
          setPending((p) => ({
            ...p,
            assigneeIds: p.assigneeIds.filter((id) => allowed.has(id)),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const yearOptions = useMemo(() => {
    const base = companyYear ?? new Date().getFullYear();
    const s = new Set<number>();
    for (let i = 0; i < 10; i++) s.add(base - i);
    s.add(pending.year);
    return Array.from(s).sort((a, b) => b - a);
  }, [companyYear, pending.year]);

  // ---- KPI + schedule data ------------------------------------------------
  const [kpiLoading, setKpiLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<PmScheduleEquipmentTypeCount[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listItems, setListItems] = useState<PmScheduleListItem[]>([]);
  const [listPagination, setListPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [activeEqType, setActiveEqType] = useState<string | null>(null);
  const [eqTypeView, setEqTypeView] = useState<'grid' | 'donut'>('donut');
  const [selectedSchedule, setSelectedSchedule] = useState<PmScheduleListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [userEventModalOpen, setUserEventModalOpen] = useState(false);
  const [selectedUserEvent, setSelectedUserEvent] = useState<CalibrationUserEvent | null>(null);
  const [userEventCategories, setUserEventCategories] = useState<CalibrationUserEventCategoryOption[]>([
    { value: 'shutdown', label: 'Shutdown' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'other', label: 'Other' },
  ]);

  // Calendar data
  const [calItems, setCalItems] = useState<PmScheduleListItem[]>([]);
  const [calUserEvents, setCalUserEvents] = useState<CalibrationUserEvent[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<PmCalendarView>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(() => parseLocalDate(applied.startDate) ?? new Date());
  const [calRangeInfo, setCalRangeInfo] = useState({
    rangeStart: '',
    rangeEnd: '',
    count: 0,
  });

  // User events tab data
  const [userEventItems, setUserEventItems] = useState<CalibrationUserEvent[]>([]);
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  const [userEventsPage, setUserEventsPage] = useState(1);
  const [userEventsPagination, setUserEventsPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Team data
  const [teamKpi, setTeamKpi] = useState<PmScheduleTeamMember[]>([]);
  const [teamKpiLoading, setTeamKpiLoading] = useState(false);
  const [teamPeriods, setTeamPeriods] = useState<CalibrationAssigneePeriodSummary[]>([]);
  const [teamPeriodsLoading, setTeamPeriodsLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setKpiLoading(true);
    setListLoading(true);
    try {
      const [kpi, list] = await Promise.all([
        calibrationService.getPmScheduleKpi({ ...applied, eqType: activeEqType ?? undefined }),
        calibrationService.getPmScheduleList({
          ...applied,
          eqType: activeEqType ?? undefined,
          page: listPage,
          limit: LIST_LIMIT,
        }),
      ]);
      if (kpi.success) {
        setTotalJobs(kpi.data.totalCalibrationJobs);
        setTotalCompleted(kpi.data.totalCompleted);
        setEquipmentTypes(kpi.data.equipmentTypes ?? []);
      }
      if (list.success) {
        setListItems(list.data.items);
        setListPagination({
          total: list.data.pagination.total,
          totalPages: list.data.pagination.totalPages,
          hasNext: list.data.pagination.hasNext,
          hasPrev: list.data.pagination.hasPrev,
        });
      }
    } catch {
      setTotalJobs(null);
      setTotalCompleted(null);
    } finally {
      setKpiLoading(false);
      setListLoading(false);
    }
  }, [applied, activeEqType, listPage]);

  const fetchCalendar = useCallback(async () => {
    if (activeTab !== 'calendar') return;
    const visibleRange = getCalendarVisibleRange(calendarView, calendarDate);
    setCalLoading(true);
    try {
      const [pmRes, eventRes] = await Promise.all([
        calibrationService.getPmScheduleCalendarRange({
          viewStartDate: toIsoDate(visibleRange.start),
          viewEndDate: toIsoDate(visibleRange.end),
          plant: applied.plant,
          dept: applied.dept,
          assigneeIds: applied.assigneeIds,
        }),
        calibrationService.getCalibrationUserEventsForCalendarRange({
          viewStartDate: toIsoDate(visibleRange.start),
          viewEndDate: toIsoDate(visibleRange.end),
          plant: applied.plant,
          dept: applied.dept,
          assigneeIds: applied.assigneeIds,
        }),
      ]);
      if (pmRes.success) {
        setCalItems(pmRes.data.items);
      }
      if (eventRes.success) {
        setCalUserEvents(eventRes.data.items);
      }
      if (pmRes.success || eventRes.success) {
        setCalRangeInfo({
          rangeStart: pmRes.success ? pmRes.data.rangeStart : eventRes.data.rangeStart,
          rangeEnd: pmRes.success ? pmRes.data.rangeEnd : eventRes.data.rangeEnd,
          count: (pmRes.success ? pmRes.data.count : 0) + (eventRes.success ? eventRes.data.count : 0),
        });
      }
    } catch {
      setCalItems([]);
      setCalUserEvents([]);
      setCalRangeInfo({
        rangeStart: '',
        rangeEnd: '',
        count: 0,
      });
    } finally {
      setCalLoading(false);
    }
  }, [activeTab, applied.assigneeIds, applied.dept, applied.plant, calendarDate, calendarView]);

  const fetchUserEvents = useCallback(async () => {
    if (activeTab !== 'user-events') return;
    setUserEventsLoading(true);
    try {
      const res = await calibrationService.getCalibrationUserEvents({
        page: userEventsPage,
        limit: 15,
      });
      if (res.success) {
        setUserEventItems(res.data.items);
        setUserEventCategories(res.data.categories ?? []);
        setUserEventsPagination({
          total: res.data.pagination.total,
          totalPages: res.data.pagination.totalPages,
          hasNext: res.data.pagination.hasNext,
          hasPrev: res.data.pagination.hasPrev,
        });
      }
    } catch {
      setUserEventItems([]);
      setUserEventsPagination({
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setUserEventsLoading(false);
    }
  }, [activeTab, userEventsPage]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetchUserEvents();
  }, [fetchUserEvents]);

  useEffect(() => {
    const nextDate = parseLocalDate(applied.startDate);
    if (nextDate) setCalendarDate(nextDate);
  }, [applied.startDate]);

  // Team: fetch per-assignee KPI (filtered range) + period summary (company year bar charts)
  useEffect(() => {
    if (activeTab !== 'team') return;
    setTeamKpiLoading(true);
    calibrationService
      .getPmScheduleTeamKpi({ startDate: applied.startDate, endDate: applied.endDate, plant: applied.plant, dept: applied.dept, assigneeIds: applied.assigneeIds })
      .then((r) => { if (r.success) setTeamKpi(r.data.members); })
      .catch(() => setTeamKpi([]))
      .finally(() => setTeamKpiLoading(false));
  }, [applied, activeTab]);

  useEffect(() => {
    if (activeTab !== 'team') return;
    setTeamPeriodsLoading(true);
    calibrationService
      .getPersonPeriodSummary({ companyYear: applied.companyYear })
      .then((r) => { if (r.success) setTeamPeriods(r.data.assignees); })
      .catch(() => setTeamPeriods([]))
      .finally(() => setTeamPeriodsLoading(false));
  }, [applied.companyYear, activeTab]);

  // Reset page on filter / eq type change
  useEffect(() => {
    setListPage(1);
  }, [applied, activeEqType]);

  const handleApply = () => {
    setApplied(computeApplied(pending));
    setActiveEqType(null);
  };


  // ---- Completion rate ----------------------------------------------------
  const completionRate =
    totalJobs != null && totalJobs > 0 && totalCompleted != null
      ? Math.round((totalCompleted / totalJobs) * 100)
      : null;

  // ---- Toggle helpers -----------------------------------------------------
  const togglePeriod = (p: number) =>
    setPending((prev) => {
      const s = new Set(prev.periods);
      if (s.has(p)) s.delete(p); else s.add(p);
      let next = Array.from(s).sort((a, b) => a - b);
      if (!next.length) next = [p];
      return { ...prev, periods: next };
    });

  const togglePlant = (code: string) =>
    setPending((prev) => {
      const s = new Set(prev.plants);
      if (s.has(code)) s.delete(code); else s.add(code);
      return { ...prev, plants: Array.from(s) };
    });

  const toggleDept = (deptNo: number) =>
    setPending((prev) => {
      const s = new Set(prev.deptNos);
      if (s.has(deptNo)) s.delete(deptNo); else s.add(deptNo);
      return { ...prev, deptNos: Array.from(s).sort((a, b) => a - b) };
    });

  const toggleAssignee = (id: string) =>
    setPending((prev) => {
      const s = new Set(prev.assigneeIds);
      if (s.has(id)) s.delete(id); else s.add(id);
      return { ...prev, assigneeIds: Array.from(s) };
    });

  const openScheduleDetail = useCallback((item: PmScheduleListItem) => {
    setSelectedSchedule(item);
    setDetailOpen(true);
  }, []);

  const openCreateUserEvent = useCallback(() => {
    setSelectedUserEvent(null);
    setUserEventModalOpen(true);
  }, []);

  const openEditUserEvent = useCallback((item: CalibrationUserEvent) => {
    setSelectedUserEvent(item);
    setUserEventModalOpen(true);
  }, []);

  const handleUserEventSaved = useCallback(() => {
    fetchUserEvents();
    if (activeTab === 'calendar') {
      fetchCalendar();
    }
  }, [activeTab, fetchCalendar, fetchUserEvents]);

  const deleteUserEvent = useCallback(async (item: CalibrationUserEvent) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await calibrationService.deleteCalibrationUserEvent(item.id);
      toast({
        title: 'Success',
        description: 'User event deleted successfully',
      });
      handleUserEventSaved();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user event',
        variant: 'destructive',
      });
    }
  }, [handleUserEventSaved, toast]);

  // ---- Render: Global filter bar ------------------------------------------
  const renderFilterBar = () => (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Time range */}
          <div className="space-y-1 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">{t('dashboard.calibrationV2.filter.timeRange')}</Label>
            <Select
              value={pending.timeFilter}
              onValueChange={(v) =>
                setPending((p) => ({
                  ...p,
                  timeFilter: v as TimeFilterKey,
                  periods:
                    v === 'select-period' && !p.periods.length
                      ? [calculatePeriodForDate(new Date(), p.year).period]
                      : p.periods,
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-period">This Period</SelectItem>
                <SelectItem value="this-year">Select Year</SelectItem>
                <SelectItem value="select-period">Select Period(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          {pending.timeFilter !== 'this-period' && (
            <div className="space-y-1 min-w-[90px]">
              <Label className="text-xs text-muted-foreground">{t('dashboard.calibrationV2.filter.year')}</Label>
              <Select
                value={String(pending.year)}
                onValueChange={(v) =>
                  setPending((p) => ({ ...p, year: parseInt(v, 10) }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period multi-select */}
          {pending.timeFilter === 'select-period' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Periods</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-sm gap-1">
                    {pending.periods.length ? `P${pending.periods.join(', P')}` : 'Select periods'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Periods</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((p) => (
                    <DropdownMenuCheckboxItem
                      key={p}
                      checked={pending.periods.includes(p)}
                      onCheckedChange={() => togglePeriod(p)}
                    >
                      Period {p}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Plant */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('dashboard.calibrationV2.filter.plant')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-sm gap-1 min-w-[120px]">
                  {pending.plants.length
                    ? pending.plants.map(labelForPmCalibrationPlant).join(', ')
                    : t('dashboard.calibrationV2.filter.allPlants')}
                  <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Plant</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PM_CALIBRATION_PLANT_OPTIONS.map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p.code}
                    checked={pending.plants.includes(p.code)}
                    onCheckedChange={() => togglePlant(p.code)}
                  >
                    {p.label} ({p.code})
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('dashboard.calibrationV2.filter.department')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-sm gap-1 min-w-[130px]">
                    {pending.deptNos.length
                      ? `${pending.deptNos.length} dept${pending.deptNos.length > 1 ? 's' : ''}`
                      : t('dashboard.calibrationV2.filter.allDepts')}
                    <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Department</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {departments.map((d) => (
                    <DropdownMenuCheckboxItem
                      key={d.DEPTNO}
                      checked={pending.deptNos.includes(d.DEPTNO)}
                      onCheckedChange={() => toggleDept(d.DEPTNO)}
                    >
                      {d.DEPTNAME}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Assignee */}
          {users.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('dashboard.calibrationV2.filter.assignee')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-sm gap-1 min-w-[130px]">
                    {pending.assigneeIds.length
                      ? `${pending.assigneeIds.length} assignee${pending.assigneeIds.length > 1 ? 's' : ''}`
                      : t('dashboard.calibrationV2.filter.allAssignees')}
                    <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Assignee</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {users.map((u) => (
                    <DropdownMenuCheckboxItem
                      key={u.id}
                      checked={pending.assigneeIds.includes(String(u.id))}
                      onCheckedChange={() => toggleAssignee(String(u.id))}
                    >
                      {u.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Apply button */}
          <Button size="sm" className="h-8" onClick={handleApply}>
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {t('dashboard.calibrationV2.filter.apply')}
          </Button>

          {/* Active filter chips */}
          <div className="flex flex-wrap gap-1 ml-1">
            {applied.plant &&
              applied.plant.split(',').map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">
                  {labelForPmCalibrationPlant(c)}
                </Badge>
              ))}
            {applied.dept && (
              <Badge variant="secondary" className="text-xs">
                {applied.dept.split(',').length} dept
              </Badge>
            )}
            {applied.assigneeIds && (
              <Badge variant="secondary" className="text-xs">
                {applied.assigneeIds.split(',').length} assignee
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ---- Render: KPI row ----------------------------------------------------
  const renderKpiRow = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.calibrationV2.kpi.totalJobs')}</p>
              {kpiLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1">{totalJobs ?? '–'}</p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {applied.startDate} → {applied.endDate}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.calibrationV2.kpi.completed')}</p>
              {kpiLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-3xl font-bold mt-1 text-green-600">{totalCompleted ?? '–'}</p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-green-50 text-green-600 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">WO Status = 9</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.calibrationV2.kpi.completionRate')}</p>
              {kpiLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p
                  className={cn(
                    'text-3xl font-bold mt-1',
                    completionRate == null
                      ? ''
                      : completionRate >= 80
                        ? 'text-green-600'
                        : completionRate >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'
                  )}
                >
                  {completionRate != null ? `${completionRate}%` : '–'}
                </p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {completionRate != null && !kpiLoading && (
            <Progress value={completionRate} className="h-1.5 mt-3" />
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ---- Render: Equipment type tiles ---------------------------------------
  const renderEqTypeTiles = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('dashboard.calibrationV2.eqTypes.clickHint')}
        </h3>
        {activeEqType && (
          <Button variant="ghost" size="sm" onClick={() => setActiveEqType(null)} className="h-7 text-xs">
            Clear filter
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveEqType(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
            activeEqType === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border text-foreground'
          )}
        >
          All ({kpiLoading ? '…' : (totalJobs ?? 0)})
        </button>
        {equipmentTypes.map((et) => (
          <button
            key={et.typeKey}
            onClick={() => setActiveEqType(et.typeKey === activeEqType ? null : et.typeKey)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              activeEqType === et.typeKey
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border text-foreground'
            )}
          >
            {et.displayLabel || et.typeKey} ({et.count})
          </button>
        ))}
      </div>
    </div>
  );

  // ---- Render: Schedule list table ----------------------------------------
  const renderScheduleList = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">
          {t('dashboard.calibrationV2.schedule.title')}
          {listPagination.total > 0 && (
            <span className="ml-2 text-muted-foreground font-normal text-xs">
              ({listPagination.total} {t('dashboard.calibrationV2.schedule.rows')})
            </span>
          )}
        </h3>
      </div>

      {listLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : listItems.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">
          {t('dashboard.calibrationV2.schedule.empty')}
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">PM Code</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Equipment</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Due Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {listItems.map((item) => (
                <tr
                  key={item.PMSchNo}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => openScheduleDetail(item)}
                >
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{item.PMCODE}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={item.PMNAME}>{item.PMNAME}</td>
                  <td className="px-3 py-2">
                    {item.eqTypeKey ? (
                      <Badge variant="outline" className="text-xs">
                        {item.eqTypeKey === '_UNPARSED' ? 'Other' : item.eqTypeKey}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(item.DUEDATE)}</td>
                  <td className="px-3 py-2">{woStatusBadge(item)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]">
                    {item.assigneeName ?? '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {listPagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>Page {listPage} of {listPagination.totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!listPagination.hasPrev}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!listPagination.hasNext}
              onClick={() => setListPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Render: Equipment Types tab ----------------------------------------
  const EQ_TYPE_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899',
    '#14b8a6', '#f97316', '#8b5cf6', '#84cc16', '#06b6d4',
    '#ef4444', '#a855f7',
  ];

  const renderEquipmentTypesTab = () => {
    const grand = equipmentTypes.reduce((s, e) => s + e.count, 0);

    const labelFor = (et: { typeKey: string; displayLabel: string }) =>
      et.displayLabel || (et.typeKey === '_UNPARSED' ? 'Other' : et.typeKey);

    const donutData = equipmentTypes.map((et) => ({
      name: labelFor(et),
      typeKey: et.typeKey,
      value: et.count,
      pct: grand > 0 ? Math.round((et.count / grand) * 100) : 0,
    }));

    return (
      <div className="space-y-4">
        {/* Header + view toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t('dashboard.calibrationV2.eqTypes.title')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('dashboard.calibrationV2.eqTypes.description')}
            </p>
          </div>
          <div className="flex items-center rounded-md border overflow-hidden shrink-0">
            <button
              onClick={() => setEqTypeView('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                eqTypeView === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setEqTypeView('donut')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l',
                eqTypeView === 'donut'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <PieChartIcon className="h-3.5 w-3.5" />
              Chart
            </button>
          </div>
        </div>

        {/* Loading */}
        {kpiLoading ? (
          <div className={eqTypeView === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
            : 'flex justify-center'
          }>
            {eqTypeView === 'grid'
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : <Skeleton className="h-[400px] w-full max-w-2xl" />
            }
          </div>
        ) : equipmentTypes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No equipment type data.</p>

        ) : eqTypeView === 'grid' ? (
          /* ---- GRID VIEW ---- */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {equipmentTypes.map((et, idx) => {
              const pct = grand > 0 ? Math.round((et.count / grand) * 100) : 0;
              const color = EQ_TYPE_COLORS[idx % EQ_TYPE_COLORS.length];
              return (
                <button
                  key={et.typeKey}
                  onClick={() => {
                    setActiveEqType(et.typeKey === activeEqType ? null : et.typeKey);
                    setActiveTab('overview');
                  }}
                  className={cn(
                    'text-left p-4 rounded-lg border transition-all hover:shadow-md',
                    activeEqType === et.typeKey
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <p className="text-xs text-muted-foreground truncate">{et.typeKey}</p>
                  </div>
                  <p className="text-2xl font-bold">{et.count}</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{labelFor(et)}</p>
                  <Progress value={pct} className="h-1 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">{pct}% of total</p>
                </button>
              );
            })}
          </div>

        ) : (
          /* ---- DONUT VIEW ---- */
          <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
            {/* Chart — fixed pixel size, no ResponsiveContainer (avoids flex width measurement bugs) */}
            <div className="shrink-0">
              <PieChart width={600} height={600}>
                <Pie
                  data={donutData}
                  cx={300}
                  cy={300}
                  innerRadius={155}
                  outerRadius={240}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(d) => {
                    const key = (d as typeof donutData[0]).typeKey;
                    setActiveEqType(key === activeEqType ? null : key);
                    setActiveTab('overview');
                  }}
                >
                  {donutData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={EQ_TYPE_COLORS[idx % EQ_TYPE_COLORS.length]}
                      stroke="transparent"
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} jobs (${donutData.find((d) => d.name === name)?.pct ?? 0}%)`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                {/* Centre label */}
                <text
                  x={300}
                  y={278}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    fill:
                      completionRate == null
                        ? 'hsl(var(--foreground))'
                        : completionRate >= 80
                          ? '#16a34a'
                          : completionRate >= 50
                            ? '#ca8a04'
                            : '#dc2626',
                  }}
                >
                  {completionRate != null ? `${completionRate}%` : '–'}
                </text>
                <text
                  x={300}
                  y={314}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: 16, fill: 'hsl(var(--muted-foreground))' }}
                >
                  completion rate
                </text>
                <text
                  x={300}
                  y={344}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: 15, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                >
                  {`${totalCompleted ?? 0} / ${totalJobs ?? grand} jobs`}
                </text>
              </PieChart>
            </div>

            {/* Legend table — flex-1 fills all space beside the fixed chart */}
            <div className="flex-1 min-w-0 space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
              {donutData.map((d, idx) => (
                <button
                  key={d.typeKey}
                  onClick={() => {
                    setActiveEqType(d.typeKey === activeEqType ? null : d.typeKey);
                    setActiveTab('overview');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                    activeEqType === d.typeKey
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: EQ_TYPE_COLORS[idx % EQ_TYPE_COLORS.length] }}
                  />
                  <span className="flex-1 text-xs font-medium truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-12 text-right">
                    {d.typeKey !== d.name ? d.typeKey : ''}
                  </span>
                  <span className="text-xs font-bold tabular-nums shrink-0 w-8 text-right">{d.value}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">
                    {d.pct}%
                  </span>
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground px-2 pt-2">
                Click any row or slice to filter the Overview list.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Render: Team tab ---------------------------------------------------
  const renderTeamTab = () => {
    const teamYear = applied.companyYear ?? (companyYear ?? new Date().getFullYear());
    const isLoading = teamKpiLoading || teamPeriodsLoading;

    // Build period chartData per assignee from teamPeriods
    const periodsByAssignee = new Map<number, CalibrationAssigneePeriodSummary['periods']>();
    for (const a of teamPeriods) {
      periodsByAssignee.set(
        a.assigneeId,
        [...a.periods].sort((x, y) => x.periodNo - y.periodNo),
      );
    }

    // Merge: use teamKpi as the primary list (filtered range), enrich with period chart
    const members = teamKpi.length > 0 ? teamKpi : teamPeriods.map((a) => ({
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
      totalScheduled: a.periods.reduce((s, p) => s + p.finished + p.remaining, 0),
      totalCompleted: a.periods.reduce((s, p) => s + p.finished, 0),
      totalRemaining: a.periods.reduce((s, p) => s + p.remaining, 0),
    }));

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">{t('dashboard.calibrationV2.team.title')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('dashboard.calibrationV2.team.description')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Tiles: <span className="font-medium text-foreground">{applied.startDate} → {applied.endDate}</span>
            </span>
            <span>
              Chart: <span className="font-medium text-foreground">CY {teamYear} (all periods)</span>
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        )}

        {/* No data */}
        {!isLoading && members.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No calibration assignees found for the selected filters.
          </p>
        )}

        {/* Member rows */}
        {!isLoading && members.map((m) => {
          const rate = m.totalScheduled > 0
            ? Math.round((m.totalCompleted / m.totalScheduled) * 100)
            : null;
          const chartData = (periodsByAssignee.get(m.assigneeId) ?? []).map((p) => ({
            period: p.period,
            periodNo: p.periodNo,
            Completed: p.finished,
            Remaining: p.remaining,
          }));
          const hasChart = chartData.some((d) => d.Completed > 0 || d.Remaining > 0);

          return (
            <div
              key={m.assigneeId}
              className="rounded-lg border bg-card p-4 grid grid-cols-[200px_minmax(0,1fr)] gap-4"
            >
              {/* Left: name + KPI tiles — fixed 200px desktop column */}
              <div className="w-full lg:w-[200px] lg:min-w-[200px] lg:max-w-[200px] flex flex-col gap-2 overflow-hidden">
                <p className="font-semibold text-sm truncate pb-1 border-b" title={m.assigneeName}>
                  {m.assigneeName}
                </p>
                {/* Tiles fill the remaining height equally */}
                <div className="flex-1 flex flex-col gap-2">
                  {/* Scheduled */}
                  <div className="flex-1 rounded-md bg-blue-50 dark:bg-blue-950/40 px-3 py-2 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground leading-tight shrink-0">Scheduled</span>
                    <span className="text-xl font-bold tabular-nums text-right">{m.totalScheduled}</span>
                  </div>
                  {/* Completed */}
                  <div className="flex-1 rounded-md bg-green-50 dark:bg-green-950/40 px-3 py-2 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground leading-tight shrink-0">Completed</span>
                    <span className="text-xl font-bold tabular-nums text-right text-green-600">{m.totalCompleted}</span>
                  </div>
                  {/* Rate */}
                  <div className={cn(
                    'flex-1 rounded-md px-3 py-2 flex items-center justify-between gap-2 min-w-0',
                    rate == null ? 'bg-muted/40'
                      : rate >= 80 ? 'bg-green-50 dark:bg-green-950/40'
                      : rate >= 50 ? 'bg-yellow-50 dark:bg-yellow-950/40'
                      : 'bg-red-50 dark:bg-red-950/40'
                  )}>
                    <span className="text-xs text-muted-foreground leading-tight shrink-0">Rate</span>
                    <span className={cn(
                      'text-xl font-bold tabular-nums text-right',
                      rate == null ? '' : rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {rate != null ? `${rate}%` : '–'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: period bar chart — takes all remaining width */}
              <div className="min-w-0 w-full h-[180px]">
                {!hasChart ? (
                  <div className="flex items-center justify-center h-full min-h-[120px] text-xs text-muted-foreground">
                    No period data for CY {teamYear}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 28, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--background))',
                        }}
                      />
                      <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Remaining" stackId="a" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Render: User Events tab ---------------------------------------------
  const renderUserEventsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">{t('dashboard.calibrationV2.userEvents.title')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('dashboard.calibrationV2.userEvents.description')}
          </p>
        </div>
        <Button onClick={openCreateUserEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('dashboard.calibrationV2.userEvents.create')}
        </Button>
      </div>

      {userEventsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : userEventItems.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {t('dashboard.calibrationV2.userEvents.empty')}
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Category</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Range</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Scope</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userEventItems.map((event) => (
                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground max-w-md truncate" title={event.description}>
                          {event.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge variant="outline">{event.categoryLabel}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    <div>{formatDate(event.start_at)}</div>
                    <div className="text-muted-foreground">{formatDate(event.end_at)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {event.plant_label && <Badge variant="secondary" className="text-xs">{event.plant_label}</Badge>}
                      {event.dept_name && <Badge variant="secondary" className="text-xs">{event.dept_name}</Badge>}
                      {event.assignee_name && <Badge variant="secondary" className="text-xs">{event.assignee_name}</Badge>}
                      {!event.plant_label && !event.dept_name && !event.assignee_name && (
                        <span className="text-xs text-muted-foreground">Global</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge variant={event.is_active ? 'default' : 'secondary'}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditUserEvent(event)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUserEvent(event)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {userEventsPagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>Page {userEventsPage} of {userEventsPagination.totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!userEventsPagination.hasPrev}
              onClick={() => setUserEventsPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!userEventsPagination.hasNext}
              onClick={() => setUserEventsPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Render: Calendar tab -----------------------------------------------
  const renderCalendarTab = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('dashboard.calibrationV2.calendar.title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('dashboard.calibrationV2.calendar.description')}</p>
      </div>
      <CalibrationBigCalendar
        items={calItems}
        userEvents={calUserEvents}
        loading={calLoading}
        view={calendarView}
        date={calendarDate}
        onViewChange={setCalendarView}
        onNavigate={setCalendarDate}
        onSelectItem={openScheduleDetail}
        onSelectUserEvent={openEditUserEvent}
        rangeStart={calRangeInfo.rangeStart}
        rangeEnd={calRangeInfo.rangeEnd}
        loadedCount={calRangeInfo.count}
      />
    </div>
  );

  // ---- Main render --------------------------------------------------------
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title={t('dashboard.calibrationV2.title')}
        description={t('dashboard.calibrationV2.description')}
      />

      {/* Global filter bar */}
      {renderFilterBar()}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="space-y-4"
      >
        <TabsList className="h-10">
          <TabsTrigger value="overview" className="gap-1.5 text-sm">
            <ClipboardList className="h-4 w-4" />
            {t('dashboard.calibrationV2.tab.overview')}
          </TabsTrigger>
          <TabsTrigger value="equipment-types" className="gap-1.5 text-sm">
            <LayoutGrid className="h-4 w-4" />
            {t('dashboard.calibrationV2.tab.equipmentTypes')}
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-sm">
            <Users className="h-4 w-4" />
            {t('dashboard.calibrationV2.tab.team')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-sm">
            <CalendarDays className="h-4 w-4" />
            {t('dashboard.calibrationV2.tab.calendar')}
          </TabsTrigger>
          <TabsTrigger value="user-events" className="gap-1.5 text-sm">
            <CalendarDays className="h-4 w-4" />
            {t('dashboard.calibrationV2.tab.userEvents')}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5 text-sm text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Overdue
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {renderKpiRow()}
          {renderEqTypeTiles()}
          {renderScheduleList()}
        </TabsContent>

        {/* Equipment Types */}
        <TabsContent value="equipment-types" className="mt-0">
          {renderEquipmentTypesTab()}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="mt-0">
          {renderTeamTab()}
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-0">
          {renderCalendarTab()}
        </TabsContent>

        {/* User events */}
        <TabsContent value="user-events" className="mt-0">
          {renderUserEventsTab()}
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue" className="mt-0">
          <CalibrationOverduePanel />
        </TabsContent>
      </Tabs>

      <CalibrationUserEventModal
        open={userEventModalOpen}
        onOpenChange={(open) => {
          setUserEventModalOpen(open);
          if (!open) setSelectedUserEvent(null);
        }}
        eventItem={selectedUserEvent}
        categories={userEventCategories}
        departments={departments}
        users={users}
        onSaved={handleUserEventSaved}
      />

      <PmScheduleDetailModal
        schedule={selectedSchedule}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedSchedule(null);
        }}
      />
    </div>
  );
};

export default DashboardCalibrationV2Page;
