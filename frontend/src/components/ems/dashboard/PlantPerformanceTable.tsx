import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Clock,
  Factory,
  Package,
  PauseCircle,
  Search,
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
import type { EmsKpiData, EmsPlantMatrixItem } from '@/services/emsService';

interface Props {
  plants: EmsPlantMatrixItem[];
  kpiByPlant: Record<string, EmsKpiData>;
  kpiLoading?: boolean;
  rangeLabel?: string;
}

type SortKey =
  | 'plant'
  | 'completion'
  | 'totalEquipment'
  | 'overdue'
  | 'dueThisWeek'
  | 'dueSoon'
  | 'postponed';

type SortDir = 'asc' | 'desc';

const ALL_PLANTS = '__all__';

const RING_SIZE = 40;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function emptyKpi(): EmsKpiData {
  return { totalEquipment: 0, overdue: 0, dueThisWeek: 0, dueSoon: 0, ok: 0, noWo: 0 };
}

function plantHref(plant: string, kpiBucket?: string): string {
  const params = new URLSearchParams();
  params.set('plant', plant);
  if (kpiBucket) params.set('kpiBucket', kpiBucket);
  return `/ems/equipment?${params.toString()}`;
}

function CompletionRing({ rate, total }: { rate: number; total: number }) {
  const offset = RING_CIRCUMFERENCE - (rate / 100) * RING_CIRCUMFERENCE;
  const center = RING_SIZE / 2;
  const hasWork = total > 0;

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          className="text-muted/40"
        />
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={hasWork ? offset : RING_CIRCUMFERENCE}
          strokeLinecap="round"
          className={cn(
            hasWork && rate >= 80 && 'text-green-500',
            hasWork && rate >= 50 && rate < 80 && 'text-amber-500',
            hasWork && rate < 50 && 'text-red-500',
            !hasWork && 'text-muted-foreground/30'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold tabular-nums leading-none">
          {hasWork ? `${rate}%` : '—'}
        </span>
      </div>
    </div>
  );
}

function StatusBreakdownBar({
  kpi,
  loading,
}: {
  kpi: EmsKpiData | undefined;
  loading?: boolean;
}) {
  const { t } = useLanguage();

  if (loading && !kpi) {
    return <Skeleton className="h-4 w-full rounded-full" />;
  }

  const data = kpi ?? emptyKpi();
  const segments = [
    { key: 'overdue', count: data.overdue, color: 'bg-red-500', label: t('ems.dashboard.v2.statusOverdue') },
    {
      key: 'dueThisWeek',
      count: data.dueThisWeek,
      color: 'bg-orange-500',
      label: t('ems.dashboard.dueThisWeek'),
    },
    { key: 'dueSoon', count: data.dueSoon, color: 'bg-blue-500', label: t('ems.status.dueSoon') },
    { key: 'ok', count: data.ok, color: 'bg-green-500', label: t('ems.dashboard.v2.statusOnTrack') },
  ];
  const classified = segments.reduce((sum, s) => sum + s.count, 0);
  const remainder = Math.max(0, data.totalEquipment - classified);
  const total = data.totalEquipment;

  if (total <= 0) {
    return <div className="h-4 w-full rounded-full bg-muted/50" aria-hidden />;
  }

  return (
    <div
      className="flex h-4 w-full overflow-hidden rounded-full bg-muted/30 gap-px"
      title={[
        ...segments.map((s) => `${s.label}: ${s.count}`),
        remainder > 0 ? `${t('ems.dashboard.v2.statusNoWo')}: ${remainder}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {segments.map((seg) => {
        const pct = (seg.count / total) * 100;
        if (pct <= 0) return null;
        return (
          <div
            key={seg.key}
            className={cn('h-full transition-all', seg.color)}
            style={{ width: `${pct}%` }}
          />
        );
      })}
      {remainder > 0 && (
        <div className="h-full bg-muted-foreground/25" style={{ width: `${(remainder / total) * 100}%` }} />
      )}
    </div>
  );
}

function KpiNumberLink({
  value,
  href,
  className,
  tooltip,
  loading,
}: {
  value: number | undefined;
  href: string;
  className?: string;
  tooltip: string;
  loading?: boolean;
}) {
  if (loading && typeof value !== 'number') {
    return <span className="text-muted-foreground tabular-nums">...</span>;
  }

  const n = typeof value === 'number' ? value : 0;

  if (n === 0) {
    return <span className={cn('tabular-nums text-muted-foreground', className)}>0</span>;
  }

  return (
    <Link
      to={href}
      title={tooltip}
      className={cn(
        'inline-flex min-w-[2rem] justify-end rounded-sm px-1 py-0.5 font-semibold tabular-nums',
        'hover:underline hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {n}
    </Link>
  );
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
    <TableHead className={cn(align === 'right' ? 'text-right' : 'text-left')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 font-medium hover:text-foreground',
          align === 'right' && 'ml-auto',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </TableHead>
  );
}

const PlantPerformanceTable: React.FC<Props> = ({ plants, kpiByPlant, kpiLoading, rangeLabel }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState(ALL_PLANTS);
  const [sortKey, setSortKey] = useState<SortKey>('overdue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
    return plants.filter((p) => {
      if (plantFilter !== ALL_PLANTS && p.plant !== plantFilter) return false;
      if (!q) return true;
      return (
        p.plant.toLowerCase().includes(q) ||
        p.plantLabel.toLowerCase().includes(q)
      );
    });
  }, [plantFilter, plants, search]);

  const sortedPlants = useMemo(() => {
    const rows = [...filteredPlants];
    const mult = sortDir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      const kpiA = kpiByPlant[a.plant];
      const kpiB = kpiByPlant[b.plant];

      let cmp = 0;
      switch (sortKey) {
        case 'plant':
          cmp = a.plantLabel.localeCompare(b.plantLabel);
          break;
        case 'completion': {
          const aVal = a.total > 0 ? a.completionRate : -1;
          const bVal = b.total > 0 ? b.completionRate : -1;
          cmp = aVal - bVal;
          break;
        }
        case 'totalEquipment':
          cmp = (kpiA?.totalEquipment ?? 0) - (kpiB?.totalEquipment ?? 0);
          break;
        case 'overdue':
          cmp = (kpiA?.overdue ?? 0) - (kpiB?.overdue ?? 0);
          break;
        case 'dueThisWeek':
          cmp = (kpiA?.dueThisWeek ?? 0) - (kpiB?.dueThisWeek ?? 0);
          break;
        case 'dueSoon':
          cmp = (kpiA?.dueSoon ?? 0) - (kpiB?.dueSoon ?? 0);
          break;
        case 'postponed':
          cmp = a.wo_postpone - b.wo_postpone;
          break;
        default:
          cmp = 0;
      }
      if (cmp === 0) return a.plant.localeCompare(b.plant);
      return cmp * mult;
    });

    return rows;
  }, [filteredPlants, kpiByPlant, sortDir, sortKey]);

  const portfolio = useMemo(() => {
    return filteredPlants.reduce(
      (acc, plant) => {
        const kpi = kpiByPlant[plant.plant];
        acc.totalEquipment += kpi?.totalEquipment ?? 0;
        acc.overdue += kpi?.overdue ?? 0;
        acc.dueThisWeek += kpi?.dueThisWeek ?? 0;
        acc.dueSoon += kpi?.dueSoon ?? 0;
        acc.postponed += plant.wo_postpone ?? 0;
        return acc;
      },
      { totalEquipment: 0, overdue: 0, dueThisWeek: 0, dueSoon: 0, postponed: 0 }
    );
  }, [filteredPlants, kpiByPlant]);

  const legendItems = [
    { color: 'bg-red-500', label: t('ems.dashboard.v2.statusOverdue') },
    { color: 'bg-orange-500', label: t('ems.dashboard.dueThisWeek') },
    { color: 'bg-blue-500', label: t('ems.status.dueSoon') },
    { color: 'bg-green-500', label: t('ems.dashboard.v2.statusOnTrack') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <EmsKpiGrid columns="5" className="flex-1 gap-3">
          <EmsKpiStat
            label={t('ems.dashboard.total')}
            value={portfolio.totalEquipment}
            icon={Package}
            iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.dashboard.overdueTitle')}
            value={portfolio.overdue}
            icon={AlertTriangle}
            valueClassName="text-destructive"
            iconClassName="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.dashboard.dueThisWeek')}
            value={portfolio.dueThisWeek}
            icon={Clock}
            valueClassName="text-orange-600"
            iconClassName="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.status.dueSoon')}
            value={portfolio.dueSoon}
            icon={CalendarClock}
            valueClassName="text-blue-600"
            iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.dashboard.v2.postponed')}
            value={portfolio.postponed}
            icon={PauseCircle}
            valueClassName="text-violet-600"
            iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400"
            compact
          />
        </EmsKpiGrid>

        <Card className="shadow-sm xl:w-[220px] shrink-0">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t('ems.dashboard.v2.taskStatusLegend')}
            </p>
            <div className="space-y-1.5">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', item.color)} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Factory className="h-4 w-4 text-emerald-600" aria-hidden />
            {t('ems.dashboard.v2.plantsHeading')}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('ems.dashboard.v2.searchPlant')}
                className="h-9 pl-8"
                aria-label={t('ems.dashboard.v2.searchPlant')}
              />
            </div>
            <Select value={plantFilter} onValueChange={setPlantFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]" aria-label={t('ems.equipment.filter.allPlants')}>
                <SelectValue placeholder={t('ems.equipment.filter.allPlants')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLANTS}>{t('ems.equipment.filter.allPlants')}</SelectItem>
                {plants.map((p) => (
                  <SelectItem key={p.plant} value={p.plant}>
                    {p.plantLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
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
                    label={t('ems.dashboard.v2.table.completion')}
                    sortKey="completion"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('ems.dashboard.total')}
                    sortKey="totalEquipment"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('ems.dashboard.v2.statusOverdue')}
                    sortKey="overdue"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('ems.dashboard.dueThisWeek')}
                    sortKey="dueThisWeek"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label={t('ems.status.dueSoon')}
                    sortKey="dueSoon"
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
                  <TableHead className="min-w-[140px]">
                    {t('ems.dashboard.v2.table.statusBreakdown')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {t('ems.dashboard.v2.noPlantsMatch')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPlants.map((plant) => {
                    const kpi = kpiByPlant[plant.plant];
                    const hasWork = plant.total > 0;

                    return (
                      <TableRow key={plant.plant} className="h-[64px]">
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {plant.plant.slice(0, 3)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{plant.plantLabel}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {hasWork
                                  ? t('ems.dashboard.v2.tasksCompletedShort', {
                                      done: plant.done,
                                      total: plant.total,
                                    })
                                  : t('ems.dashboard.v2.noScheduledTasks')}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <CompletionRing rate={plant.completionRate} total={plant.total} />
                            <span
                              className={cn(
                                'text-xs tabular-nums',
                                hasWork ? 'font-medium' : 'text-muted-foreground'
                              )}
                              aria-label={
                                hasWork
                                  ? t('ems.dashboard.v2.completionAria', { rate: plant.completionRate })
                                  : t('ems.dashboard.v2.completionNa')
                              }
                            >
                              {hasWork ? `${plant.completionRate}%` : t('ems.dashboard.v2.completionNa')}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <KpiNumberLink
                            value={kpi?.totalEquipment}
                            href={plantHref(plant.plant)}
                            loading={kpiLoading}
                            tooltip={t('ems.dashboard.v2.viewEquipment', {
                              count: kpi?.totalEquipment ?? 0,
                              plant: plant.plantLabel,
                            })}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <KpiNumberLink
                            value={kpi?.overdue}
                            href={plantHref(plant.plant, 'overdue')}
                            loading={kpiLoading}
                            className={(kpi?.overdue ?? 0) > 0 ? 'text-destructive' : undefined}
                            tooltip={t('ems.dashboard.v2.viewOverdue', {
                              count: kpi?.overdue ?? 0,
                            })}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <KpiNumberLink
                            value={kpi?.dueThisWeek}
                            href={plantHref(plant.plant, 'due_this_week')}
                            loading={kpiLoading}
                            className={(kpi?.dueThisWeek ?? 0) > 0 ? 'text-orange-600' : undefined}
                            tooltip={t('ems.dashboard.v2.viewDueThisWeek', {
                              count: kpi?.dueThisWeek ?? 0,
                            })}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <KpiNumberLink
                            value={kpi?.dueSoon}
                            href={plantHref(plant.plant, 'due_soon')}
                            loading={kpiLoading}
                            className={(kpi?.dueSoon ?? 0) > 0 ? 'text-blue-600' : undefined}
                            tooltip={t('ems.dashboard.v2.viewDueSoon', {
                              count: kpi?.dueSoon ?? 0,
                            })}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'tabular-nums font-semibold',
                              plant.wo_postpone > 0 ? 'text-violet-600' : 'text-muted-foreground'
                            )}
                            title={
                              rangeLabel
                                ? t('ems.dashboard.v2.postponedInRange', { label: rangeLabel })
                                : undefined
                            }
                          >
                            {plant.wo_postpone}
                          </span>
                        </TableCell>

                        <TableCell className="min-w-[140px]">
                          <StatusBreakdownBar kpi={kpi} loading={kpiLoading} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              {t('ems.dashboard.v2.showingPlants', { count: sortedPlants.length })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantPerformanceTable;
