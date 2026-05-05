import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type {
  CalibrationUserEvent,
  PmCalendarView,
  PmScheduleListItem,
} from '@/services/calibrationService';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// date-fns localizer
// ---------------------------------------------------------------------------
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: 'pm-schedule' | 'user-event';
  resource: PmScheduleListItem | CalibrationUserEvent;
  status?: 'done' | 'in-progress' | 'pending';
  color?: string | null;
  allDay?: boolean;
}

interface Props {
  items: PmScheduleListItem[];
  userEvents?: CalibrationUserEvent[];
  loading?: boolean;
  view: PmCalendarView;
  date: Date;
  onViewChange: (view: PmCalendarView) => void;
  onNavigate: (date: Date) => void;
  onSelectItem?: (item: PmScheduleListItem) => void;
  onSelectUserEvent?: (item: CalibrationUserEvent) => void;
  rangeStart?: string;
  rangeEnd?: string;
  loadedCount?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDueDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let y: number, m: number, d: number;
  if (s.length >= 10 && s[4] === '-') {
    // ISO: 2024-03-15 or 2024-03-15T...
    y = parseInt(s.slice(0, 4), 10);
    m = parseInt(s.slice(5, 7), 10) - 1;
    d = parseInt(s.slice(8, 10), 10);
  } else if (s.length >= 8) {
    // Compact: 20240315
    y = parseInt(s.slice(0, 4), 10);
    m = parseInt(s.slice(4, 6), 10) - 1;
    d = parseInt(s.slice(6, 8), 10);
  } else {
    return null;
  }
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  // Use local date constructor to avoid UTC midnight offset shifting the day
  return new Date(y, m, d, 0, 0, 0);
}

function parseDateTime(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function eventStatus(item: PmScheduleListItem): 'done' | 'in-progress' | 'pending' {
  if (item.woStatusNo === 9) return 'done';
  if (item.WONo != null) return 'in-progress';
  return 'pending';
}

const STATUS_STYLE: Record<string, string> = {
  done: 'bg-green-500 border-green-600 text-white',
  'in-progress': 'bg-blue-500 border-blue-600 text-white',
  pending: 'bg-orange-400 border-orange-500 text-white',
};

// ---------------------------------------------------------------------------
// Custom event renderer
// ---------------------------------------------------------------------------
function EventComponent({ event }: { event: CalEvent }) {
  if (event.kind === 'user-event') {
    const resource = event.resource as CalibrationUserEvent;
    return (
      <span
        className="block text-[11px] font-medium px-1 py-0.5 rounded truncate leading-tight border"
        style={{
          backgroundColor: resource.color_hex || '#7c3aed',
          borderColor: resource.color_hex || '#6d28d9',
          color: '#fff',
        }}
        title={`${resource.title}${resource.description ? ` — ${resource.description}` : ''}`}
      >
        {resource.title}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'block text-[11px] font-medium px-1 py-0.5 rounded truncate leading-tight',
        STATUS_STYLE[event.status]
      )}
      title={`${event.resource.PMCODE} — ${event.resource.PMNAME}`}
    >
      {event.resource.eqTypeKey && event.resource.eqTypeKey !== '_UNPARSED'
        ? `[${event.resource.eqTypeKey}] `
        : ''}
      {event.resource.PMCODE}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const CalibrationBigCalendar: React.FC<Props> = ({
  items,
  userEvents = [],
  loading,
  view,
  date,
  onViewChange,
  onNavigate,
  onSelectItem,
  onSelectUserEvent,
  rangeStart,
  rangeEnd,
  loadedCount,
}) => {
  const events = useMemo<CalEvent[]>(() => {
    const result: CalEvent[] = [];
    for (const item of items) {
      const d = parseDueDate(item.DUEDATE);
      if (!d) continue;
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59);
      result.push({
        id: `pm-${item.PMSchNo}`,
        title: item.PMCODE,
        start: d,
        end: dayEnd,
        kind: 'pm-schedule',
        resource: item,
        status: eventStatus(item),
      });
    }
    for (const event of userEvents) {
      const start = parseDateTime(event.start_at);
      const end = parseDateTime(event.end_at);
      if (!start || !end) continue;
      result.push({
        id: `user-${event.id}`,
        title: event.title,
        start,
        end,
        kind: 'user-event',
        resource: event,
        color: event.color_hex,
        allDay: event.is_all_day,
      });
    }
    return result;
  }, [items, userEvents]);

  const eventPropGetter = (event: CalEvent) => {
    if (event.kind === 'user-event') {
      const color = event.color || '#7c3aed';
      return {
        style: {
          backgroundColor: color,
          borderColor: color,
          color: '#fff',
          borderRadius: '4px',
          padding: '0 3px',
          fontSize: '11px',
        },
      };
    }

    const base: Record<string, string> = {
      done: '#22c55e',
      'in-progress': '#3b82f6',
      pending: '#fb923c',
    };
    return {
      style: {
        backgroundColor: base[event.status],
        borderColor: base[event.status],
        color: '#fff',
        borderRadius: '4px',
        padding: '0 3px',
        fontSize: '11px',
      },
    };
  };

  const rangeLabel = useMemo(() => {
    const start = parseDueDate(rangeStart);
    const end = parseDueDate(rangeEnd);
    if (!start || !end) return null;
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  }, [rangeEnd, rangeStart]);

  return (
    <div className="rbc-wrapper">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 items-center">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Done (WO status 9)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> In Progress (WO open)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Pending (No WO)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" /> User Events
        </div>
        <div className="ml-auto flex items-center gap-2">
          {rangeLabel && (
            <Badge variant="secondary" className="text-xs">
              Showing {rangeLabel}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {loadedCount ?? events.length} jobs loaded
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[520px] text-muted-foreground text-sm">
          Loading schedule data…
        </div>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          view={view as typeof Views[keyof typeof Views]}
          onView={(nextView) => onViewChange(nextView as PmCalendarView)}
          date={date}
          onNavigate={onNavigate}
          onSelectEvent={(event) => {
            const selected = event as CalEvent;
            if (selected.kind === 'user-event') {
              onSelectUserEvent?.(selected.resource as CalibrationUserEvent);
            } else {
              onSelectItem?.(selected.resource as PmScheduleListItem);
            }
          }}
          style={{ height: 560 }}
          eventPropGetter={eventPropGetter}
          components={{ event: EventComponent as React.ComponentType<{ event: CalEvent }> }}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          popup
          showAllEvents={false}
        />
      )}
    </div>
  );
};

export default CalibrationBigCalendar;
