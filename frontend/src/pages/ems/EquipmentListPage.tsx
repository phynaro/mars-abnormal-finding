import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, {
  type EmsEquipmentListItem,
  type EmsEquipmentListSortOrder,
  type EmsPagination,
} from '@/services/emsService';
import EquipmentFilterBar, { type EquipmentFilters } from '@/components/ems/equipment/EquipmentFilterBar';
import EquipmentTable from '@/components/ems/equipment/EquipmentTable';
import EquipmentCardList from '@/components/ems/equipment/EquipmentCard';
import EquipmentListPagination from '@/components/ems/equipment/EquipmentListPagination';
import { EmsContentCard, EmsEmptyState, EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const PAGE_SIZE = 50;
const DEFAULT_SORT_ORDER: EmsEquipmentListSortOrder = 'ASC';

function sortOrderFromParams(params: URLSearchParams): EmsEquipmentListSortOrder {
  return params.get('sortOrder')?.toUpperCase() === 'DESC' ? 'DESC' : DEFAULT_SORT_ORDER;
}

function filtersFromParams(params: URLSearchParams): EquipmentFilters {
  const statusRaw = params.get('status');
  return {
    plant: params.get('plant') || '',
    area: params.get('area') || '',
    equipmentType: params.get('equipmentType') || '',
    status: statusRaw ? statusRaw.split(',').filter(Boolean) : [],
    search: params.get('search') || '',
    kpiBucket: (params.get('kpiBucket') as EquipmentFilters['kpiBucket']) || '',
  };
}

function sameListQuery(
  a: EquipmentFilters,
  b: EquipmentFilters,
  pageA: number,
  pageB: number,
  sortA: EmsEquipmentListSortOrder,
  sortB: EmsEquipmentListSortOrder
): boolean {
  return (
    a.plant === b.plant &&
    a.area === b.area &&
    a.equipmentType === b.equipmentType &&
    a.search === b.search &&
    a.kpiBucket === b.kpiBucket &&
    a.status.join(',') === b.status.join(',') &&
    pageA === pageB &&
    sortA === sortB
  );
}

function paramsFromFilters(
  filters: EquipmentFilters,
  page: number,
  sortOrder: EmsEquipmentListSortOrder
): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.plant) next.set('plant', filters.plant);
  if (filters.area) next.set('area', filters.area);
  if (filters.equipmentType) next.set('equipmentType', filters.equipmentType);
  if (filters.status.length) next.set('status', filters.status.join(','));
  if (filters.search) next.set('search', filters.search);
  if (filters.kpiBucket) next.set('kpiBucket', filters.kpiBucket);
  next.set('sortBy', 'ccpCode');
  if (sortOrder !== DEFAULT_SORT_ORDER) next.set('sortOrder', sortOrder);
  if (page > 1) next.set('page', String(page));
  return next;
}

const EquipmentListPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  const [filters, setFilters] = useState<EquipmentFilters>(() => filtersFromParams(searchParams));
  const [sortOrder, setSortOrder] = useState<EmsEquipmentListSortOrder>(() => sortOrderFromParams(searchParams));
  const [items, setItems] = useState<EmsEquipmentListItem[]>([]);
  const [pagination, setPagination] = useState<EmsPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => JSON.stringify({ page, sortOrder, ...filters }),
    [page, sortOrder, filters]
  );

  const applyFilters = useCallback((next: EquipmentFilters) => {
    setFilters(next);
    setPage(1);
    setSearchParams(paramsFromFilters(next, 1, sortOrder), { replace: true });
  }, [setSearchParams, sortOrder]);

  const applyPage = useCallback((nextPage: number) => {
    setPage(nextPage);
    setSearchParams(paramsFromFilters(filters, nextPage, sortOrder), { replace: true });
  }, [filters, setSearchParams, sortOrder]);

  const toggleCcpCodeSort = useCallback(() => {
    const nextOrder: EmsEquipmentListSortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
    setSortOrder(nextOrder);
    setPage(1);
    setSearchParams(paramsFromFilters(filters, 1, nextOrder), { replace: true });
  }, [filters, setSearchParams, sortOrder]);

  useEffect(() => {
    const nextFilters = filtersFromParams(searchParams);
    const nextPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const nextSort = sortOrderFromParams(searchParams);
    if (sameListQuery(filters, nextFilters, page, nextPage, sortOrder, nextSort)) return;
    setFilters(nextFilters);
    setPage(nextPage);
    setSortOrder(nextSort);
  }, [searchParams, filters, page, sortOrder]);

  useEffect(() => {
    const parsed = JSON.parse(queryKey) as EquipmentFilters & {
      page: number;
      sortOrder: EmsEquipmentListSortOrder;
    };
    let cancelled = false;
    setLoading(true);
    setError(null);

    emsService
      .listEquipment({
        page: parsed.page,
        limit: PAGE_SIZE,
        plant: parsed.plant || undefined,
        area: parsed.area || undefined,
        equipmentType: parsed.equipmentType || undefined,
        search: parsed.search || undefined,
        status: parsed.kpiBucket ? undefined : parsed.status.length ? parsed.status : undefined,
        kpiBucket: parsed.kpiBucket || undefined,
        sortBy: 'ccpCode',
        sortOrder: parsed.sortOrder,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
        setPagination(res.data.pagination);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, t]);

  const listTitle = pagination
    ? `${pagination.total} ${t('ems.nav.equipment').toLowerCase()}`
    : t('ems.nav.equipment');

  return (
    <EmsPageStack>
      <EquipmentFilterBar filters={filters} onChange={applyFilters} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="hidden md:block h-72 w-full rounded-xl" />
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmsEmptyState message={t('ems.equipment.empty')} />
      ) : (
        <EmsContentCard title={listTitle}>
          <EquipmentTable
            items={items}
            sortOrder={sortOrder}
            onCcpCodeSortToggle={toggleCcpCodeSort}
          />
          <EquipmentCardList items={items} />
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

export default EquipmentListPage;
