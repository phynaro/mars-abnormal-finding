import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import calibrationService, {
  type CalibrationPmPlanItem,
  type PmPlansResponse,
} from '@/services/calibrationService';

function formatDate8(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

function freqLabel(unitNo: number | null | undefined): string {
  if (unitNo == null) return '';
  const map: Record<number, string> = {
    1: 'Day',
    2: 'Week',
    3: 'Month',
    4: 'Year',
  };
  return map[unitNo] ?? `Unit ${unitNo}`;
}

const DEFAULT_LIMIT = 20;

const CalibrationPMPlanList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CalibrationPmPlanItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PmPlansResponse['data']['pagination'] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calibrationService.getPmPlans({ page, limit: DEFAULT_LIMIT });
      setItems(res.data.items ?? []);
      setPagination(res.data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground">Loading PM plans...</p>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration PM plans (frequency)</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No calibration PM plans found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">PM Code</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Frequency</th>
                  <th className="text-left py-2 font-medium">Next due</th>
                  <th className="text-left py-2 font-medium">Last done</th>
                </tr>
              </thead>
              <tbody>
                {items.map((pm) => (
                  <tr key={pm.PMNO} className="border-b border-border">
                    <td className="py-2 font-mono">{pm.PMCODE}</td>
                    <td className="py-2">{pm.PMNAME}</td>
                    <td className="py-2">
                      {pm.FREQUENCY != null
                        ? `${pm.FREQUENCY} ${freqLabel(pm.FREQUNITNO)}`
                        : '–'}
                    </td>
                    <td className="py-2">{formatDate8(pm.nextDueD)}</td>
                    <td className="py-2">{formatDate8(pm.lastDoneD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-2 mt-4 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalibrationPMPlanList;
