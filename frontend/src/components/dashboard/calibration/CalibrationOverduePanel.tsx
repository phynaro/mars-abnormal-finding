import React, { useState, useEffect, useMemo, useCallback } from 'react';
import calibrationService, { type CalibrationScheduleItem } from '@/services/calibrationService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ClipboardX,
} from 'lucide-react';

// ─── Severity config ──────────────────────────────────────────────────────────
const BUCKETS = [
  {
    key: 'critical' as const,
    label: 'Critical',
    sublabel: '> 60 days',
    minDays: 61,
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    accentClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    cardClass: 'border-red-200 dark:border-red-900',
    headerClass: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    key: 'high' as const,
    label: 'High',
    sublabel: '31 – 60 days',
    minDays: 31,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    accentClass: 'bg-orange-500',
    textClass: 'text-orange-600 dark:text-orange-400',
    cardClass: 'border-orange-200 dark:border-orange-900',
    headerClass: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    key: 'medium' as const,
    label: 'Medium',
    sublabel: '8 – 30 days',
    minDays: 8,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    accentClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    cardClass: 'border-amber-200 dark:border-amber-900',
    headerClass: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    key: 'low' as const,
    label: 'Low',
    sublabel: '1 – 7 days',
    minDays: 1,
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:border-lime-800',
    accentClass: 'bg-lime-500',
    textClass: 'text-lime-600 dark:text-lime-400',
    cardClass: 'border-lime-200 dark:border-lime-900',
    headerClass: 'bg-lime-50 dark:bg-lime-950/30',
  },
] as const;

type BucketKey = (typeof BUCKETS)[number]['key'];
type EnrichedItem = CalibrationScheduleItem & { _days: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseRawDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.length >= 10 && s[4] === '-') return new Date(s.slice(0, 10) + 'T00:00:00');
  if (s.length >= 8) return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`);
  return null;
}

function computeDaysOverdue(item: CalibrationScheduleItem): number {
  if (typeof item.daysOverdue === 'number') return item.daysOverdue;
  const d = parseRawDate(item.DUEDATE);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86_400_000));
}

function formatDate(raw: string): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 10 && s[4] === '-') return s.slice(0, 10);
  if (s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function getBucketKey(days: number): BucketKey {
  if (days > 60) return 'critical';
  if (days > 30) return 'high';
  if (days > 7) return 'medium';
  return 'low';
}

function getWOStatus(item: CalibrationScheduleItem): 'none' | 'progress' | 'done' {
  const s = item.WOStatusNo ?? item.woStatusNo ?? null;
  if (s === 9) return 'done';
  if (item.WONo && item.WONo > 0) return 'progress';
  return 'none';
}

function WOBadge({ status }: { status: 'none' | 'progress' | 'done' }) {
  if (status === 'done')
    return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">Done</Badge>;
  if (status === 'progress')
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">In Progress</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">No WO</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────
const CalibrationOverduePanel: React.FC = () => {
  const [items, setItems] = useState<CalibrationScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [openBuckets, setOpenBuckets] = useState<Set<BucketKey>>(
    new Set<BucketKey>(['critical', 'high'])
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calibrationService.getOverdue({ page: 1, limit: 200 });
      if (res.success) setItems(res.data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overdue calibrations');
    } finally {
      setLoading(false);
    }
  }, [tick]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map: Record<BucketKey, EnrichedItem[]> = {
      critical: [], high: [], medium: [], low: [],
    };
    for (const item of items) {
      const days = computeDaysOverdue(item);
      map[getBucketKey(days)].push({ ...item, _days: days });
    }
    for (const key of Object.keys(map) as BucketKey[]) {
      map[key].sort((a, b) => b._days - a._days);
    }
    return map;
  }, [items]);

  const totalDebt = useMemo(
    () => items.reduce((s, i) => s + computeDaysOverdue(i), 0),
    [items]
  );

  const noWOCount = useMemo(
    () => items.filter((i) => getWOStatus(i) === 'none').length,
    [items]
  );

  const toggleBucket = (key: BucketKey) =>
    setOpenBuckets((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive text-sm gap-2">
        <AlertTriangle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="text-base font-semibold">All calibrations on track</p>
        <p className="text-sm text-muted-foreground">No overdue items found.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Overdue Calibrations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calibration schedules past their due date with no completed work order.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setTick(t => t + 1)}
          className="gap-1.5"
        >
          <RotateCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Overdue</p>
                <p className="text-3xl font-bold mt-1">{items.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-950">
                <ClipboardX className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">items past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Debt</p>
                <p className="text-3xl font-bold mt-1 text-orange-600">{totalDebt.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">total days overdue across all items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{grouped.critical.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-950">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">more than 60 days overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No Work Order</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">{noWOCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950">
                <ClipboardX className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">overdue with no WO created</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Severity distribution bar ──────────────────────────────────── */}
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {BUCKETS.map((b) => {
          const pct = items.length > 0 ? (grouped[b.key].length / items.length) * 100 : 0;
          return pct > 0 ? (
            <div
              key={b.key}
              className={cn('transition-all duration-500', b.accentClass)}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${grouped[b.key].length} item${grouped[b.key].length !== 1 ? 's' : ''}`}
            />
          ) : null;
        })}
      </div>

      {/* ── Severity accordion buckets ─────────────────────────────────── */}
      {BUCKETS.map((bucket) => {
        const bucketItems = grouped[bucket.key];
        if (bucketItems.length === 0) return null;
        const isOpen = openBuckets.has(bucket.key);
        const debt = bucketItems.reduce((s, i) => s + i._days, 0);

        return (
          <div key={bucket.key} className={cn('rounded-lg border overflow-hidden', bucket.cardClass)}>

            {/* Bucket header */}
            <button
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-95',
                bucket.headerClass
              )}
              onClick={() => toggleBucket(bucket.key)}
            >
              <div className={cn('w-1 self-stretch rounded-full shrink-0', bucket.accentClass)} />

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge className={cn('text-xs shrink-0', bucket.badgeClass)}>
                  {bucket.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{bucket.sublabel}</span>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="font-medium text-foreground">
                  {bucketItems.length} item{bucketItems.length !== 1 ? 's' : ''}
                </span>
                <span className={cn('font-mono', bucket.textClass)}>
                  {debt}d debt
                </span>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Table */}
            {isOpen && (
              <div className="rounded-b-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">PM Code</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Due Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">WO Status</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucketItems.map((item) => (
                      <tr key={item.PMSchNo} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {item.PMCODE}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate" title={item.PMNAME}>
                          {item.PMNAME || '–'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground hidden md:table-cell">
                          {formatDate(item.DUEDATE)}
                        </td>
                        <td className="px-3 py-2">
                          <WOBadge status={getWOStatus(item)} />
                        </td>
                        <td className={cn('px-3 py-2 text-right font-bold tabular-nums', bucket.textClass)}>
                          {item._days}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CalibrationOverduePanel;
