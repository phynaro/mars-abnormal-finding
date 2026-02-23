import React from 'react';
import { Link } from 'react-router-dom';
import type { CalibrationScheduleItem } from '@/services/calibrationService';

/** Format DUEDATE (YYYYMMDD or YYYY-MM-DD) for display */
function formatDueDate(raw: string | null | undefined): string {
  if (!raw) return '–';
  const s = String(raw).trim();
  if (s.length >= 10 && s[4] === '-') return s.slice(0, 10);
  if (s.length >= 8) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  return s;
}

interface CalibrationScheduleRowProps {
  item: CalibrationScheduleItem;
  showDaysOverdue?: boolean;
  /** Late (within grace): show days past target and complete-by date */
  showGraceInfo?: boolean;
}

const CalibrationScheduleRow: React.FC<CalibrationScheduleRowProps> = ({
  item,
  showDaysOverdue = false,
  showGraceInfo = false,
}) => {
  const dueFormatted = formatDueDate(item.DUEDATE);
  const completeByFormatted = item.completeBy != null ? formatDueDate(String(item.completeBy)) : null;
  const hasWo = item.WONo != null && item.WONo !== 0;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border last:border-0 text-sm">
      <span className="font-mono text-muted-foreground">{item.PMCODE}</span>
      <span className="font-medium">{item.PMNAME}</span>
      <span className="text-muted-foreground">Due: {dueFormatted}</span>
      {showDaysOverdue && item.daysOverdue != null && (
        <span className="text-destructive font-medium">{item.daysOverdue} days overdue</span>
      )}
      {showGraceInfo && (item.daysPastTarget != null || completeByFormatted) && (
        <>
          {item.daysPastTarget != null && (
            <span className="text-amber-600 dark:text-amber-500 font-medium">
              {item.daysPastTarget} day{item.daysPastTarget !== 1 ? 's' : ''} past target
            </span>
          )}
          {completeByFormatted && (
            <span className="text-muted-foreground">Complete by: {completeByFormatted}</span>
          )}
        </>
      )}
      {hasWo ? (
        <Link
          to={`/maintenance/work-orders/${item.WONo}`}
          className="text-primary hover:underline"
        >
          View WO {item.WOCODE ?? item.WONo}
        </Link>
      ) : (
        <span className="text-muted-foreground">No WO yet</span>
      )}
    </div>
  );
};

export default CalibrationScheduleRow;
