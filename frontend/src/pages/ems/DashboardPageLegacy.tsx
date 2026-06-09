import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsKpiData } from '@/services/emsService';
import DashboardFilterBar, {
  EMPTY_DASHBOARD_FILTERS,
  type DashboardFilters,
} from '@/components/ems/dashboard/DashboardFilterBar';
import KpiTiles from '@/components/ems/dashboard/KpiTiles';
import EmsDashboardPanel from '@/components/ems/dashboard/EmsDashboardPanel';
import { EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const DashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_DASHBOARD_FILTERS);
  const [kpi, setKpi] = useState<EmsKpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  useEffect(() => {
    setKpiLoading(true);
    setKpiError(null);
    emsService
      .getDashboardKpi({
        plant: filters.plant || undefined,
        area: filters.area || undefined,
      })
      .then(setKpi)
      .catch((e) => setKpiError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setKpiLoading(false));
  }, [filters.plant, filters.area, t]);

  const tiles = useMemo(
    () => [
      { key: 'totalEquipment' as const, label: t('ems.dashboard.total') },
      {
        key: 'overdue' as const,
        label: t('ems.status.overdue'),
        valueClassName: 'text-destructive',
      },
      {
        key: 'dueThisWeek' as const,
        label: t('ems.dashboard.dueThisWeek'),
        valueClassName: 'text-amber-600',
      },
      {
        key: 'dueSoon' as const,
        label: t('ems.status.dueSoon'),
        valueClassName: 'text-yellow-600',
      },
      {
        key: 'ok' as const,
        label: t('ems.status.ok'),
        valueClassName: 'text-green-600',
      },
    ],
    [t]
  );

  return (
    <EmsPageStack>
      <DashboardFilterBar filters={filters} onChange={setFilters} />
      {kpiError && <p className="text-sm text-destructive">{kpiError}</p>}
      <KpiTiles tiles={tiles} data={kpi} loading={kpiLoading} />

      <div className="space-y-4">
        <EmsDashboardPanel
          title={t('ems.dashboard.overdueTitle')}
          description={t('ems.dashboard.overdueDesc')}
          filters={filters}
          variant="overdue"
          defaultOpen
          accentClassName="border-destructive/30"
          emptyMessage={t('ems.dashboard.overdueEmpty')}
          showDaysOverdue
        />

        <EmsDashboardPanel
          title={t('ems.dashboard.dueThisWeekTitle')}
          description={t('ems.dashboard.dueThisWeekDesc')}
          filters={filters}
          variant="due-this-week"
          defaultOpen
          emptyMessage={t('ems.dashboard.dueThisWeekEmpty')}
          showDaysUntilDue
        />

        <EmsDashboardPanel
          title={t('ems.dashboard.dueSoonTitle')}
          description={t('ems.dashboard.dueSoonDesc')}
          filters={filters}
          variant="due-soon"
          defaultOpen={false}
          emptyMessage={t('ems.dashboard.dueSoonEmpty')}
          showDaysUntilDue
        />
      </div>
    </EmsPageStack>
  );
};

export default DashboardPage;
