import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPeriodDateRange } from '@/utils/periodCalculations';
import calibrationService, {
  type CalibrationAssigneePeriodSummary,
  type PersonPeriodSummaryResponse,
} from '@/services/calibrationService';
import workorderVolumeService from '@/services/dashboard/workorderVolumeService';

const CHART_HEIGHT = 240;

/** Renders a single bar chart with explicit dimensions from a measured container (avoids ResponsiveContainer in grid) */
function PersonChartCard({
  assigneeName,
  chartData,
  companyYear,
}: {
  assigneeName: string;
  chartData: Array<{ period: string; periodNo: number; finished: number; remaining: number }>;
  companyYear: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: CHART_HEIGHT });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: CHART_HEIGHT };
      setSize((prev) => (prev.width !== width || prev.height !== height ? { width, height } : prev));
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base truncate" title={assigneeName}>{assigneeName}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: CHART_HEIGHT }}
        >
          {size.width > 0 && size.height > 0 && (
            <BarChart width={size.width} height={size.height} data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" fontSize={10} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const { startDate, endDate } = getPeriodDateRange(companyYear, d.periodNo);
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
                      <p className="font-medium">{d.period}</p>
                      <p className="text-muted-foreground text-xs">
                        {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
                      </p>
                      <p>Finished: {d.finished}</p>
                      <p>Remaining: {d.remaining}</p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar dataKey="finished" name="Finished" stackId="cal" fill="hsl(var(--success))" radius={[2, 0, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" stackId="cal" fill="hsl(var(--muted-foreground))" radius={[0, 2, 2, 0]} />
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CalibrationPersonYearChartProps {
  companyYear?: number;
  assigneeId?: number | null;
}

const CalibrationPersonYearChart: React.FC<CalibrationPersonYearChartProps> = ({
  companyYear: propYear,
  assigneeId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyYear, setCompanyYear] = useState<number | undefined>(propYear);
  const [data, setData] = useState<PersonPeriodSummaryResponse['data'] | null>(null);

  useEffect(() => {
    if (propYear != null) setCompanyYear(propYear);
  }, [propYear]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const year = companyYear ?? (await getCurrentYear());
      if (!year) {
        setError('Could not resolve company year');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await calibrationService.getPersonPeriodSummary({
          companyYear: year,
          assigneeId: assigneeId ?? undefined,
        });
        if (!cancelled) {
          setData(res.data);
          if (companyYear == null) setCompanyYear(res.data.companyYear ?? year);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyYear, assigneeId]);

  const chartDataByAssignee = useMemo(() => {
    if (!data?.assignees?.length) return [];
    return data.assignees
      .map((a) => {
        const sorted = [...a.periods].sort((x, y) => x.periodNo - y.periodNo);
        return {
          assigneeId: a.assigneeId,
          assigneeName: a.assigneeName,
          periods: sorted,
          chartData: sorted.map((p) => ({
            period: p.period,
            periodNo: p.periodNo,
            finished: p.finished,
            remaining: p.remaining,
          })),
        };
      })
      .filter((x) => x.chartData.some((d) => d.finished > 0 || d.remaining > 0));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading calibration summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chartDataByAssignee.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calibration by person (company year)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No calibration data for {companyYear ?? 'selected year'}. Select a year or assignee to see finished vs remaining by period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const year = companyYear ?? new Date().getFullYear();

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 420px))' }}
    >
      {chartDataByAssignee.map(({ assigneeId: aid, assigneeName, chartData }) => (
        <div key={aid} className="min-w-0">
          <PersonChartCard
            assigneeName={assigneeName}
            chartData={chartData}
            companyYear={year}
          />
        </div>
      ))}
    </div>
  );
};

async function getCurrentYear(): Promise<number | null> {
  try {
    const res = await workorderVolumeService.getCurrentCompanyYear();
    return res?.data?.currentCompanyYear ?? null;
  } catch {
    return new Date().getFullYear();
  }
}

export default CalibrationPersonYearChart;
