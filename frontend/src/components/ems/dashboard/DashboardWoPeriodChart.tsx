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

import { Skeleton } from '@/components/ui/skeleton';
import { EmsContentCard } from '@/components/ems/shared/emsLayoutPrimitives';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsWoPeriodStatusItem } from '@/services/emsService';
import {
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import { getPeriodDateRange } from '@/utils/periodCalculations';

interface Props {
  timeTravel: DashboardTimeTravelValue;
}

interface ChartRow {
  period: string;
  periodNumber: number;
  ontime: number;
  late: number;
  notFinish: number;
  total: number;
}

function emptyPeriods(): EmsWoPeriodStatusItem[] {
  return Array.from({ length: 13 }, (_, i) => ({
    period: i + 1,
    ontime: 0,
    late: 0,
    notFinish: 0,
    total: 0,
  }));
}

function toChartRows(periods: EmsWoPeriodStatusItem[]): ChartRow[] {
  return periods.map((p) => ({
    period: `P${p.period}`,
    periodNumber: p.period,
    ontime: p.ontime,
    late: p.late,
    notFinish: p.notFinish,
    total: p.total,
  }));
}

const DashboardWoPeriodChart: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const [periods, setPeriods] = useState<EmsWoPeriodStatusItem[]>(emptyPeriods);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateRange = getTimeTravelDateRange(timeTravel);

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
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setPeriods(emptyPeriods());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.endDate, dateRange.startDate, t, timeTravel.year]);

  const chartData = useMemo(() => toChartRows(periods), [periods]);
  const hasData = chartData.some((row) => row.total > 0);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartRow }>;
  }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const { startDate, endDate } = getPeriodDateRange(timeTravel.year, row.periodNumber);

    return (
      <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-sm">
        <p className="font-medium">{row.period}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
        </p>
        <div className="space-y-1">
          <p>
            <span className="font-medium text-green-600">{t('ems.dashboard.v2.woStatusOntime')}:</span>{' '}
            {row.ontime}
          </p>
          <p>
            <span className="font-medium text-amber-600">{t('ems.dashboard.v2.woStatusLate')}:</span>{' '}
            {row.late}
          </p>
          <p>
            <span className="font-medium text-muted-foreground">
              {t('ems.dashboard.v2.woStatusNotFinish')}:
            </span>{' '}
            {row.notFinish}
          </p>
          <p className="pt-1 border-t border-border">
            <span className="font-medium">{t('ems.dashboard.v2.woStatusTotal')}:</span> {row.total}
          </p>
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
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : !hasData && !error ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('ems.dashboard.v2.woPeriodChartEmpty')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="ontime"
                stackId="status"
                fill="#22c55e"
                name={t('ems.dashboard.v2.woStatusOntime')}
              />
              <Bar
                dataKey="late"
                stackId="status"
                fill="#f59e0b"
                name={t('ems.dashboard.v2.woStatusLate')}
              />
              <Bar
                dataKey="notFinish"
                stackId="status"
                fill="#94a3b8"
                name={t('ems.dashboard.v2.woStatusNotFinish')}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EmsContentCard>
    </section>
  );
};

export default DashboardWoPeriodChart;
