import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Clock, Package } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsKpiData } from '@/services/emsService';
import { EmsKpiGrid, EmsKpiStat } from '@/components/ems/shared/EmsKpiStat';

type KpiCardKey = 'totalEquipment' | 'overdue' | 'dueThisWeek' | 'dueSoon';

interface TileConfig {
  key: KpiCardKey;
  label: string;
  href: string;
  valueClassName?: string;
  iconClassName: string;
}

interface Props {
  data: EmsKpiData | null;
  loading?: boolean;
  plant?: string;
  compact?: boolean;
}

const TILE_ICONS = {
  totalEquipment: Package,
  overdue: AlertTriangle,
  dueThisWeek: Clock,
  dueSoon: CalendarClock,
} as const;

function withPlantFilter(href: string, plant?: string): string {
  if (!plant) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}plant=${encodeURIComponent(plant)}`;
}

const DashboardKpiCards: React.FC<Props> = ({ data, loading, plant, compact }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const tiles = useMemo<TileConfig[]>(
    () => [
      {
        key: 'totalEquipment',
        label: t('ems.dashboard.total'),
        href: withPlantFilter('/ems/equipment', plant),
        iconClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
      },
      {
        key: 'overdue',
        label: t('ems.status.overdue'),
        href: withPlantFilter('/ems/equipment?kpiBucket=overdue', plant),
        valueClassName: 'text-destructive',
        iconClassName: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
      },
      {
        key: 'dueThisWeek',
        label: t('ems.dashboard.dueThisWeek'),
        href: withPlantFilter('/ems/equipment?kpiBucket=due_this_week', plant),
        valueClassName: 'text-amber-600',
        iconClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
      },
      {
        key: 'dueSoon',
        label: t('ems.status.dueSoon'),
        href: withPlantFilter('/ems/equipment?kpiBucket=due_soon', plant),
        valueClassName: 'text-yellow-600',
        iconClassName: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
      },
    ],
    [plant, t]
  );

  if (loading && !data) {
    return (
      <EmsKpiGrid columns="3" className={cn('grid-cols-2 h-full', compact && 'gap-2')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={cn('w-full rounded-xl', compact ? 'h-full min-h-[72px]' : 'h-[104px]')} />
        ))}
      </EmsKpiGrid>
    );
  }

  return (
    <EmsKpiGrid columns="3" className={cn('grid-cols-2 h-full', compact && 'gap-2')}>
      {tiles.map((tile) => {
        const Icon = TILE_ICONS[tile.key];
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => navigate(tile.href)}
            className={cn(
              'text-left rounded-xl transition-shadow h-full',
              'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            <EmsKpiStat
              label={tile.label}
              value={data ? data[tile.key] : '—'}
              icon={Icon}
              iconClassName={tile.iconClassName}
              valueClassName={tile.valueClassName}
              loading={loading && !data}
              compact={compact}
            />
          </button>
        );
      })}
    </EmsKpiGrid>
  );
};

export default DashboardKpiCards;
