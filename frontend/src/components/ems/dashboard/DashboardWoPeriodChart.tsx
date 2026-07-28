import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmsContentCard } from '@/components/ems/shared/emsLayoutPrimitives';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import emsService, {
  type EmsWoPeriodStatusByPlant,
  type EmsWoPeriodStatusItem,
} from '@/services/emsService';
import {
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';
import { formatLocalDate, getPeriodDateRange } from '@/utils/periodCalculations';

interface Props {
  timeTravel: DashboardTimeTravelValue;
}

type StatusKey = 'ontime' | 'late' | 'notFinish';

const STATUS_KEYS: StatusKey[] = ['ontime', 'late', 'notFinish'];

const STATUS_COLORS: Record<StatusKey, string> = {
  ontime: '#22c55e',
  late: '#f59e0b',
  notFinish: '#94a3b8',
};

/** Shared Late fill for every plant in multi-plant mode. */
const LATE_COLOR = '#ef4444';

/** Fixed plant palette (keyed by code, not selection order). */
const PLANT_COLORS: Record<string, { ontime: string; notFinish: string }> = {
  PP: { ontime: '#2563eb', notFinish: '#93c5fd' },
  DJ: { ontime: '#0d9488', notFinish: '#99f6e4' },
  DP: { ontime: '#7c3aed', notFinish: '#c4b5fd' },
  SN: { ontime: '#0284c7', notFinish: '#7dd3fc' },
  CT: { ontime: '#0891b2', notFinish: '#67e8f9' },
  PS: { ontime: '#059669', notFinish: '#6ee7b7' },
  ST: { ontime: '#65a30d', notFinish: '#bef264' },
  PIP: { ontime: '#4f46e5', notFinish: '#a5b4fc' },
};

const FALLBACK_PLANT_COLORS = { ontime: '#64748b', notFinish: '#cbd5e1' };

function getPlantFill(plant: string, status: StatusKey): string {
  if (status === 'late') return LATE_COLOR;
  const colors = PLANT_COLORS[plant] ?? FALLBACK_PLANT_COLORS;
  return status === 'ontime' ? colors.ontime : colors.notFinish;
}

function statusDataKey(plant: string, status: StatusKey): string {
  return `${plant}__${status}`;
}

interface AggregateChartRow {
  period: string;
  periodNumber: number;
  ontime: number;
  late: number;
  notFinish: number;
  total: number;
}

type MultiPlantChartRow = {
  period: string;
  periodNumber: number;
  total: number;
} & Record<string, string | number>;

function emptyPeriods(): EmsWoPeriodStatusItem[] {
  return Array.from({ length: 13 }, (_, i) => ({
    period: i + 1,
    ontime: 0,
    late: 0,
    notFinish: 0,
    total: 0,
  }));
}

function emptyByPlant(): EmsWoPeriodStatusByPlant[] {
  return PM_CALIBRATION_PLANT_OPTIONS.map((p) => ({
    plant: p.code,
    periods: emptyPeriods(),
  }));
}

function toAggregateRows(periods: EmsWoPeriodStatusItem[]): AggregateChartRow[] {
  return periods.map((p) => ({
    period: `P${p.period}`,
    periodNumber: p.period,
    ontime: p.ontime,
    late: p.late,
    notFinish: p.notFinish,
    total: p.total,
  }));
}

function toMultiPlantRows(
  byPlant: EmsWoPeriodStatusByPlant[],
  selectedPlants: string[]
): MultiPlantChartRow[] {
  const plantMaps = new Map(
    byPlant
      .filter((p) => selectedPlants.includes(p.plant))
      .map((p) => [p.plant, new Map(p.periods.map((row) => [row.period, row]))])
  );

  return Array.from({ length: 13 }, (_, i) => {
    const periodNumber = i + 1;
    const row: MultiPlantChartRow = {
      period: `P${periodNumber}`,
      periodNumber,
      total: 0,
    };

    for (const plant of selectedPlants) {
      const entry = plantMaps.get(plant)?.get(periodNumber);
      const ontime = entry?.ontime ?? 0;
      const late = entry?.late ?? 0;
      const notFinish = entry?.notFinish ?? 0;
      row[statusDataKey(plant, 'ontime')] = ontime;
      row[statusDataKey(plant, 'late')] = late;
      row[statusDataKey(plant, 'notFinish')] = notFinish;
      row.total += ontime + late + notFinish;
    }

    return row;
  });
}

const DashboardWoPeriodChart: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<EmsWoPeriodStatusItem[]>(emptyPeriods);
  const [byPlant, setByPlant] = useState<EmsWoPeriodStatusByPlant[]>(emptyByPlant);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateRange = getTimeTravelDateRange(timeTravel);
  const isAllMode = selectedPlants.length === 0;

  const statusLabels = useMemo(
    () => ({
      ontime: t('ems.dashboard.v2.woStatusOntime'),
      late: t('ems.dashboard.v2.woStatusLate'),
      notFinish: t('ems.dashboard.v2.woStatusNotFinish'),
    }),
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    emsService
      .getWoPeriodStatus({
        year: timeTravel.year,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .then((data) => {
        if (cancelled) return;
        setPeriods(data.periods);
        setByPlant(data.byPlant?.length ? data.byPlant : emptyByPlant());
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setPeriods(emptyPeriods());
        setByPlant(emptyByPlant());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.endDate, dateRange.startDate, t, timeTravel.year]);

  const chartData = useMemo(() => {
    if (isAllMode) return toAggregateRows(periods);
    return toMultiPlantRows(byPlant, selectedPlants);
  }, [byPlant, isAllMode, periods, selectedPlants]);

  const hasData = chartData.some((row) => row.total > 0);

  const navigateToSchedule = useCallback(
    (periodNumber: number, plant?: string) => {
      const { startDate, endDate } = getPeriodDateRange(timeTravel.year, periodNumber);
      const params = new URLSearchParams();
      if (plant) params.set('plant', plant);
      params.set('dueFrom', formatLocalDate(startDate));
      params.set('dueTo', formatLocalDate(endDate));
      navigate(`/ems/schedule?${params.toString()}`);
    },
    [navigate, timeTravel.year]
  );

  const handleSelectAll = () => setSelectedPlants([]);

  const handleTogglePlant = (code: string) => {
    setSelectedPlants((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey?: string | number; payload: AggregateChartRow | MultiPlantChartRow }>;
  }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const { startDate, endDate } = getPeriodDateRange(timeTravel.year, row.periodNumber);

    if (isAllMode) {
      const agg = row as AggregateChartRow;
      return (
        <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-sm">
          <p className="font-medium">{agg.period}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
          </p>
          <div className="space-y-1">
            <p>
              <span className="font-medium text-green-600">{statusLabels.ontime}:</span> {agg.ontime}
            </p>
            <p>
              <span className="font-medium text-amber-600">{statusLabels.late}:</span> {agg.late}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">{statusLabels.notFinish}:</span>{' '}
              {agg.notFinish}
            </p>
            <p className="pt-1 border-t border-border">
              <span className="font-medium">{t('ems.dashboard.v2.woStatusTotal')}:</span> {agg.total}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-sm max-w-xs">
        <p className="font-medium">{row.period}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
        </p>
        <div className="space-y-2">
          {selectedPlants.map((plant) => {
            const ontime = Number(row[statusDataKey(plant, 'ontime')] ?? 0);
            const late = Number(row[statusDataKey(plant, 'late')] ?? 0);
            const notFinish = Number(row[statusDataKey(plant, 'notFinish')] ?? 0);
            const plantTotal = ontime + late + notFinish;
            const plantColors = PLANT_COLORS[plant] ?? FALLBACK_PLANT_COLORS;
            return (
              <div key={plant} className="space-y-0.5">
                <p className="font-medium text-xs flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: plantColors.ontime }}
                    aria-hidden
                  />
                  {plant}
                </p>
                <p className="text-xs">
                  <span style={{ color: plantColors.ontime }}>{statusLabels.ontime}</span> {ontime}
                  {' · '}
                  <span style={{ color: LATE_COLOR }}>{statusLabels.late}</span> {late}
                  {' · '}
                  <span style={{ color: plantColors.notFinish }}>{statusLabels.notFinish}</span>{' '}
                  {notFinish}
                  {' · '}
                  <span className="font-medium">{t('ems.dashboard.v2.woStatusTotal')}</span> {plantTotal}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <EmsContentCard
        title={t('ems.dashboard.v2.woPeriodChartTitle')}
        description={t('ems.dashboard.v2.woPeriodChartDesc')}
        contentClassName="p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex max-w-full overflow-x-auto rounded-md border bg-muted/30">
            <Button
              type="button"
              variant={isAllMode ? 'default' : 'ghost'}
              className="rounded-none flex-shrink-0"
              size="sm"
              onClick={handleSelectAll}
            >
              All
            </Button>
            {PM_CALIBRATION_PLANT_OPTIONS.map((p) => (
              <Button
                key={p.code}
                type="button"
                variant={selectedPlants.includes(p.code) ? 'default' : 'ghost'}
                className="rounded-none flex-shrink-0"
                size="sm"
                title={p.label}
                onClick={() => handleTogglePlant(p.code)}
              >
                {p.code}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : !hasData && !error ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('ems.dashboard.v2.woPeriodChartEmpty')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              className={cn('cursor-pointer')}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              {isAllMode && <Legend />}
              {isAllMode ? (
                <>
                  {STATUS_KEYS.map((status) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="status"
                      fill={STATUS_COLORS[status]}
                      name={statusLabels[status]}
                      cursor="pointer"
                      onClick={(data) => {
                        const periodNumber = Number(data?.payload?.periodNumber);
                        if (periodNumber >= 1 && periodNumber <= 13) {
                          navigateToSchedule(periodNumber);
                        }
                      }}
                    />
                  ))}
                </>
              ) : (
                selectedPlants.flatMap((plant) =>
                  STATUS_KEYS.map((status) => (
                    <Bar
                      key={statusDataKey(plant, status)}
                      dataKey={statusDataKey(plant, status)}
                      stackId={plant}
                      fill={getPlantFill(plant, status)}
                      name={`${plant} · ${statusLabels[status]}`}
                      legendType="none"
                      cursor="pointer"
                      onClick={(data) => {
                        const periodNumber = Number(data?.payload?.periodNumber);
                        if (periodNumber >= 1 && periodNumber <= 13) {
                          navigateToSchedule(periodNumber, plant);
                        }
                      }}
                    />
                  ))
                )
              )}
            </BarChart>
          </ResponsiveContainer>
        )}

        {!loading && hasData && !isAllMode && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {selectedPlants.map((plant) => {
              const colors = PLANT_COLORS[plant] ?? FALLBACK_PLANT_COLORS;
              return (
                <span key={plant} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: colors.ontime }}
                    aria-hidden
                  />
                  <span className="font-medium text-foreground">{plant}</span>
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{
                  backgroundColor: (PLANT_COLORS[selectedPlants[0]] ?? FALLBACK_PLANT_COLORS).notFinish,
                }}
                aria-hidden
              />
              {statusLabels.notFinish}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: LATE_COLOR }}
                aria-hidden
              />
              {statusLabels.late}
            </span>
          </div>
        )}
      </EmsContentCard>
    </section>
  );
};

export default DashboardWoPeriodChart;
