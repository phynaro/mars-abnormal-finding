import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatUITime, timestampToDatetimeLocal } from '@/utils/timezone';

const RESCHEDULE_REASON_CODES = [
  'waiting_part',
  'waiting_production_stop',
  'waiting_budget',
  'resource_not_cover',
  'delivery_time_change',
  'waiting_change_management',
] as const;

interface RescheduleDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled: () => void;
}

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  ticket,
  open,
  onOpenChange,
  onRescheduled,
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleFinish, setScheduleFinish] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScheduleStart(ticket.schedule_start ? timestampToDatetimeLocal(ticket.schedule_start) : '');
    setScheduleFinish(ticket.schedule_finish ? timestampToDatetimeLocal(ticket.schedule_finish) : '');
    setReasonCode('');
    setNote('');
    setError('');
  }, [open, ticket.schedule_start, ticket.schedule_finish]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const originalStart = ticket.schedule_start ? timestampToDatetimeLocal(ticket.schedule_start) : '';
    const originalFinish = ticket.schedule_finish ? timestampToDatetimeLocal(ticket.schedule_finish) : '';

    if (!scheduleStart || !scheduleFinish) {
      setError(t('ticket.rescheduleDatesRequired'));
      return;
    }
    if (new Date(scheduleStart) >= new Date(scheduleFinish)) {
      setError(t('ticket.rescheduleStartBeforeFinish'));
      return;
    }
    if (scheduleStart === originalStart && scheduleFinish === originalFinish) {
      setError(t('ticket.rescheduleNoChange'));
      return;
    }
    if (!reasonCode) {
      setError(t('ticket.rescheduleReasonRequired'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await ticketService.rescheduleTicket(ticket.id, {
        schedule_start: scheduleStart,
        schedule_finish: scheduleFinish,
        reason_code: reasonCode,
        note: note.trim() || undefined,
      });
      toast({
        title: t('ticket.rescheduleSuccess'),
        variant: 'default',
      });
      onOpenChange(false);
      onRescheduled();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t('ticket.rescheduleFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ticket.rescheduleTitle')}</DialogTitle>
          <DialogDescription>{t('ticket.rescheduleDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">{t('ticket.rescheduleCurrentStart')}</p>
              <p>{ticket.schedule_start ? formatUITime(ticket.schedule_start, language) : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('ticket.rescheduleCurrentFinish')}</p>
              <p>{ticket.schedule_finish ? formatUITime(ticket.schedule_finish, language) : '-'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule_start">{t('ticket.rescheduleNewStart')}</Label>
              <Input
                id="reschedule_start"
                type="datetime-local"
                value={scheduleStart}
                onChange={(event) => setScheduleStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule_finish">{t('ticket.rescheduleNewFinish')}</Label>
              <Input
                id="reschedule_finish"
                type="datetime-local"
                value={scheduleFinish}
                min={scheduleStart || undefined}
                onChange={(event) => setScheduleFinish(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('ticket.rescheduleReason')}</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder={t('ticket.rescheduleReason')} />
              </SelectTrigger>
              <SelectContent>
                {RESCHEDULE_REASON_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`ticket.reschedule.reason.${code}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule_note">{t('ticket.rescheduleNote')}</Label>
            <Textarea
              id="reschedule_note"
              value={note}
              maxLength={500}
              rows={3}
              placeholder={t('ticket.rescheduleNotePlaceholder')}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {t('ticket.rescheduleSubmit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
