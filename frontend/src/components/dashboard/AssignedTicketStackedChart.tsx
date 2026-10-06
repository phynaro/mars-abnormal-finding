import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type {
  AssignedBreakdownRow,
  UnassignedByPlant,
  AssignedChartBarRow
} from '@/types/personalKPIComparison';

export type AssignedBucket =
  | 'closedOnTime'
  | 'closedDelay'
  | 'openNotDue'
  | 'openOverdue'
  | 'unassigned'
  | 'assigned';

export interface AssignedTicketStackedChartProps {
  rows: AssignedBreakdownRow[];
  unassigned: UnassignedByPlant[];
  loading: boolean;
  error: string | null;
  startDate: string;
  endDate: string;
}

const COLORS = {
  closedOnTime: '#166534',
  closedDelay: '#84CC16',
  openNotDue: '#FACC15',
  openOverdue: '#DC2626',
  unassigned: '#9CA3AF'
} as const;

const BUCKET_KEYS: AssignedBucket[] = [
  'closedOnTime',
  'closedDelay',
  'openNotDue',
  'openOverdue',
  'unassigned'
];

const ROW_HEIGHT = 44;
const CHART_MARGIN = { top: 8, right: 24, left: 8, bottom: 8 };
const Y_AXIS_WIDTH = 220;

function rowTotal(row: Pick<AssignedChartBarRow, 'closedOnTime' | 'closedDelay' | 'openNotDue' | 'openOverdue' | 'unassigned'>): number {
  return row.closedOnTime + row.closedDelay + row.openNotDue + row.openOverdue + row.unassigned;
}

function buildUserBar(
  personno: number,
  personName: string,
  avatarUrl: string,
  initials: string,
  bgColor: string,
  closedOnTime: number,
  closedDelay: number,
  openNotDue: number,
  openOverdue: number,
  keySuffix = '',
  plant: string | null = null
): AssignedChartBarRow {
  const base = {
    key: `user-${personno}${keySuffix}`,
    personno,
    personName,
    avatarUrl,
    initials,
    bgColor,
    plant,
    closedOnTime,
    closedDelay,
    openNotDue,
    openOverdue,
    unassigned: 0,
    isUnassigned: false
  };
  return { ...base, total: rowTotal(base) };
}

function buildUnassignedBar(
  count: number,
  keySuffix = '',
  plant: string | null = null
): AssignedChartBarRow {
  const base = {
    key: `unassigned${keySuffix}`,
    personno: null,
    personName: '',
    avatarUrl: '',
    initials: '?',
    bgColor: COLORS.unassigned,
    plant,
    closedOnTime: 0,
    closedDelay: 0,
    openNotDue: 0,
    openOverdue: 0,
    unassigned: count,
    isUnassigned: true
  };
  return { ...base, total: rowTotal(base) };
}

function aggregateAll(
  rows: AssignedBreakdownRow[],
  unassigned: UnassignedByPlant[],
  unassignedLabel: string
): AssignedChartBarRow[] {
  const byPerson = new Map<number, AssignedChartBarRow>();

  for (const row of rows) {
    const existing = byPerson.get(row.personno);
    if (existing) {
      existing.closedOnTime += row.closedOnTime;
      existing.closedDelay += row.closedDelay;
      existing.openNotDue += row.openNotDue;
      existing.openOverdue += row.openOverdue;
      existing.total = rowTotal(existing);
    } else {
      byPerson.set(
        row.personno,
        buildUserBar(
          row.personno,
          row.personName,
          row.avatarUrl,
          row.initials,
          row.bgColor,
          row.closedOnTime,
          row.closedDelay,
          row.openNotDue,
          row.openOverdue
        )
      );
    }
  }

  const userBars = Array.from(byPerson.values()).sort((a, b) => b.total - a.total);
  const unassignedTotal = unassigned.reduce((sum, item) => sum + item.count, 0);
  const unassignedBar = buildUnassignedBar(unassignedTotal);
  unassignedBar.personName = unassignedLabel;

  return [...userBars, unassignedBar];
}

