import React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { EmsKpiData } from '@/services/emsService';
import { EmsKpiGrid, EmsKpiStat } from '@/components/ems/shared/EmsKpiStat';

export interface KpiTileConfig {
  key: keyof Pick<EmsKpiData, 'totalEquipment' | 'overdue' | 'dueThisWeek' | 'dueSoon' | 'ok'>;
  label: string;
  valueClassName?: string;
  iconClassName?: string;
}

interface KpiTilesProps {
  tiles: KpiTileConfig[];
  data: EmsKpiData | null;
  loading?: boolean;
}

const TILE_ICONS: Record<KpiTileConfig['key'], typeof Package> = {
  totalEquipment: Package,
  overdue: AlertTriangle,
  dueThisWeek: Clock,
  dueSoon: CalendarClock,
  ok: CheckCircle2,
};

const TILE_ICON_STYLES: Partial<Record<KpiTileConfig['key'], string>> = {
  totalEquipment: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
  overdue: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  dueThisWeek: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  dueSoon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  ok: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
};

const KpiTiles: React.FC<KpiTilesProps> = ({ tiles, data, loading }) => {
  if (loading && !data) {
    return (
      <EmsKpiGrid>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-[104px] w-full rounded-xl', i === 4 && 'col-span-2 lg:col-span-1')} />
        ))}
      </EmsKpiGrid>
    );
  }

  return (
    <EmsKpiGrid>
      {tiles.map((tile, index) => (
        <div
          key={tile.key}
          className={cn(index === 4 && 'col-span-2 lg:col-span-1')}
        >
          <EmsKpiStat
            label={tile.label}
            value={data ? data[tile.key] : '—'}
            icon={TILE_ICONS[tile.key]}
            iconClassName={tile.iconClassName ?? TILE_ICON_STYLES[tile.key]}
            valueClassName={tile.valueClassName}
            loading={loading && !data}
          />
        </div>
      ))}
    </EmsKpiGrid>
  );
};

export default KpiTiles;
