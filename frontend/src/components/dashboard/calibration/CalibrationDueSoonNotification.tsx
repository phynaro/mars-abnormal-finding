import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import calibrationService, {
  type CalibrationScheduleItem,
  type CalibrationPagination,
} from '@/services/calibrationService';
import CalibrationScheduleRow from './CalibrationScheduleRow';

const PAGE_SIZE = 20;

export interface CalibrationDueSoonNotificationProps {
  companyYear?: number;
}

const CalibrationDueSoonNotification: React.FC<CalibrationDueSoonNotificationProps> = ({ companyYear }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CalibrationScheduleItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<CalibrationPagination | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    calibrationService
      .getDueSoon({ page, limit: PAGE_SIZE, year: companyYear ?? undefined })
      .then((res) => {
        if (!cancelled) {
          setItems(res.data.items ?? []);
          setPagination(res.data.pagination ?? null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setItems([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, companyYear]);

  if (loading && items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground">Loading due soon...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && items.length === 0) {
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
        <CardTitle className="text-base">Due soon (8–14 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No calibrations due in 8–14 days.</p>
        ) : (
          <>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <CalibrationScheduleRow key={`${item.PMSchNo}-${item.PMNO}`} item={item} />
              ))}
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

export default CalibrationDueSoonNotification;
