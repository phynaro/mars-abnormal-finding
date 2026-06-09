import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import CalibrationBigCalendar from '@/components/dashboard/calibration/CalibrationBigCalendar';
import CalibrationUserEventModal from '@/components/dashboard/calibration/CalibrationUserEventModal';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  CalibrationUserEvent,
  CalibrationUserEventCategoryOption,
  PmCalendarView,
  PmScheduleListItem,
} from '@/services/calibrationService';
import emsService from '@/services/emsService';
import personnelService, { type Department } from '@/services/personnelService';
import { getCalendarVisibleRange, toIsoDate } from '@/utils/emsScheduleCalendar';

import type { ScheduleFilters } from './ScheduleFilterBar';

const emsUserEventApi = {
  createCalibrationUserEvent: (payload: Parameters<typeof emsService.createUserEvent>[0]) =>
    emsService.createUserEvent(payload),
  updateCalibrationUserEvent: (id: number, payload: Parameters<typeof emsService.updateUserEvent>[1]) =>
    emsService.updateUserEvent(id, payload),
  deleteCalibrationUserEvent: (id: number) => emsService.deleteUserEvent(id),
};

const EMPTY_SCHEDULE_FILTERS: ScheduleFilters = {
  plant: '',
  area: '',
  woStatus: '',
  dueFrom: '',
  dueTo: '',
};

interface Props {
  filters?: ScheduleFilters;
  anchorDate?: Date;
  controlledMonth?: boolean;
  showHeader?: boolean;
}

const ScheduleCalendarPanel: React.FC<Props> = ({
  filters: filtersProp,
  anchorDate,
  controlledMonth = false,
  showHeader = true,
}) => {
  const filters = filtersProp ?? EMPTY_SCHEDULE_FILTERS;
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [calendarView, setCalendarView] = useState<PmCalendarView>('month');
  const [calendarDate, setCalendarDate] = useState(() =>
    anchorDate ? startOfMonth(anchorDate) : new Date()
  );

  useEffect(() => {
    if (anchorDate) {
      setCalendarDate(startOfMonth(anchorDate));
    }
  }, [anchorDate]);

  useEffect(() => {
    if (controlledMonth) {
      setCalendarView('month');
    }
  }, [controlledMonth]);

  const handleNavigate = useCallback(
    (date: Date) => {
      if (controlledMonth && anchorDate) {
        setCalendarDate(startOfMonth(anchorDate));
        return;
      }
      setCalendarDate(date);
    },
    [anchorDate, controlledMonth]
  );

  const allowedViews = useMemo<PmCalendarView[]>(
    () => (controlledMonth ? ['month'] : ['month', 'week', 'agenda']),
    [controlledMonth]
  );
  const [items, setItems] = useState<PmScheduleListItem[]>([]);
  const [userEvents, setUserEvents] = useState<CalibrationUserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeInfo, setRangeInfo] = useState({ rangeStart: '', rangeEnd: '', count: 0 });
  const [categories, setCategories] = useState<CalibrationUserEventCategoryOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalibrationUserEvent | null>(null);

  useEffect(() => {
    Promise.all([
      personnelService.getDepartments({ limit: 1000 }),
      emsService.getScheduleAssignees(),
      emsService.getUserEvents({ limit: 1 }),
    ])
      .then(([deptRes, assigneeRes, eventsRes]) => {
        if (deptRes.success) setDepartments(deptRes.data);
        if (assigneeRes.success) setUsers(assigneeRes.data.users ?? []);
        setCategories(eventsRes.data.categories ?? []);
      })
      .catch(() => {
        setDepartments([]);
        setUsers([]);
      });
  }, []);

  const fetchCalendar = useCallback(async () => {
    const visibleRange = getCalendarVisibleRange(calendarView, calendarDate);
    setLoading(true);
    try {
      const [pmRes, eventRes] = await Promise.all([
        emsService.getScheduleCalendarRange({
          viewStartDate: toIsoDate(visibleRange.start),
          viewEndDate: toIsoDate(visibleRange.end),
          plant: filters.plant || undefined,
          area: filters.area || undefined,
          woStatus: filters.woStatus || undefined,
        }),
        emsService.getUserEventsForCalendarRange({
          viewStartDate: toIsoDate(visibleRange.start),
          viewEndDate: toIsoDate(visibleRange.end),
          plant: filters.plant || undefined,
        }),
      ]);

      setItems(pmRes.data.items ?? []);
      setUserEvents(eventRes.data.items ?? []);
      setRangeInfo({
        rangeStart: pmRes.data.rangeStart,
        rangeEnd: pmRes.data.rangeEnd,
        count: pmRes.data.count,
      });
    } catch {
      setItems([]);
      setUserEvents([]);
      setRangeInfo({ rangeStart: '', rangeEnd: '', count: 0 });
    } finally {
      setLoading(false);
    }
  }, [calendarDate, calendarView, filters.area, filters.plant, filters.woStatus]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleSelectPm = (item: PmScheduleListItem) => {
    const tagNo = item.EQCODE || item.PMCODE;
    if (tagNo) {
      navigate(`/ems/equipment/${encodeURIComponent(tagNo)}`);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h2 className="text-base font-semibold">{t('ems.schedule.calendarTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('ems.schedule.calendarDescription')}</p>
        </div>
      )}
      <CalibrationBigCalendar
        items={items}
        userEvents={userEvents}
        loading={loading}
        view={controlledMonth ? 'month' : calendarView}
        date={calendarDate}
        onViewChange={controlledMonth ? () => undefined : setCalendarView}
        onNavigate={handleNavigate}
        onSelectItem={handleSelectPm}
        onSelectUserEvent={(event) => {
          setEditingEvent(event);
          setEventModalOpen(true);
        }}
        rangeStart={rangeInfo.rangeStart}
        rangeEnd={rangeInfo.rangeEnd}
        loadedCount={rangeInfo.count}
        allowedViews={allowedViews}
        toolbar={!controlledMonth}
      />

      <CalibrationUserEventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        eventItem={editingEvent}
        categories={categories}
        departments={departments}
        users={users}
        eventApi={emsUserEventApi}
        onSaved={() => {
          setEventModalOpen(false);
          fetchCalendar();
        }}
      />
    </div>
  );
};

export default ScheduleCalendarPanel;