function groupByPlant(
  rows: AssignedBreakdownRow[],
  unassigned: UnassignedByPlant[],
  unassignedLabel: string,
  unknownPlantLabel: string
): { plant: string; bars: AssignedChartBarRow[] }[] {
  const plantSet = new Set<string>();
  rows.forEach((r) => plantSet.add(r.plant || 'Unknown'));
  unassigned.forEach((u) => plantSet.add(u.plant || 'Unknown'));

  const plants = Array.from(plantSet).sort((a, b) => a.localeCompare(b));

  return plants.map((plant) => {
    const plantRows = rows.filter((r) => (r.plant || 'Unknown') === plant);
    const userBars = plantRows
      .map((row) =>
        buildUserBar(
          row.personno,
          row.personName,
          row.avatarUrl,
          row.initials,
          row.bgColor,
          row.closedOnTime,
          row.closedDelay,
          row.openNotDue,
          row.openOverdue,
          `-${plant}`,
          plant
        )
      )
      .sort((a, b) => b.total - a.total);

    const unassignedCount =
      unassigned.find((u) => (u.plant || 'Unknown') === plant)?.count ?? 0;
    const unassignedBar = buildUnassignedBar(unassignedCount, `-${plant}`, plant);
    unassignedBar.personName = unassignedLabel;

    return {
      plant,
      bars: [...userBars, unassignedBar]
    };
  }).filter((group) => group.bars.some((b) => b.total > 0));
}

interface CustomYTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  dataByKey: Map<string, AssignedChartBarRow>;
  onRowClick?: (row: AssignedChartBarRow) => void;
}

const CustomYTick: React.FC<CustomYTickProps> = ({
  x = 0,
  y = 0,
  payload,
  dataByKey,
  onRowClick
}) => {
  if (!payload) return null;
  const row = dataByKey.get(payload.value);
  if (!row) return null;

  const avatarSize = 28;
  const left = x - Y_AXIS_WIDTH + 8;

  return (
    <g
      transform={`translate(${left},${y})`}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onRowClick?.(row);
      }}
    >
      <defs>
        <clipPath id={`avatar-clip-${row.key}`}>
          <circle cx={avatarSize / 2} cy={0} r={avatarSize / 2} />
        </clipPath>
      </defs>
      {row.avatarUrl ? (
        <image
          href={row.avatarUrl}
          x={0}
          y={-avatarSize / 2}
          width={avatarSize}
          height={avatarSize}
          clipPath={`url(#avatar-clip-${row.key})`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle cx={avatarSize / 2} cy={0} r={avatarSize / 2} fill={row.bgColor} />
          <text
            x={avatarSize / 2}
            y={4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={11}
            fontWeight={600}
          >
            {row.initials}
          </text>
        </>
      )}
      <text
        x={avatarSize + 10}
        y={-4}
        fill="hsl(var(--foreground))"
        fontSize={12}
        fontWeight={500}
      >
        {row.personName.length > 18 ? `${row.personName.slice(0, 16)}…` : row.personName}
      </text>
      <text
        x={avatarSize + 10}
        y={12}
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
      >
        {row.total}
      </text>
    </g>
  );
};

interface StackTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  dataByKey: Map<string, AssignedChartBarRow>;
  labels: Record<string, string>;
}

const StackTooltip: React.FC<StackTooltipProps> = ({
  active,
  payload,
  label,
  dataByKey,
  labels
}) => {
  if (!active || !payload?.length || !label) return null;
  const row = dataByKey.get(label);
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">{row.personName}</p>
      <div className="space-y-1 text-xs">
        {payload
          .filter((entry) => entry.value > 0)
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                {labels[entry.dataKey] || entry.name}
              </span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium">
          <span>{labels.total}</span>
          <span>{row.total}</span>
        </div>
        <p className="pt-1 text-[10px] text-muted-foreground">{labels.clickHint}</p>
      </div>
    </div>
  );
};

interface SingleChartProps {
  bars: AssignedChartBarRow[];
  labels: Record<string, string>;
  title?: string;
  /** Shared X-axis max so plant charts use the same scale */
  xMax?: number;
  onSegmentClick: (row: AssignedChartBarRow, bucket: AssignedBucket) => void;
  onRowClick: (row: AssignedChartBarRow) => void;
}

