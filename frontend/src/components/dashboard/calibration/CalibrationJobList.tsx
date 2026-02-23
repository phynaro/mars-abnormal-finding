import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import calibrationService, {
  type CalibrationJobItem,
  type CalibrationJobsResponse,
} from '@/services/calibrationService';

/** Format 8-char YYYYMMDD for display */
function formatWoDate(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

const CalibrationJobList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<CalibrationJobItem[]>([]);
  const [pagination, setPagination] = useState<CalibrationJobsResponse['data']['pagination'] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calibrationService.getJobs({
        page,
        limit: 20,
        search: searchDebounced || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setWorkOrders(res.data.workOrders ?? []);
      setPagination(res.data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setWorkOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, status, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleViewWo = (id: number) => {
    navigate(`/maintenance/work-orders/${id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calibration jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search WO code, plan, problem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="number"
            placeholder="Status No"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-24"
          />
          <Input
            type="date"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
          <Button variant="secondary" size="sm" onClick={() => load()}>
            Apply
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium">WO Code</th>
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Assignee</th>
                    <th className="text-left py-2 font-medium">PM No</th>
                    <th className="text-left py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="border-b border-border">
                      <td className="py-2 font-mono">{wo.woCode ?? '–'}</td>
                      <td className="py-2">{formatWoDate(wo.woDate)}</td>
                      <td className="py-2">{wo.woStatusNo ?? '–'}</td>
                      <td className="py-2">{wo.assigneeName ?? '–'}</td>
                      <td className="py-2">{wo.PMNO ?? '–'}</td>
                      <td className="py-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => handleViewWo(wo.id)}
                        >
                          View detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm">
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CalibrationJobList;
