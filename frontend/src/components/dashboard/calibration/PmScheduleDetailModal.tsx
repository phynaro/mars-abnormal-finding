import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import calibrationService from '@/services/calibrationService';
import type { PmScheduleDetail, PmScheduleListItem } from '@/services/calibrationService';

interface Props {
  schedule: PmScheduleListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 10 && s[4] === '-') return s.slice(0, 10);
  if (s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function fallbackStatus(item: PmScheduleListItem | null): PmScheduleDetail['derivedStatus'] {
  if (!item) return 'pending';
  if (item.woStatusNo === 9 || item.schedWOStatusNo === 9) return 'done';
  if (item.WONo != null && item.WONo > 0) return 'in-progress';
  return 'pending';
}

function statusBadge(status: PmScheduleDetail['derivedStatus'], label?: string) {
  const className =
    status === 'done'
      ? 'bg-green-100 text-green-800 border-green-200'
      : status === 'in-progress'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-orange-100 text-orange-800 border-orange-200';

  return <Badge className={className}>{label ?? status}</Badge>;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value ?? '–'}</span>
    </div>
  );
}

const PmScheduleDetailModal: React.FC<Props> = ({ schedule, open, onOpenChange }) => {
  const [detail, setDetail] = useState<PmScheduleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !schedule?.PMSchNo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    calibrationService
      .getPmScheduleDetail(schedule.PMSchNo)
      .then((res) => {
        if (!cancelled && res.success) setDetail(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load schedule detail');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, schedule?.PMSchNo]);

  const headerData = detail ?? schedule;
  const currentStatus = detail?.derivedStatus ?? fallbackStatus(schedule);
  const currentStatusLabel = detail?.derivedStatusLabel
    ?? (currentStatus === 'done' ? 'Done' : currentStatus === 'in-progress' ? 'In Progress' : 'Pending');

  const headerBadges = useMemo(() => {
    if (!headerData) return [];
    return [
      <React.Fragment key="status">{statusBadge(currentStatus, currentStatusLabel)}</React.Fragment>,
      <Badge key="due" variant="secondary">Due {formatDate(headerData.DUEDATE)}</Badge>,
      headerData.eqTypeKey
        ? <Badge key="type" variant="outline">{detail?.eqTypeDisplayLabel || (headerData.eqTypeKey === '_UNPARSED' ? 'Other' : headerData.eqTypeKey)}</Badge>
        : null,
      detail?.plantLabel ? <Badge key="plant" variant="outline">{detail.plantLabel}</Badge> : null,
      headerData.assigneeName ? <Badge key="assignee" variant="outline">{headerData.assigneeName}</Badge> : null,
    ].filter(Boolean);
  }, [currentStatus, currentStatusLabel, detail, headerData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-3rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <span className="font-mono text-sm">{headerData?.PMCODE ?? 'PM Schedule Detail'}</span>
            {headerBadges}
          </DialogTitle>
          <DialogDescription className="pt-1">
            {headerData?.PMNAME ?? 'View the selected PM schedule occurrence, PM plan context, equipment, and work order details.'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && headerData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FieldRow label="Schedule No." value={detail?.PMSchNo ?? headerData.PMSchNo} />
                    <FieldRow label="Due Date" value={formatDate(detail?.DUEDATE ?? headerData.DUEDATE)} />
                    <FieldRow label="Derived State" value={currentStatusLabel} />
                    <FieldRow label="Schedule WO Status" value={detail?.schedWOStatusNo ?? headerData.schedWOStatusNo ?? '–'} />
                    <FieldRow label="WO Number" value={detail?.WONo ?? headerData.WONo ?? '–'} />
                    <FieldRow label="WO Code" value={detail?.WOCODE ?? headerData.WOCODE ?? '–'} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">PM Master</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FieldRow label="PM No." value={detail?.PMNO ?? headerData.PMNO} />
                    <FieldRow label="PM Code" value={<span className="font-mono text-xs">{detail?.PMCODE ?? headerData.PMCODE}</span>} />
                    <FieldRow label="PM Name" value={detail?.PMNAME ?? headerData.PMNAME} />
                    <FieldRow label="Plant" value={detail?.plantLabel ?? detail?.plantCode ?? '–'} />
                    <FieldRow
                      label="Department"
                      value={detail?.DEPTNAME ? `${detail.DEPTNAME}${detail.DEPTCODE ? ` (${detail.DEPTCODE})` : ''}` : (detail?.DEPTNO ?? headerData.DEPTNO ?? '–')}
                    />
                    <FieldRow
                      label="Assignee"
                      value={detail?.assigneeName ? `${detail.assigneeName}${detail.assigneeId ? ` (#${detail.assigneeId})` : ''}` : (headerData.assigneeName ?? '–')}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Equipment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FieldRow label="Equipment Code" value={<span className="font-mono text-xs">{detail?.EQCODE ?? headerData.EQCODE ?? '–'}</span>} />
                    <FieldRow label="Equipment Name" value={detail?.EQNAME ?? '–'} />
                    <FieldRow
                      label="Equipment Type"
                      value={detail?.eqTypeDisplayLabel ?? (headerData.eqTypeKey ? (headerData.eqTypeKey === '_UNPARSED' ? 'Other' : headerData.eqTypeKey) : '–')}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Work Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(detail?.WONo ?? headerData.WONo) ? (
                      <>
                        <FieldRow label="WO Number" value={detail?.WONo ?? headerData.WONo ?? '–'} />
                        <FieldRow label="WO Code" value={detail?.WOCODE ?? headerData.WOCODE ?? '–'} />
                        <FieldRow label="WO Status" value={detail?.woStatusNo ?? headerData.woStatusNo ?? '–'} />
                        <FieldRow label="WO Date" value={formatDate(detail?.woDateRaw ?? detail?.woDate)} />
                        <FieldRow label="Actual Finish" value={formatDate(detail?.woFinishDateRaw ?? detail?.woFinishDate)} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No work order created yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <FieldRow label="PMSchNo" value={detail?.PMSchNo ?? headerData.PMSchNo} />
              <FieldRow label="PMNO" value={detail?.PMNO ?? headerData.PMNO} />
              <FieldRow label="Assignee ID" value={detail?.assigneeId ?? headerData.assigneeId ?? '–'} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PmScheduleDetailModal;