const SingleStackedChart: React.FC<SingleChartProps> = ({
  bars,
  labels,
  title,
  xMax,
  onSegmentClick,
  onRowClick
}) => {
  const dataByKey = useMemo(() => new Map(bars.map((b) => [b.key, b])), [bars]);
  const height = Math.max(180, bars.length * ROW_HEIGHT + 48);

  const chartData = bars.map((b) => ({
    ...b,
    name: b.key
  }));

  const handleBarClick = (data: AssignedChartBarRow, bucket: AssignedBucket) => {
    if (!data) return;
    const value = data[bucket];
    if (!value || value <= 0) return;
    onSegmentClick(data, bucket);
  };

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={CHART_MARGIN}
          barCategoryGap={8}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={xMax != null && xMax > 0 ? [0, xMax] : [0, 'auto']}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={Y_AXIS_WIDTH}
            tick={<CustomYTick dataByKey={dataByKey} onRowClick={onRowClick} />}
            interval={0}
          />
          <Tooltip
            content={
              <StackTooltip
                dataByKey={dataByKey}
                labels={labels}
              />
            }
          />
          <Legend
            formatter={(value: string) => labels[value] || value}
          />
          {BUCKET_KEYS.map((bucket) => (
            <Bar
              key={bucket}
              dataKey={bucket}
              stackId="a"
              fill={COLORS[bucket]}
              name={bucket}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(data) => {
                const row = ((data as { payload?: AssignedChartBarRow })?.payload
                  ?? data) as AssignedChartBarRow;
                handleBarClick(row, bucket);
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const AssignedTicketStackedChart: React.FC<AssignedTicketStackedChartProps> = ({
  rows,
  unassigned,
  loading,
  error,
  startDate,
  endDate
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'all' | 'byPlant'>('all');

  const labels = useMemo(
    () => ({
      closedOnTime: t('dashboard.personalKPIComparison.closedOnTime'),
      closedDelay: t('dashboard.personalKPIComparison.closedDelay'),
      openNotDue: t('dashboard.personalKPIComparison.openNotDue'),
      openOverdue: t('dashboard.personalKPIComparison.openOverdue'),
      unassigned: t('dashboard.personalKPIComparison.unassigned'),
      total: t('dashboard.personalKPIComparison.total'),
      clickHint: t('dashboard.personalKPIComparison.clickToViewTickets')
    }),
    [t]
  );

  const unassignedLabel = t('dashboard.personalKPIComparison.unassigned');
  const unknownPlantLabel = t('dashboard.personalKPIComparison.unknownPlant');

  const allBars = useMemo(
    () => aggregateAll(rows, unassigned, unassignedLabel),
    [rows, unassigned, unassignedLabel]
  );

  const plantGroups = useMemo(
    () => groupByPlant(rows, unassigned, unassignedLabel, unknownPlantLabel),
    [rows, unassigned, unassignedLabel, unknownPlantLabel]
  );

  // Shared X max across all plant charts so bar lengths are comparable
  const plantXMax = useMemo(() => {
    let max = 0;
    for (const group of plantGroups) {
      for (const bar of group.bars) {
        if (bar.total > max) max = bar.total;
      }
    }
    return max;
  }, [plantGroups]);

  const navigateToTickets = (row: AssignedChartBarRow, bucket: AssignedBucket) => {
    const params = new URLSearchParams();
    params.set('assignedBucket', bucket);

    if (bucket === 'unassigned') {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    } else {
      params.set('dueStartDate', startDate);
      params.set('dueEndDate', endDate);
      if (row.personno != null) {
        params.set('assigned_to', String(row.personno));
      }
    }

    if (row.plant) {
      params.set('plant', row.plant === unknownPlantLabel ? 'Unknown' : row.plant);
    }

    window.open(`/tickets?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleSegmentClick = (row: AssignedChartBarRow, bucket: AssignedBucket) => {
    navigateToTickets(row, bucket);
  };

  const handleRowClick = (row: AssignedChartBarRow) => {
    if (row.isUnassigned) {
      navigateToTickets(row, 'unassigned');
    } else {
      navigateToTickets(row, 'assigned');
    }
  };

  const kpiTitle = t('dashboard.personalKPIComparison.ticketCountAssigned');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{kpiTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{kpiTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData =
    rows.some(
      (r) => r.closedOnTime + r.closedDelay + r.openNotDue + r.openOverdue > 0
    ) || unassigned.some((u) => u.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{kpiTitle}</span>
          </div>
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('all')}
              className={cn('flex-1 sm:flex-none')}
            >
              {t('dashboard.personalKPIComparison.all')}
            </Button>
            <Button
              type="button"
              variant={viewMode === 'byPlant' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('byPlant')}
              className={cn('flex-1 sm:flex-none')}
            >
              {t('dashboard.personalKPIComparison.byPlant')}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            {t('dashboard.personalKPIComparison.noDataDescription')}
          </div>
        ) : viewMode === 'all' ? (
          <SingleStackedChart
            bars={allBars}
            labels={labels}
            onSegmentClick={handleSegmentClick}
            onRowClick={handleRowClick}
          />
        ) : (
          <div className="space-y-8">
            {plantGroups.map((group) => (
              <SingleStackedChart
                key={group.plant}
                bars={group.bars}
                labels={labels}
                xMax={plantXMax}
                title={
                  group.plant === 'Unknown'
                    ? unknownPlantLabel
                    : group.plant
                }
                onSegmentClick={handleSegmentClick}
                onRowClick={handleRowClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignedTicketStackedChart;
