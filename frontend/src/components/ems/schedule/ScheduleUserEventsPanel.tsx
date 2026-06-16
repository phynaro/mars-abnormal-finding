import React, { useCallback, useEffect, useState } from 'react';

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';

import ScheduleUserEventModal from '@/components/ems/schedule/ScheduleUserEventModal';
import { UserEventColorSwatch } from '@/components/common/UserEventColorPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveUserEventColor } from '@/constants/userEventColors';
import { useToast } from '@/hooks/useToast';
import type {
  CalibrationUserEvent,
  CalibrationUserEventCategoryOption,
  CalibrationUserEventPagination,
} from '@/services/calibrationService';
import emsService from '@/services/emsService';
import personnelService, { type Department } from '@/services/personnelService';

import type { ScheduleFilters } from './ScheduleFilterBar';

const USER_EVENT_PAGE_SIZE = 20;

const emsUserEventApi = {
  createCalibrationUserEvent: (payload: Parameters<typeof emsService.createUserEvent>[0]) =>
    emsService.createUserEvent(payload),
  updateCalibrationUserEvent: (id: number, payload: Parameters<typeof emsService.updateUserEvent>[1]) =>
    emsService.updateUserEvent(id, payload),
  deleteCalibrationUserEvent: (id: number) => emsService.deleteUserEvent(id),
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

interface Props {
  filters: ScheduleFilters;
}

const ScheduleUserEventsPanel: React.FC<Props> = ({ filters }) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CalibrationUserEvent[]>([]);
  const [categories, setCategories] = useState<CalibrationUserEventCategoryOption[]>([]);
  const [pagination, setPagination] = useState<CalibrationUserEventPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalibrationUserEvent | null>(null);

  useEffect(() => {
    Promise.all([
      personnelService.getDepartments({ limit: 1000 }),
      emsService.getScheduleAssignees(),
    ])
      .then(([deptRes, assigneeRes]) => {
        if (deptRes.success) setDepartments(deptRes.data);
        if (assigneeRes.success) setUsers(assigneeRes.data.users ?? []);
      })
      .catch(() => {
        setDepartments([]);
        setUsers([]);
      });
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emsService.getUserEvents({
        page,
        limit: USER_EVENT_PAGE_SIZE,
        plant: filters.plant || undefined,
      });
      setItems(res.data.items ?? []);
      setCategories(res.data.categories ?? []);
      setPagination(res.data.pagination);
    } catch (e) {
      setItems([]);
      setPagination(null);
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters.plant, page, t, toast]);

  useEffect(() => {
    setPage(1);
  }, [filters.plant]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openCreate = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = (event: CalibrationUserEvent) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const deleteEvent = async (event: CalibrationUserEvent) => {
    if (!window.confirm(t('ems.schedule.userEvents.deleteConfirm', { title: event.title }))) return;
    try {
      await emsService.deleteUserEvent(event.id);
      toast({ title: t('common.success'), description: t('ems.schedule.userEvents.deleted') });
      loadEvents();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">{t('ems.schedule.userEventsTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('ems.schedule.userEventsDescription')}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('ems.schedule.userEventsCreate')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t('ems.schedule.userEventsEmpty')}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {t('ems.schedule.userEventsColColor')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t('ems.schedule.userEventsColTitle')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {t('ems.schedule.userEventsColCategory')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {t('ems.schedule.userEventsColRange')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t('ems.schedule.userEventsColScope')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {t('ems.schedule.userEventsColStatus')}
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                  {t('ems.schedule.userEventsColActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => {
                const eventColor = resolveUserEventColor(event.color_hex);
                return (
                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <UserEventColorSwatch color={eventColor} className="h-5 w-5" title={eventColor} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground max-w-md truncate" title={event.description}>
                          {event.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge variant="outline">{event.categoryLabel}</Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    <div>{formatDate(event.start_at)}</div>
                    <div className="text-muted-foreground">{formatDate(event.end_at)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {event.plant_label && (
                        <Badge variant="secondary" className="text-xs">
                          {event.plant_label}
                        </Badge>
                      )}
                      {event.dept_name && (
                        <Badge variant="secondary" className="text-xs">
                          {event.dept_name}
                        </Badge>
                      )}
                      {event.assignee_name && (
                        <Badge variant="secondary" className="text-xs">
                          {event.assignee_name}
                        </Badge>
                      )}
                      {!event.plant_label && !event.dept_name && !event.assignee_name && (
                        <span className="text-xs text-muted-foreground">{t('ems.schedule.userEventsGlobal')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge variant={event.is_active ? 'default' : 'secondary'}>
                      {event.is_active
                        ? t('ems.schedule.userEventsActive')
                        : t('ems.schedule.userEventsInactive')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(event)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEvent(event)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>
            {t('ems.schedule.userEventsPage', {
              page: pagination.page,
              total: pagination.totalPages,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ScheduleUserEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventItem={editingEvent}
        categories={categories}
        departments={departments}
        users={users}
        eventApi={emsUserEventApi}
        onSaved={() => {
          setModalOpen(false);
          loadEvents();
        }}
      />
    </div>
  );
};

export default ScheduleUserEventsPanel;
