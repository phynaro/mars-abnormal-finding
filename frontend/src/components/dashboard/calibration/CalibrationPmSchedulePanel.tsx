import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { ChevronDown, ClipboardList, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculatePeriodForDate, getDateRangeForFilter } from '@/utils/periodCalculations';
import {
  PM_CALIBRATION_PLANT_OPTIONS,
  labelForPmCalibrationPlant,
  serializePmCalibrationPlants,
} from '@/utils/pmCalibrationPlantMap';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import calibrationService from '@/services/calibrationService';
import type { PmScheduleListItem, PmScheduleEquipmentTypeCount } from '@/services/calibrationService';
import personnelService from '@/services/personnelService';
import type { Department } from '@/services/personnelService';

type TimeFilterKey = 'this-year' | 'this-period' | 'select-period';

interface PendingState {
  timeFilter: TimeFilterKey;
  year: number;
  periods: number[];
  plants: string[];
  deptNos: number[];
  assigneeIds: string[];
}

interface AppliedQuery {
  startDate: string;
  endDate: string;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
  /** Parsed EQ equipment type (from EQCODE 5th segment); omit = all types */
  eqType?: string;
}

function computeAppliedQuery(pending: PendingState): AppliedQuery {
  const periods =
    pending.timeFilter === 'select-period' && pending.periods.length > 0
      ? [...pending.periods].sort((a, b) => a - b)
      : pending.timeFilter === 'select-period'
        ? [calculatePeriodForDate(new Date(), pending.year).period]
        : undefined;
  const dr = getDateRangeForFilter(
    pending.timeFilter,
    pending.year,
    undefined,
    periods
  );
  const plant = serializePmCalibrationPlants(pending.plants);
  return {
    startDate: dr.startDate,
    endDate: dr.endDate,
    ...(plant ? { plant } : {}),
    ...(pending.deptNos.length ? { dept: pending.deptNos.join(',') } : {}),
    ...(pending.assigneeIds.length ? { assigneeIds: pending.assigneeIds.join(',') } : {}),
  };
}

