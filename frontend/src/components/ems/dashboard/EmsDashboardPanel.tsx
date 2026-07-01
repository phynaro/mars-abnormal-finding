import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsDashboardItem, type EmsPagination } from '@/services/emsService';
import { displayEffectiveDue } from '@/components/ems/equipment/formatEmsValues';
import { cn } from '@/lib/utils';
import type { DashboardFilters } from './DashboardFilterBar';

type PanelVariant = 'overdue' | 'due-this-week' | 'due-soon';

interface EmsDashboardPanelProps {
  title: string;
  description?: string;
  filters: DashboardFilters;
  variant: PanelVariant;
  defaultOpen?: boolean;
  accentClassName?: string;
  emptyMessage: string;
  showDaysOverdue?: boolean;
  showDaysUntilDue?: boolean;
}

const PAGE_SIZE = 20;

async function fetchPanel(
  variant: PanelVariant,
  params: { plant?: string; area?: string; page?: number; limit?: number }
) {
  switch (variant) {
    case 'overdue':
      return emsService.getOverdue(params);
    case 'due-this-week':
      return emsService.getDueThisWeek(params);
    case 'due-soon':
      return emsService.getDueSoon(params);
  }
}

const EmsDashboardPanel: React.FC<EmsDashboardPanelProps> = ({
  title,
  description,
  filters,
  variant,
  defaultOpen = true,
  accentClassName,
  emptyMessage,
  showDaysOverdue = false,
  showDaysUntilDue = false,
}) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);
  const [items, setItems] = useState<EmsDashboardItem[]>([]);
  const [pagination, setPagination] = useState<EmsPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPanel(variant, {
        plant: filters.plant || undefined,
        area: filters.area || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(res.data.items ?? []);
      setPagination(res.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [variant, filters.plant, filters.area, page, t]);

  useEffect(() => {
    setPage(1);
  }, [filters.plant, filters.area]);

  useEffect(() => {
    load();
  }, [load]);

  const total = pagination?.total ?? items.length;

  return (
    <Card className={cn('overflow-hidden shadow-sm', accentClassName)}>
      <div className="flex w-full items-center gap-2 px-4 py-4 sm:px-6 border-b bg-muted/20">
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-3 text-left hover:bg-muted/40 transition-colors rounded-md -mx-1 px-1 py-0.5"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{title}</h3>
              <span className="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                {loading ? '…' : total}
              </span>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={() => load()}
          disabled={loading}
          aria-label={t('common.refresh')}
        >
          <RotateCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {open && (
        <CardContent className="p-0">
          {error && (
            <p className="px-4 py-3 text-sm text-destructive">{error}</p>
          )}

          {loading && items.length === 0 && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="px-4 py-8 text-sm text-center text-muted-foreground">{emptyMessage}</p>
          )}

          {items.length > 0 && (
            <>
              <div className="overflow-x-auto md:hidden divide-y">
                {items.map((row) => (
                  <Link
                    key={`${row.tagNo}-${row.pmSchNo}`}
                    to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
                    className="block px-4 py-3 hover:bg-muted/30"
                  >
                    <p className="font-medium text-sm">{row.tagNo}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{row.area || '—'}</span>
                      {showDaysOverdue && row.daysOverdue != null && (
                        <span className="text-destructive font-medium">
                          {row.daysOverdue}d {t('ems.dashboard.overdueShort')}
                        </span>
                      )}
                      {showDaysUntilDue && row.daysUntilDue != null && (
                        <span>{row.daysUntilDue}d</span>
                      )}
                      {row.woCode && <span>{row.woCode}</span>}
                    </div>
                  </Link>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ems.equipment.col.tagNo')}</TableHead>
                    <TableHead>{t('ems.equipment.col.description')}</TableHead>
                    <TableHead>{t('ems.equipment.area')}</TableHead>
                    {showDaysOverdue && (
                      <TableHead className="text-right">{t('ems.dashboard.daysOverdue')}</TableHead>
                    )}
                    {showDaysUntilDue && (
                      <TableHead className="text-right">{t('ems.dashboard.daysUntilDue')}</TableHead>
                    )}
                    <TableHead>{t('ems.due.effectiveDue')}</TableHead>
                    <TableHead>{t('ems.equipment.wo.assignee')}</TableHead>
                    <TableHead>{t('ems.equipment.wo.woNo')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={`${row.tagNo}-${row.pmSchNo}`} className="hover:bg-muted/30">
                      <TableCell>
                        <Link
                          to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.tagNo}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={row.description}>
                        {row.description || '—'}
                      </TableCell>
                      <TableCell>{row.area || '—'}</TableCell>
                      {showDaysOverdue && (
                        <TableCell className="text-right font-medium text-destructive tabular-nums">
                          {row.daysOverdue ?? '—'}
                        </TableCell>
                      )}
                      {showDaysUntilDue && (
                        <TableCell className="text-right tabular-nums">
                          {row.daysUntilDue ?? '—'}
                        </TableCell>
                      )}
                      <TableCell>{displayEffectiveDue(row)}</TableCell>
                      <TableCell>{row.assigneeName?.trim() || '—'}</TableCell>
                      <TableCell>{row.woCode || row.woNo || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t text-sm">
                  <span className="text-muted-foreground">
                    {t('ems.equipment.showing')} {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, pagination.total)} {t('ems.equipment.of')}{' '}
                    {pagination.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('common.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default EmsDashboardPanel;
