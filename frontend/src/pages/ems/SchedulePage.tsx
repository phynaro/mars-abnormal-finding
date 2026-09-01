import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { CalendarDays, CheckCircle2, LayoutList, ListTodo, ListTree } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useLanguage } from '@/contexts/LanguageContext';

import emsService, {
  type EmsPagination,
  type EmsScheduleItem,
  type EmsScheduleKpi,
} from '@/services/emsService';

import ScheduleFilterBar, { type ScheduleFilters } from '@/components/ems/schedule/ScheduleFilterBar';

import ScheduleTable from '@/components/ems/schedule/ScheduleTable';
import ScheduleCardList from '@/components/ems/schedule/ScheduleCardList';
import ScheduleCalendarPanel from '@/components/ems/schedule/ScheduleCalendarPanel';
import ScheduleUserEventsPanel from '@/components/ems/schedule/ScheduleUserEventsPanel';

import EquipmentListPagination from '@/components/ems/equipment/EquipmentListPagination';

import { EmsKpiGrid, EmsKpiStat } from '@/components/ems/shared/EmsKpiStat';
import { EmsContentCard, EmsEmptyState, EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const PAGE_SIZE = 50;

type ScheduleView = 'list' | 'calendar' | 'events';

function parseView(raw: string | null): ScheduleView {
  if (raw === 'calendar' || raw === 'events') return raw;
  return 'list';
}

function filtersFromParams(params: URLSearchParams): ScheduleFilters {
  return {
    plant: params.get('plant') || '',
    area: params.get('area') || '',
    woStatus: params.get('woStatus') || '',
    dueFrom: params.get('dueFrom') || '',
    dueTo: params.get('dueTo') || '',
  };
}

function paramsFromFilters(filters: ScheduleFilters, page: number, view: ScheduleView): URLSearchParams {
  const next = new URLSearchParams();
  if (view !== 'list') next.set('view', view);
  if (filters.plant) next.set('plant', filters.plant);
  if (filters.area) next.set('area', filters.area);
  if (filters.woStatus) next.set('woStatus', filters.woStatus);
  if (filters.dueFrom) next.set('dueFrom', filters.dueFrom);
  if (filters.dueTo) next.set('dueTo', filters.dueTo);
  if (page > 1) next.set('page', String(page));
  return next;
}

function sameScheduleQuery(
  a: ScheduleFilters,
  b: ScheduleFilters,
  pageA: number,
  pageB: number
): boolean {
  return (
    a.plant === b.plant &&
    a.area === b.area &&
    a.woStatus === b.woStatus &&
    a.dueFrom === b.dueFrom &&
    a.dueTo === b.dueTo &&
    pageA === pageB
  );
}

const SchedulePage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const view = parseView(searchParams.get('view'));
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<ScheduleFilters>(() => filtersFromParams(searchParams));
  const [items, setItems] = useState<EmsScheduleItem[]>([]);
  const [pagination, setPagination] = useState<EmsPagination | null>(null);
  const [kpi, setKpi] = useState<EmsScheduleKpi | null>(null);
  const [loading, setLoading] = useState(view === 'list');
  const [error, setError] = useState<string | null>(null);

  const apiParams = useMemo(
    () => ({
      plant: filters.plant || undefined,
      area: filters.area || undefined,
      woStatus: filters.woStatus || undefined,
      dueFrom: filters.dueFrom || undefined,
      dueTo: filters.dueTo || undefined,
    }),
    [filters]
  );

  const applyFilters = useCallback(
    (next: ScheduleFilters) => {
      setFilters(next);
      setPage(1);
      setSearchParams(paramsFromFilters(next, 1, view), { replace: true });
    },
    [setSearchParams, view]
  );

  const applyPage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      setSearchParams(paramsFromFilters(filters, nextPage, view), { replace: true });
    },
    [filters, setSearchParams, view]
  );

  const applyView = useCallback(
    (nextView: ScheduleView) => {
      setSearchParams(paramsFromFilters(filters, page, nextView), { replace: true });
    },
    [filters, page, setSearchParams]
  );

  useEffect(() => {
    const nextFilters = filtersFromParams(searchParams);
    const nextPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (sameScheduleQuery(filters, nextFilters, page, nextPage)) return;
    setFilters(nextFilters);
    setPage(nextPage);
  }, [searchParams, filters, page]);

  useEffect(() => {
    if (view !== 'list') return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      emsService.getScheduleList({ page, limit: PAGE_SIZE, ...apiParams }),
      emsService.getScheduleKpi(apiParams),
    ])
      .then(([listRes, kpiData]) => {
        if (cancelled) return;
        setItems(listRes.data.items ?? []);
        setPagination(listRes.data.pagination);
        setKpi(kpiData);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setItems([]);
        setPagination(null);
        setKpi(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, apiParams, t, view]);

  return (
    <EmsPageStack>
      <ScheduleFilterBar filters={filters} onChange={applyFilters} />

      <Tabs value={view} onValueChange={(v) => applyView(parseView(v))}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="list" className="gap-1.5 text-sm">
            <LayoutList className="h-4 w-4" />
            {t('ems.schedule.tabList')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-sm">
            <CalendarDays className="h-4 w-4" />
            {t('ems.schedule.tabCalendar')}
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 text-sm">
            <ListTree className="h-4 w-4" />
            {t('ems.schedule.tabUserEvents')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {kpi && (
            <EmsKpiGrid columns="3">
              <EmsKpiStat
                label={t('ems.schedule.kpiTotal')}
                value={kpi.totalSchedules}
                icon={CalendarDays}
                iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              />
              <EmsKpiStat
                label={t('ems.schedule.kpiCompleted')}
                value={kpi.completed}
                icon={CheckCircle2}
                valueClassName="text-green-600"
                iconClassName="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
              />
              <EmsKpiStat
                label={t('ems.schedule.kpiRemaining')}
                value={kpi.remaining}
                icon={ListTodo}
                valueClassName="text-amber-600"
                iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              />
            </EmsKpiGrid>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <EmsEmptyState message={t('ems.schedule.empty')} />
          )}

          {!loading && items.length > 0 && (
            <EmsContentCard title={t('ems.nav.schedule')} description={t('ems.schedule.rowsHint')}>
              <ScheduleTable items={items} />
              <ScheduleCardList items={items} />
              {pagination && (
                <div className="border-t px-4 py-3 sm:px-6">
                  <EquipmentListPagination pagination={pagination} onPageChange={applyPage} />
                </div>
              )}
            </EmsContentCard>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <EmsContentCard>
            <ScheduleCalendarPanel filters={filters} />
          </EmsContentCard>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <EmsContentCard>
            <ScheduleUserEventsPanel filters={filters} />
          </EmsContentCard>
        </TabsContent>
      </Tabs>
    </EmsPageStack>
  );
};

export default SchedulePage;
