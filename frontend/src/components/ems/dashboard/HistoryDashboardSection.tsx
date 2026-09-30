import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Factory,
  PauseCircle,
  Search,
  Wrench,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmsKpiGrid, EmsKpiStat } from '@/components/ems/shared/EmsKpiStat';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import emsService, {
  type EmsWoHistoryAssigneeRow,
  type EmsWoHistoryData,
  type EmsWoHistoryPlantRow,
  type EmsWoHistoryTotals,
} from '@/services/emsService';
import {
  formatTimeTravelSelectionLabel,
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';

import DashboardWoHistoryCharts from './DashboardWoHistoryCharts';

interface Props {
  timeTravel: DashboardTimeTravelValue;
}

type SortKey = 'plant' | 'total' | 'openPastDue' | 'late' | 'postponed';
type SortDir = 'asc' | 'desc';

const ALL_PLANTS = '__all__';

function emptyTotals(): EmsWoHistoryTotals {
  return { total: 0, ontime: 0, late: 0, notFinish: 0, openPastDue: 0, postponed: 0 };
}

function emptyHistory(timeTravel: DashboardTimeTravelValue, range: { startDate: string; endDate: string }): EmsWoHistoryData {
  return {
    mode: timeTravel.mode,
    grain: timeTravel.mode === 'year' ? 'period' : 'day',
    year: timeTravel.year,
    month: timeTravel.month,
    period: timeTravel.period,
    rangeStart: range.startDate,
    rangeEnd: range.endDate,
    totals: emptyTotals(),
    byPlant: PM_CALIBRATION_PLANT_OPTIONS.map((p) => ({
      plant: p.code,
      plantLabel: p.label,
      ...emptyTotals(),
    })),
    byAssignee: [],
    byTime: [],
  };
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'w-full justify-end',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </TableHead>
  );
}

const HistoryDashboardSection: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const dateRange = getTimeTravelDateRange(timeTravel);
  const rangeLabel = formatTimeTravelSelectionLabel(timeTravel, t);
  const [data, setData] = useState<EmsWoHistoryData>(() => emptyHistory(timeTravel, dateRange));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState(ALL_PLANTS);
  const [chartPlant, setChartPlant] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    emsService
      .getWoHistory({
        mode: timeTravel.mode,
        year: timeTravel.year,
        month: timeTravel.month,
        period: timeTravel.period,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .then((next) => {
        if (cancelled) return;
        setData(next);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setData(emptyHistory(timeTravel, dateRange));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    dateRange.endDate,
    dateRange.startDate,
    t,
    timeTravel.mode,
    timeTravel.month,
    timeTravel.period,
    timeTravel.year,
  ]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'plant' ? 'asc' : 'desc');
  };

  const filteredPlants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.byPlant || []).filter((p) => {
      if (plantFilter !== ALL_PLANTS && p.plant !== plantFilter) return false;
      if (!q) return true;
      return p.plant.toLowerCase().includes(q) || p.plantLabel.toLowerCase().includes(q);
    });
  }, [data.byPlant, plantFilter, search]);

  const sortedPlants = useMemo(() => {
    const rows = [...filteredPlants];
    const mult = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'plant':
          cmp = a.plantLabel.localeCompare(b.plantLabel);
          break;
        case 'total':
          cmp = a.total - b.total;
          break;
        case 'openPastDue':
          cmp = a.openPastDue - b.openPastDue;
          break;
        case 'late':
          cmp = a.late - b.late;
          break;
        case 'postponed':
          cmp = a.postponed - b.postponed;
          break;
        default:
          cmp = 0;
      }
      if (cmp === 0) return a.plant.localeCompare(b.plant);
      return cmp * mult;
    });
    return rows;
  }, [filteredPlants, sortDir, sortKey]);

  const totals = data.totals ?? emptyTotals();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneHistory')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('ems.dashboard.v2.zoneHistoryDesc', { label: rangeLabel })}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <EmsKpiGrid columns="4" className="gap-3">
        <EmsKpiStat
          label={t('ems.dashboard.v2.historyTotalWo')}
          value={totals.total}
          icon={Wrench}
          iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
          loading={loading}
          compact
        />
        <EmsKpiStat
          label={t('ems.dashboard.v2.historyOpenPastDue')}
          value={totals.openPastDue}
          icon={AlertTriangle}
          valueClassName="text-destructive"
          iconClassName="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
          loading={loading}
          compact
        />
        <EmsKpiStat
          label={t('ems.dashboard.v2.historyFinishedLate')}
          value={totals.late}
          icon={Clock3}
          valueClassName="text-amber-600"
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          loading={loading}
          compact
        />
        <EmsKpiStat
          label={t('ems.dashboard.v2.postponed')}
          value={totals.postponed}
          icon={PauseCircle}
          valueClassName="text-violet-600"
          iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400"
          loading={loading}
          compact
        />
      </EmsKpiGrid>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Factory className="h-4 w-4 text-emerald-600" aria-hidden />
            {t('ems.dashboard.v2.historyPlantTable')}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ems.dashboard.v2.searchPlant')}
                className="h-9 pl-8"
              />
            </div>
            <Select value={plantFilter} onValueChange={setPlantFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLANTS}>{t('ems.equipment.filter.allPlants')}</SelectItem>
                {PM_CALIBRATION_PLANT_OPTIONS.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead
                      label={t('ems.dashboard.v2.table.plant')}
                      sortKey="plant"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      align="left"
                    />
                    <SortableHead
                      label={t('ems.dashboard.v2.historyTotalWo')}
                      sortKey="total"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label={t('ems.dashboard.v2.historyOpenPastDue')}
                      sortKey="openPastDue"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label={t('ems.dashboard.v2.historyFinishedLate')}
                      sortKey="late"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label={t('ems.dashboard.v2.postponed')}
                      sortKey="postponed"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <TableHead className="text-right">{t('ems.dashboard.v2.woStatusOntime')}</TableHead>
                    <TableHead className="text-right">{t('ems.dashboard.v2.woStatusNotFinish')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t('ems.dashboard.v2.noPlantsMatch')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPlants.map((plant: EmsWoHistoryPlantRow) => (
                      <TableRow key={plant.plant}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {plant.plant.slice(0, 3)}
                            </div>
                            <p className="font-semibold">{plant.plantLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{plant.total}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            plant.openPastDue > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {plant.openPastDue}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            plant.late > 0 ? 'text-amber-600' : 'text-muted-foreground'
                          )}
                        >
                          {plant.late}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            plant.postponed > 0 ? 'text-violet-600' : 'text-muted-foreground'
                          )}
                        >
                          {plant.postponed}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">
                          <span className="inline-flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {plant.ontime}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {plant.notFinish}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardWoHistoryCharts
        timeTravel={timeTravel}
        grain={data.grain}
        byTime={data.byTime}
        byAssignee={data.byAssignee as EmsWoHistoryAssigneeRow[]}
        chartPlant={chartPlant}
        onChartPlantChange={setChartPlant}
        loading={loading}
      />
    </section>
  );
};

export default HistoryDashboardSection;
