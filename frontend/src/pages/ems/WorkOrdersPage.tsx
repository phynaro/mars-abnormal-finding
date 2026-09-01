import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ListTodo, Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, {
  type EmsPagination,
  type EmsWorkOrderItem,
  type EmsWorkOrderKpi,
  type EmsWorkOrderStatus,
} from '@/services/emsService';
import WorkOrderFilterBar, {
  type WorkOrderFilters,
} from '@/components/ems/workOrders/WorkOrderFilterBar';
import WorkOrderTable from '@/components/ems/workOrders/WorkOrderTable';
import WorkOrderCardList from '@/components/ems/workOrders/WorkOrderCardList';
import EquipmentListPagination from '@/components/ems/equipment/EquipmentListPagination';
import { EmsKpiGrid, EmsKpiStat } from '@/components/ems/shared/EmsKpiStat';
import { EmsContentCard, EmsEmptyState, EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const PAGE_SIZE = 50;

function parseStatus(raw: string | null): '' | EmsWorkOrderStatus {
  if (raw === 'ontime' || raw === 'late' || raw === 'not_finish') return raw;
  return '';
}

function filtersFromParams(params: URLSearchParams): WorkOrderFilters {
  return {
    plant: params.get('plant') || '',
    area: params.get('area') || '',
    status: parseStatus(params.get('status')),
    schFrom: params.get('schFrom') || '',
    schTo: params.get('schTo') || '',
    q: params.get('q') || '',
  };
}

function paramsFromFilters(filters: WorkOrderFilters, page: number): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.plant) next.set('plant', filters.plant);
  if (filters.area) next.set('area', filters.area);
  if (filters.status) next.set('status', filters.status);
  if (filters.schFrom) next.set('schFrom', filters.schFrom);
  if (filters.schTo) next.set('schTo', filters.schTo);
  if (filters.q) next.set('q', filters.q);
  if (page > 1) next.set('page', String(page));
  return next;
}

function sameWorkOrderQuery(
  a: WorkOrderFilters,
  b: WorkOrderFilters,
  pageA: number,
  pageB: number
): boolean {
  return (
    a.plant === b.plant &&
    a.area === b.area &&
    a.status === b.status &&
    a.schFrom === b.schFrom &&
    a.schTo === b.schTo &&
    a.q === b.q &&
    pageA === pageB
  );
}

const EMPTY_KPI: EmsWorkOrderKpi = {
  total: 0,
  ontime: 0,
  late: 0,
  notFinish: 0,
};

const EMPTY_WORK_ORDER_FILTERS: WorkOrderFilters = {
  plant: '',
  area: '',
  status: '',
  schFrom: '',
  schTo: '',
  q: '',
};

const WorkOrdersPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<WorkOrderFilters>(() => ({
    ...EMPTY_WORK_ORDER_FILTERS,
    ...filtersFromParams(searchParams),
  }));
  const [items, setItems] = useState<EmsWorkOrderItem[]>([]);
  const [pagination, setPagination] = useState<EmsPagination | null>(null);
  const [kpi, setKpi] = useState<EmsWorkOrderKpi>(EMPTY_KPI);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiParams = useMemo(
    () => ({
      plant: filters.plant || undefined,
      area: filters.area || undefined,
      status: filters.status || undefined,
      schFrom: filters.schFrom || undefined,
      schTo: filters.schTo || undefined,
      q: filters.q || undefined,
    }),
    [filters]
  );

  const applyFilters = useCallback(
    (next: WorkOrderFilters) => {
      setFilters(next);
      setPage(1);
      setSearchParams(paramsFromFilters(next, 1), { replace: true });
    },
    [setSearchParams]
  );

  const applyPage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      setSearchParams(paramsFromFilters(filters, nextPage), { replace: true });
    },
    [filters, setSearchParams]
  );

  useEffect(() => {
    const nextFilters = {
      ...EMPTY_WORK_ORDER_FILTERS,
      ...filtersFromParams(searchParams),
    };
    const nextPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (sameWorkOrderQuery(filters, nextFilters, page, nextPage)) return;
    setFilters(nextFilters);
    setPage(nextPage);
  }, [searchParams, filters, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      emsService.getWorkOrderList({ page, limit: PAGE_SIZE, ...apiParams }),
      emsService.getWorkOrderKpi(apiParams),
    ])
      .then(([listRes, kpiRes]) => {
        if (cancelled) return;
        setItems(listRes.data.items ?? []);
        setPagination(listRes.data.pagination);
        setKpi(kpiRes);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setItems([]);
        setPagination(null);
        setKpi(EMPTY_KPI);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiParams, page, t]);

  return (
    <EmsPageStack>
      <WorkOrderFilterBar filters={filters} onChange={applyFilters} />

      <EmsKpiGrid>
        <EmsKpiStat
          label={t('ems.workOrders.kpiTotal')}
          value={kpi.total}
          icon={Wrench}
          iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
        />
        <EmsKpiStat
          label={t('ems.workOrders.kpiOntime')}
          value={kpi.ontime}
          icon={CheckCircle2}
          valueClassName="text-green-600"
          iconClassName="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
        />
        <EmsKpiStat
          label={t('ems.workOrders.kpiLate')}
          value={kpi.late}
          icon={Clock3}
          valueClassName="text-red-600"
          iconClassName="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
        />
        <EmsKpiStat
          label={t('ems.workOrders.kpiNotFinish')}
          value={kpi.notFinish}
          icon={ListTodo}
          valueClassName="text-amber-600"
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        />
      </EmsKpiGrid>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmsEmptyState message={t('ems.workOrders.empty')} />
      )}

      {!loading && items.length > 0 && (
        <EmsContentCard title={t('ems.nav.workOrders')} description={t('ems.workOrders.rowsHint')}>
          <WorkOrderTable items={items} />
          <WorkOrderCardList items={items} />
          {pagination && (
            <div className="border-t px-4 py-3 sm:px-6">
              <EquipmentListPagination pagination={pagination} onPageChange={applyPage} />
            </div>
          )}
        </EmsContentCard>
      )}
    </EmsPageStack>
  );
};

export default WorkOrdersPage;
