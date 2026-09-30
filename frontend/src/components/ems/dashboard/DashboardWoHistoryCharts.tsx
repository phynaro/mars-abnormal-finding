import React, { useEffect, useMemo, useState } from 'react';
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
  type EmsWoHistoryAssigneeRow,
  type EmsWoHistoryTimeRow,
} from '@/services/emsService';
import {
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';

interface Props {
  timeTravel: DashboardTimeTravelValue;
  grain: 'period' | 'day';
  byTime: EmsWoHistoryTimeRow[];
  byAssignee: EmsWoHistoryAssigneeRow[];
  chartPlant?: string;
  onChartPlantChange: (plant: string | undefined) => void;
  loading?: boolean;
}

type StatusKey = 'ontime' | 'late' | 'notFinish';

const STATUS_KEYS: StatusKey[] = ['ontime', 'late', 'notFinish'];

const STATUS_COLORS: Record<StatusKey, string> = {
  ontime: '#22c55e',
  late: '#f59e0b',
  notFinish: '#94a3b8',
};

const DashboardWoHistoryCharts: React.FC<Props> = ({
  timeTravel,
  grain,
  byTime,
  byAssignee,
  chartPlant,
  onChartPlantChange,
  loading,
}) => {
  const { t } = useLanguage();
  const dateRange = getTimeTravelDateRange(timeTravel);
  const [timeRows, setTimeRows] = useState<EmsWoHistoryTimeRow[]>(byTime);
  const [timeLoading, setTimeLoading] = useState(false);

  useEffect(() => {
    if (!chartPlant) {
      setTimeRows(byTime);
      return;
    }

    let cancelled = false;
    setTimeLoading(true);
    emsService
      .getWoHistory({
        mode: timeTravel.mode,
        year: timeTravel.year,
        month: timeTravel.month,
        period: timeTravel.period,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: chartPlant,
      })
      .then((data) => {
        if (!cancelled) setTimeRows(data.byTime || []);
      })
      .catch(() => {
        if (!cancelled) setTimeRows([]);
      })
      .finally(() => {
        if (!cancelled) setTimeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    byTime,
    chartPlant,
    dateRange.endDate,
    dateRange.startDate,
    timeTravel.mode,
    timeTravel.month,
    timeTravel.period,
    timeTravel.year,
  ]);

  const statusLabels = useMemo(
    () => ({
      ontime: t('ems.dashboard.v2.woStatusOntime'),
      late: t('ems.dashboard.v2.woStatusLate'),
      notFinish: t('ems.dashboard.v2.woStatusNotFinish'),
    }),
    [t]
  );

  const timeChartData = useMemo(
    () =>
      timeRows.map((row) => ({
        label: grain === 'period' ? `P${row.period}` : String(row.day || '').slice(5),
        ontime: row.ontime,
        late: row.late,
        notFinish: row.notFinish,
        total: row.total,
      })),
    [grain, timeRows]
  );

  const assigneeChartData = useMemo(
    () =>
      byAssignee.slice(0, 12).map((row) => ({
        label: row.assigneeName || t('ems.dashboard.v2.unassigned'),
        ontime: row.ontime,
        late: row.late,
        notFinish: row.notFinish,
        total: row.total,
      })),
    [byAssignee, t]
  );

  const timeTitle =
    grain === 'period'
      ? t('ems.dashboard.v2.woPeriodChartTitle')
      : t('ems.dashboard.v2.woDayChartTitle');

  const showTimeLoading = loading || timeLoading;
  const hasTimeData = timeChartData.some((row) => row.total > 0);
  const hasAssigneeData = assigneeChartData.some((row) => row.total > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EmsContentCard
        title={timeTitle}
        description={t('ems.dashboard.v2.woHistoryChartDesc')}
        contentClassName="p-4"
        className="min-w-0"
        action={
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={chartPlant ? 'outline' : 'default'}
              className="h-8"
              onClick={() => onChartPlantChange(undefined)}
            >
              {t('ems.equipment.filter.allPlants')}
            </Button>
            {PM_CALIBRATION_PLANT_OPTIONS.map((p) => (
              <Button
                key={p.code}
                type="button"
                size="sm"
                variant={chartPlant === p.code ? 'default' : 'outline'}
                className={cn('h-8', chartPlant === p.code && 'bg-primary')}
                onClick={() => onChartPlantChange(p.code)}
              >
                {p.code}
              </Button>
            ))}
          </div>
        }
      >
        {showTimeLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !hasTimeData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t('ems.dashboard.v2.woPeriodChartEmpty')}
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Legend />
                {STATUS_KEYS.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={statusLabels[key]}
                    stackId="status"
                    fill={STATUS_COLORS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </EmsContentCard>

      <EmsContentCard
        title={t('ems.dashboard.v2.woPersonChartTitle')}
        description={t('ems.dashboard.v2.woPersonChartDesc')}
        contentClassName="p-4"
        className="min-w-0"
      >
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !hasAssigneeData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t('ems.dashboard.v2.woPeriodChartEmpty')}
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assigneeChartData}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={96}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Legend />
                {STATUS_KEYS.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={statusLabels[key]}
                    stackId="status"
                    fill={STATUS_COLORS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </EmsContentCard>
    </div>
  );
};

export default DashboardWoHistoryCharts;
