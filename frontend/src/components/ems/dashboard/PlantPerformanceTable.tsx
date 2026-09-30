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
import type { EmsKpiData } from '@/services/emsService';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';

interface Props {
  kpiByPlant: Record<string, EmsKpiData>;
  kpiLoading?: boolean;
}

type SortKey = 'plant' | 'totalEquipment' | 'overdue' | 'dueThisWeek' | 'dueSoon';
type SortDir = 'asc' | 'desc';

const ALL_PLANTS = '__all__';

function emptyKpi(): EmsKpiData {
  return {
    totalEquipment: 0,
    overdue: 0,
    overdueNoWo: 0,
    dueThisWeek: 0,
    dueThisWeekNoWo: 0,
    dueSoon: 0,
    dueSoonNoWo: 0,
    ok: 0,
    noWo: 0,
  };
}

function plantHref(plant: string, kpiBucket?: string): string {
  const params = new URLSearchParams();
  params.set('plant', plant);
  if (kpiBucket) params.set('kpiBucket', kpiBucket);
  return `/ems/equipment?${params.toString()}`;
}

function noWoHint(count: number | undefined, t: (key: string, vars?: Record<string, string | number>) => string) {
  const n = count ?? 0;
  return t('ems.dashboard.v2.noWoHint', { count: n });
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
  const overdue = data.overdue;
  const nearNoWo = (data.dueThisWeekNoWo ?? 0) + (data.dueSoonNoWo ?? 0);
  const onTrack = Math.max(0, data.totalEquipment - overdue - nearNoWo);
  const segments = [
    { key: 'overdue', count: overdue, color: 'bg-red-500', label: t('ems.dashboard.v2.statusOverdue') },
    { key: 'nearNoWo', count: nearNoWo, color: 'bg-amber-500', label: t('ems.dashboard.v2.statusDueNoWo') },
    { key: 'onTrack', count: onTrack, color: 'bg-green-500', label: t('ems.dashboard.v2.statusOnTrack') },
  ];
  const total = data.totalEquipment;

  if (total <= 0) {
    return <div className="h-4 w-full rounded-full bg-muted/50" aria-hidden />;
  }

  return (
    <div
      className="flex h-4 w-full overflow-hidden rounded-full bg-muted/30 gap-px"
      title={segments.map((s) => `${s.label}: ${s.count}`).join(' · ')}
    >
      {segments.map((s) =>
        s.count > 0 ? (
          <div
            key={s.key}
            className={cn('h-full', s.color)}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ) : null
      )}
    </div>
  );
}

function KpiNumberLink({
  value,
  href,
  loading,
  className,
  tooltip,
}: {
  value?: number;
  href: string;
  loading?: boolean;
  className?: string;
  tooltip?: string;
}) {
  if (loading && value == null) {
    return <Skeleton className="ml-auto h-5 w-8" />;
  }
  return (
    <Link
      to={href}
      title={tooltip}
      className={cn('tabular-nums font-semibold hover:underline', className)}
    >
      {value ?? 0}
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

const PlantPerformanceTable: React.FC<Props> = ({ kpiByPlant, kpiLoading }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState(ALL_PLANTS);
  const [sortKey, setSortKey] = useState<SortKey>('overdue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const plants = useMemo(
    () =>
      PM_CALIBRATION_PLANT_OPTIONS.map((p) => ({
        plant: p.code,
        plantLabel: p.label,
      })),
    []
  );

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
      return p.plant.toLowerCase().includes(q) || p.plantLabel.toLowerCase().includes(q);
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
        const kpi = kpiByPlant[plant.plant] ?? emptyKpi();
        acc.totalEquipment += kpi.totalEquipment ?? 0;
        acc.overdue += kpi.overdue ?? 0;
        acc.overdueNoWo += kpi.overdueNoWo ?? 0;
        acc.dueThisWeek += kpi.dueThisWeek ?? 0;
        acc.dueThisWeekNoWo += kpi.dueThisWeekNoWo ?? 0;
        acc.dueSoon += kpi.dueSoon ?? 0;
        acc.dueSoonNoWo += kpi.dueSoonNoWo ?? 0;
        return acc;
      },
      {
        totalEquipment: 0,
        overdue: 0,
        overdueNoWo: 0,
        dueThisWeek: 0,
        dueThisWeekNoWo: 0,
        dueSoon: 0,
        dueSoonNoWo: 0,
      }
    );
  }, [filteredPlants, kpiByPlant]);

  const legendItems = [
    { color: 'bg-red-500', label: t('ems.dashboard.v2.statusOverdue') },
    { color: 'bg-amber-500', label: t('ems.dashboard.v2.statusDueNoWo') },
    { color: 'bg-green-500', label: t('ems.dashboard.v2.statusOnTrack') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <EmsKpiGrid columns="4" className="flex-1 gap-3">
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
            hint={noWoHint(portfolio.overdueNoWo, t)}
            icon={AlertTriangle}
            valueClassName="text-destructive"
            iconClassName="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.dashboard.dueThisWeek')}
            value={portfolio.dueThisWeek}
            hint={noWoHint(portfolio.dueThisWeekNoWo, t)}
            icon={Clock}
            valueClassName="text-orange-600"
            iconClassName="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
            loading={kpiLoading}
            compact
          />
          <EmsKpiStat
            label={t('ems.status.dueSoon')}
            value={portfolio.dueSoon}
            hint={noWoHint(portfolio.dueSoonNoWo, t)}
            icon={CalendarClock}
            valueClassName="text-blue-600"
            iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
            loading={kpiLoading}
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
            <Table className="min-w-[760px]">
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
                  <TableHead className="min-w-[140px]">
                    {t('ems.dashboard.v2.table.statusBreakdown')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t('ems.dashboard.v2.noPlantsMatch')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPlants.map((plant) => {
                    const kpi = kpiByPlant[plant.plant];
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
                                {t('ems.dashboard.v2.equipmentCountShort', {
                                  count: kpi?.totalEquipment ?? 0,
                                })}
                              </p>
                            </div>
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
                          <div className="flex flex-col items-end gap-0.5">
                            <KpiNumberLink
                              value={kpi?.overdue}
                              href={plantHref(plant.plant, 'overdue')}
                              loading={kpiLoading}
                              className={(kpi?.overdue ?? 0) > 0 ? 'text-destructive' : undefined}
                              tooltip={t('ems.dashboard.v2.viewOverdue', {
                                count: kpi?.overdue ?? 0,
                              })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {noWoHint(kpi?.overdueNoWo, t)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <KpiNumberLink
                              value={kpi?.dueThisWeek}
                              href={plantHref(plant.plant, 'due_this_week')}
                              loading={kpiLoading}
                              className={(kpi?.dueThisWeek ?? 0) > 0 ? 'text-orange-600' : undefined}
                              tooltip={t('ems.dashboard.v2.viewDueThisWeek', {
                                count: kpi?.dueThisWeek ?? 0,
                              })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {noWoHint(kpi?.dueThisWeekNoWo, t)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <KpiNumberLink
                              value={kpi?.dueSoon}
                              href={plantHref(plant.plant, 'due_soon')}
                              loading={kpiLoading}
                              className={(kpi?.dueSoon ?? 0) > 0 ? 'text-blue-600' : undefined}
                              tooltip={t('ems.dashboard.v2.viewDueSoon', {
                                count: kpi?.dueSoon ?? 0,
                              })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {noWoHint(kpi?.dueSoonNoWo, t)}
                            </span>
                          </div>
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
            <span>{t('ems.dashboard.v2.showingPlants', { count: sortedPlants.length })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantPerformanceTable;