function formatDueCell(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 10 && s[4] === '-') return s.slice(0, 10);
  if (s.length >= 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

const LIST_LIMIT = 15;

const CalibrationPmSchedulePanel: React.FC<{ companyYear?: number | null }> = ({
  companyYear,
}) => {
  const { t, language } = useLanguage();
  const defaultYear = companyYear ?? new Date().getFullYear();
  const initialPeriod = calculatePeriodForDate(new Date(), defaultYear).period;

  const [pending, setPending] = useState<PendingState>({
    timeFilter: 'this-period',
    year: defaultYear,
    periods: [initialPeriod],
    plants: [],
    deptNos: [],
    assigneeIds: [],
  });

  const [appliedQuery, setAppliedQuery] = useState<AppliedQuery>(() =>
    computeAppliedQuery({
      timeFilter: 'this-period',
      year: defaultYear,
      periods: [initialPeriod],
      plants: [],
      deptNos: [],
      assigneeIds: [],
    })
  );

  const [listPage, setListPage] = useState(1);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
  const [items, setItems] = useState<PmScheduleListItem[]>([]);
  const [listPagination, setListPagination] = useState({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [equipmentTypes, setEquipmentTypes] = useState<PmScheduleEquipmentTypeCount[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (companyYear != null) {
      setPending((p) => ({ ...p, year: companyYear }));
    }
  }, [companyYear]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [deptRes, assigneeRes] = await Promise.all([
          personnelService.getDepartments({ limit: 1000 }),
          calibrationService.getPmScheduleAssignees(),
        ]);
        if (deptRes.success) setDepartments(deptRes.data);
        if (assigneeRes.success) {
          const list = assigneeRes.data.users ?? [];
          setUsers(list);
          const allowed = new Set(list.map((u) => String(u.id)));
          setPending((p) => ({
            ...p,
            assigneeIds: p.assigneeIds.filter((id) => allowed.has(id)),
          }));
          setAppliedQuery((q) => {
            if (!q.assigneeIds) return q;
            const parts = q.assigneeIds.split(',').map((s) => s.trim()).filter(Boolean);
            const next = parts.filter((id) => allowed.has(id)).join(',');
            return next ? { ...q, assigneeIds: next } : { ...q, assigneeIds: undefined };
          });
        }
      } catch {
        setDepartments([]);
        setUsers([]);
      }
    };
    loadMeta();
  }, []);

  const yearOptions = useMemo(() => {
    const base = companyYear ?? new Date().getFullYear();
    const set = new Set<number>();
    for (let i = 0; i < 10; i += 1) set.add(base - i);
    set.add(pending.year);
    return Array.from(set).sort((a, b) => b - a);
  }, [companyYear, pending.year]);

  const fetchData = useCallback(async () => {
    setKpiLoading(true);
    setListLoading(true);
    try {
      const [kpi, list] = await Promise.all([
        calibrationService.getPmScheduleKpi({ ...appliedQuery }),
        calibrationService.getPmScheduleList({ ...appliedQuery, page: listPage, limit: LIST_LIMIT }),
      ]);
      if (kpi.success) {
        setTotalJobs(kpi.data.totalCalibrationJobs);
        setTotalCompleted(kpi.data.totalCompleted);
        setEquipmentTypes(kpi.data.equipmentTypes ?? []);
      }
      if (list.success) {
        setItems(list.data.items);
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
      setEquipmentTypes([]);
      setItems([]);
    } finally {
      setKpiLoading(false);
      setListLoading(false);
    }
  }, [appliedQuery, listPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = () => {
    setAppliedQuery(computeAppliedQuery(pending));
    setListPage(1);
  };

  const selectEquipmentTypeFilter = (typeKey: string | null) => {
    setAppliedQuery((prev) => ({
      ...prev,
      eqType: typeKey ?? undefined,
    }));
    setListPage(1);
  };

  const togglePeriod = (periodNo: number) => {
    setPending((p) => {
      const set = new Set(p.periods);
      if (set.has(periodNo)) set.delete(periodNo);
      else set.add(periodNo);
      let next = Array.from(set).sort((a, b) => a - b);
      if (next.length === 0) next = [periodNo];
      return { ...p, periods: next };
    });
  };

  const togglePlant = (code: string) => {
    setPending((p) => {
      const set = new Set(p.plants);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      return { ...p, plants: Array.from(set) };
    });
  };

  const toggleDept = (deptNo: number) => {
    setPending((p) => {
      const set = new Set(p.deptNos);
      if (set.has(deptNo)) set.delete(deptNo);
      else set.add(deptNo);
      return { ...p, deptNos: Array.from(set).sort((a, b) => a - b) };
    });
  };

  const toggleAssignee = (id: string) => {
    setPending((p) => {
      const set = new Set(p.assigneeIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, assigneeIds: Array.from(set) };
    });
  };

  const assigneeLabel = (id: string) => users.find((u) => String(u.id) === id)?.name ?? `User ${id}`;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('dashboard.calibration.pmScheduleTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.calibration.pmScheduleDescription')}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.calibration.pmScheduleFilters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[160px]">
              <Label>{t('dashboard.calibration.timeRangeStyle')}</Label>
              <Select
                value={pending.timeFilter}
                onValueChange={(v) =>
                  setPending((p) => ({
                    ...p,
                    timeFilter: v as TimeFilterKey,
                    periods:
                      v === 'select-period' && p.periods.length === 0
                        ? [calculatePeriodForDate(new Date(), p.year).period]
                        : p.periods,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-year">{t('dashboard.thisYear')}</SelectItem>
                  <SelectItem value="this-period">{t('dashboard.thisPeriod')}</SelectItem>
                  <SelectItem value="select-period">{t('dashboard.selectPeriod')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[120px]">
              <Label>{t('dashboard.calibration.yearLabel')}</Label>
              <Select
                value={String(pending.year)}
                onValueChange={(v) => setPending((p) => ({ ...p, year: parseInt(v, 10) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pending.timeFilter === 'select-period' && (
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>{t('dashboard.period')}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {pending.periods.length === 0
                          ? t('dashboard.selectPeriod')
                          : pending.periods.length <= 3
                            ? pending.periods.map((n) => `P${n}`).join(', ')
                            : `${pending.periods.length} ${t('dashboard.calibration.periodsSelected')}`}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-72 overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuLabel>{t('dashboard.period')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((periodNo) => (
                      <DropdownMenuCheckboxItem
                        key={periodNo}
                        checked={pending.periods.includes(periodNo)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => togglePeriod(periodNo)}
                      >
                        P{periodNo}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <Button className="mt-6" onClick={handleApply}>
              {t('dashboard.calibration.applyFilters')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('dashboard.calibration.plants')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {pending.plants.length === 0
                        ? t('dashboard.calibration.allPlants')
                        : pending.plants.length <= 2
                          ? pending.plants.map(labelForPmCalibrationPlant).join(', ')
                          : `${pending.plants.length} ${language === 'th' ? 'โรงงาน' : 'plants'}`}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel>{t('dashboard.calibration.plants')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PM_CALIBRATION_PLANT_OPTIONS.map(({ code }) => (
                    <DropdownMenuCheckboxItem
                      key={code}
                      checked={pending.plants.includes(code)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={() => togglePlant(code)}
                    >
                      {labelForPmCalibrationPlant(code)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label>{t('dashboard.calibration.departments')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {pending.deptNos.length === 0
                        ? t('dashboard.calibration.allDepartments')
                        : pending.deptNos.length <= 2
                          ? pending.deptNos
                              .map((n) => departments.find((d) => d.DEPTNO === n)?.DEPTNAME ?? String(n))
                              .join(', ')
                          : `${pending.deptNos.length} ${language === 'th' ? 'แผนก' : 'departments'}`}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel>{t('dashboard.calibration.departments')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {departments.map((d) => (
                    <DropdownMenuCheckboxItem
                      key={d.DEPTNO}
                      checked={pending.deptNos.includes(d.DEPTNO)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={() => toggleDept(d.DEPTNO)}
                    >
                      {d.DEPTNAME} ({d.DEPTCODE})
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label>{t('dashboard.calibration.assignees')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">
                      {pending.assigneeIds.length === 0
                        ? t('ticket.allUsers')
                        : pending.assigneeIds.length <= 2
                          ? pending.assigneeIds.map(assigneeLabel).join(', ')
                          : `${pending.assigneeIds.length} ${language === 'th' ? 'ผู้รับผิดชอบ' : 'assignees'}`}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel>{t('dashboard.calibration.assignees')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {users.map((u) => {
                    const value = String(u.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={u.id}
                        checked={pending.assigneeIds.includes(value)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleAssignee(value)}
                      >
                        {u.name}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {appliedQuery.startDate} — {appliedQuery.endDate}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.calibration.totalCalJobs')}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-3xl font-semibold tabular-nums">{totalJobs ?? '–'}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.calibration.totalCompletedJobs')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-3xl font-semibold tabular-nums">{totalCompleted ?? '–'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('dashboard.calibration.equipmentTypeTiles')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('dashboard.calibration.equipmentTypeTilesHint')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectEquipmentTypeFilter(null)}
            className={cn(
              'rounded-lg border px-3 py-2 text-left transition-colors min-w-[7rem] hover:bg-muted/60',
              !appliedQuery.eqType ? 'border-primary ring-1 ring-primary bg-muted/40' : 'border-border'
            )}
          >
            <div className="text-xs font-medium text-muted-foreground">{t('dashboard.calibration.allEquipmentTypes')}</div>
            <div className="text-lg font-semibold tabular-nums">
              {kpiLoading ? '–' : equipmentTypes.reduce((s, x) => s + x.count, 0)}
            </div>
          </button>
          {equipmentTypes.map((et) => {
            const selected = appliedQuery.eqType === et.typeKey;
            const title =
              et.displayLabel && et.displayLabel !== et.typeKey
                ? `${et.typeKey} · ${et.displayLabel}`
                : et.typeKey;
            return (
              <button
                key={et.typeKey}
                type="button"
                onClick={() => selectEquipmentTypeFilter(et.typeKey)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors max-w-[14rem] hover:bg-muted/60',
                  selected ? 'border-primary ring-1 ring-primary bg-muted/40' : 'border-border'
                )}
              >
                <div className="text-xs font-medium text-muted-foreground line-clamp-2" title={title}>
                  {et.typeKey === '_UNPARSED' ? t('dashboard.calibration.eqTypeUnparsed') : et.typeKey}
                </div>
                {et.displayLabel && et.typeKey !== '_UNPARSED' && (
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{et.displayLabel}</div>
                )}
                <div className="text-lg font-semibold tabular-nums mt-1">{et.count}</div>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.calibration.pmScheduleListTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {listLoading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.calibration.pmScheduleEmpty')}</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {items.map((row) => (
                <div
                  key={row.PMSchNo}
                  className="flex flex-wrap items-center gap-2 py-3 text-sm"
                >
                  <span className="font-mono text-muted-foreground">{row.PMCODE}</span>
                  {row.eqTypeKey && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {row.eqTypeKey === '_UNPARSED' ? t('dashboard.calibration.eqTypeUnparsed') : row.eqTypeKey}
                    </Badge>
                  )}
                  <span className="font-medium">{row.PMNAME}</span>
                  <span className="text-muted-foreground">
                    {t('dashboard.calibration.due')}: {formatDueCell(row.DUEDATE)}
                  </span>
                  {row.assigneeName && (
                    <span className="text-muted-foreground">{row.assigneeName}</span>
                  )}
                  {row.WONo != null && row.WONo !== 0 ? (
                    <Link
                      to={`/maintenance/work-orders/${row.WONo}`}
                      className="text-primary hover:underline"
                    >
                      {row.WOCODE ?? `WO ${row.WONo}`}
                      {row.woStatusNo != null ? ` (${row.woStatusNo})` : ''}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{t('dashboard.calibration.noWo')}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {listPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {listPagination.total} {t('dashboard.calibration.rowsTotal')}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!listPagination.hasPrev || listLoading}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm self-center tabular-nums">
                  {listPage} / {listPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!listPagination.hasNext || listLoading}
                  onClick={() => setListPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default CalibrationPmSchedulePanel;
