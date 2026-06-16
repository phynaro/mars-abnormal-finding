import React, { useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsKpiData, EmsPlantMatrixItem } from '@/services/emsService';

import DashboardKpiCards from './DashboardKpiCards';

interface Props {
  plant: EmsPlantMatrixItem;
  kpi: EmsKpiData | null;
  kpiLoading?: boolean;
}

const RING_SIZE = 88;
const STROKE = 8;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CompletionRing({ rate, total }: { rate: number; total: number }) {
  const offset = CIRCUMFERENCE - (rate / 100) * CIRCUMFERENCE;
  const center = RING_SIZE / 2;

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/40"
        />
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={total > 0 ? offset : CIRCUMFERENCE}
          strokeLinecap="round"
          className={cn(
            total > 0 && rate >= 80 && 'text-green-500',
            total > 0 && rate >= 50 && rate < 80 && 'text-amber-500',
            total > 0 && rate < 50 && 'text-red-500',
            total === 0 && 'text-muted-foreground/30'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums leading-none">{total > 0 ? `${rate}%` : '—'}</span>
      </div>
    </div>
  );
}

const PlantPerformanceCard: React.FC<Props> = ({ plant, kpi, kpiLoading }) => {
  const { t } = useLanguage();

  const segments = useMemo(
    () => [
      {
        key: 'noWo',
        count: plant.noWo,
        color: 'bg-orange-400',
        label: t('ems.dashboard.v2.statusNoWo'),
      },
      {
        key: 'inProgress',
        count: plant.inProgress,
        color: 'bg-blue-500',
        label: t('ems.dashboard.v2.statusInProgress'),
      },
      {
        key: 'done',
        count: plant.done,
        color: 'bg-green-500',
        label: t('ems.dashboard.v2.statusDone'),
      },
    ],
    [plant.done, plant.inProgress, plant.noWo, t]
  );
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-4">
              <CompletionRing rate={plant.completionRate} total={plant.total} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {plant.plant}
                </p>
                <h3 className="text-sm font-semibold truncate">{plant.plantLabel}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {plant.total} {t('ems.dashboard.v2.tasksInMonth')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('ems.dashboard.v2.completion')}: {plant.done}/{plant.total}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex h-2 rounded-full overflow-hidden gap-px bg-muted/30">
                {plant.total > 0 ? (
                  segments.map((seg) => {
                    const pct = (seg.count / plant.total) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={seg.key}
                        className={cn('transition-all duration-300', seg.color)}
                        style={{ width: `${pct}%` }}
                        title={`${seg.label}: ${seg.count}`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full bg-muted/50" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                {segments.map((seg) => (
                  <div key={seg.key} className="flex items-center gap-1 min-w-0">
                    <span className={cn('w-2 h-2 rounded-sm shrink-0', seg.color)} />
                    <span className="truncate">{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 h-full">
            <DashboardKpiCards data={kpi} loading={kpiLoading} plant={plant.plant} compact />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlantPerformanceCard;
