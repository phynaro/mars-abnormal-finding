import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ticketClassService, type TicketClass } from '@/services/ticketClassService';
import { ticketService } from '@/services/ticketService';
import type { FailureMode, Ticket, UpdateTicketDetailRequest } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { timestampToDatetimeLocal } from '@/utils/timezone';

interface EditTicketModalProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated: () => void;
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [failureModes, setFailureModes] = useState<FailureMode[]>([]);
  const [ticketClasses, setTicketClasses] = useState<TicketClass[]>([]);
  const { toast } = useToast();
  const { language } = useLanguage();

  const [formData, setFormData] = useState({
    title: ticket.title ?? '',
    description: ticket.description ?? '',
    pucriticalno: ticket.pucriticalno?.toString() ?? '',
    schedule_start: ticket.schedule_start ? timestampToDatetimeLocal(ticket.schedule_start) : '',
    schedule_finish: ticket.schedule_finish ? timestampToDatetimeLocal(ticket.schedule_finish) : '',
    actual_start_at: ticket.actual_start_at ? timestampToDatetimeLocal(ticket.actual_start_at) : '',
    actual_finish_at: ticket.actual_finish_at ? timestampToDatetimeLocal(ticket.actual_finish_at) : '',
    satisfaction_rating: ticket.satisfaction_rating?.toString() ?? '',
    cost_avoidance: ticket.cost_avoidance?.toString() ?? '',
    downtime_avoidance_hours: ticket.downtime_avoidance_hours?.toString() ?? '',
    failure_mode_id: ticket.failure_mode_id?.toString() ?? 'none',
    ticketClass: ticket.ticketClass?.toString() ?? 'none',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when ticket changes
  useEffect(() => {
    setFormData({
      title: ticket.title ?? '',
      description: ticket.description ?? '',
      pucriticalno: ticket.pucriticalno?.toString() ?? '',
      schedule_start: ticket.schedule_start ? timestampToDatetimeLocal(ticket.schedule_start) : '',
      schedule_finish: ticket.schedule_finish ? timestampToDatetimeLocal(ticket.schedule_finish) : '',
      actual_start_at: ticket.actual_start_at ? timestampToDatetimeLocal(ticket.actual_start_at) : '',
      actual_finish_at: ticket.actual_finish_at ? timestampToDatetimeLocal(ticket.actual_finish_at) : '',
      satisfaction_rating: ticket.satisfaction_rating?.toString() ?? '',
      cost_avoidance: ticket.cost_avoidance?.toString() ?? '',
      downtime_avoidance_hours: ticket.downtime_avoidance_hours?.toString() ?? '',
      failure_mode_id: ticket.failure_mode_id?.toString() ?? 'none',
      ticketClass: ticket.ticketClass?.toString() ?? 'none',
    });
    setErrors({});
  }, [ticket]);

  useEffect(() => {
    if (!open) return;

    let isActive = true;
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [failureModeResponse, ticketClassResponse] = await Promise.all([
          ticketService.getFailureModes(),
          ticketClassService.getTicketClasses(),
        ]);

        if (!isActive) return;
        setFailureModes(failureModeResponse.data || []);
        setTicketClasses(ticketClassResponse || []);
      } catch (error) {
        if (!isActive) return;
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load edit options',
          variant: 'destructive'
        });
      } finally {
        if (isActive) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();
    return () => {
      isActive = false;
    };
  }, [open, toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.schedule_start && formData.schedule_finish && new Date(formData.schedule_start) > new Date(formData.schedule_finish)) {
      newErrors.schedule_finish = 'Schedule finish must be later than schedule start';
    }

    if (formData.actual_start_at && formData.actual_finish_at && new Date(formData.actual_start_at) > new Date(formData.actual_finish_at)) {
      newErrors.actual_finish_at = 'Actual finish must be later than actual start';
    }

    if (formData.satisfaction_rating) {
      const rating = Number(formData.satisfaction_rating);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        newErrors.satisfaction_rating = 'Satisfaction rating must be between 1 and 5';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const parseNullableInt = (value: string): number | null =>
        value === '' || value === 'none' ? null : parseInt(value, 10);
      const parseNullableNumber = (value: string): number | null =>
        value === '' ? null : Number(value);

      const payload: UpdateTicketDetailRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        pucriticalno: parseNullableInt(formData.pucriticalno),
        schedule_start: formData.schedule_start || null,
        schedule_finish: formData.schedule_finish || null,
        actual_start_at: formData.actual_start_at || null,
        actual_finish_at: formData.actual_finish_at || null,
        satisfaction_rating: parseNullableInt(formData.satisfaction_rating),
        cost_avoidance: parseNullableNumber(formData.cost_avoidance),
        downtime_avoidance_hours: parseNullableNumber(formData.downtime_avoidance_hours),
        failure_mode_id: parseNullableInt(formData.failure_mode_id),
        ticketClass: parseNullableInt(formData.ticketClass),
      };

      await ticketService.updateTicketDetail(ticket.id, payload);
      toast({
        title: 'Success',
        description: 'Ticket details updated successfully',
        variant: 'default'
      });
      
      onTicketUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ticket details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ticket #{ticket.ticket_number}</DialogTitle>
          <DialogDescription>
            L3/L4 users with permission on this PU can edit ticket details at any status.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of the abnormal finding"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the abnormal finding"
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pucriticalno">Critical Level</Label>
              <Input
                id="pucriticalno"
                type="number"
                min="1"
                value={formData.pucriticalno}
                onChange={(e) => handleInputChange('pucriticalno', e.target.value)}
                placeholder="Enter critical level"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketClass">Ticket Class</Label>
              <Select
                value={formData.ticketClass}
                onValueChange={(value) => handleInputChange('ticketClass', value)}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={optionsLoading ? 'Loading ticket classes...' : 'Select ticket class'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ticketClasses.map((ticketClass) => (
                    <SelectItem key={ticketClass.id} value={ticketClass.id.toString()}>
                      {language === 'en' ? ticketClass.name_en : ticketClass.name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule_start">Schedule Start</Label>
              <Input
                id="schedule_start"
                type="datetime-local"
                value={formData.schedule_start}
                onChange={(e) => handleInputChange('schedule_start', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_finish">Schedule Finish</Label>
              <Input
                id="schedule_finish"
                type="datetime-local"
                value={formData.schedule_finish}
                min={formData.schedule_start || undefined}
                onChange={(e) => handleInputChange('schedule_finish', e.target.value)}
              />
              {errors.schedule_finish && <p className="text-sm text-red-500">{errors.schedule_finish}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="actual_start_at">Actual Start</Label>
              <Input
                id="actual_start_at"
                type="datetime-local"
                value={formData.actual_start_at}
                onChange={(e) => handleInputChange('actual_start_at', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_finish_at">Actual Finish</Label>
              <Input
                id="actual_finish_at"
                type="datetime-local"
                value={formData.actual_finish_at}
                min={formData.actual_start_at || undefined}
                onChange={(e) => handleInputChange('actual_finish_at', e.target.value)}
              />
              {errors.actual_finish_at && <p className="text-sm text-red-500">{errors.actual_finish_at}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="satisfaction_rating">Satisfaction Rating</Label>
              <Input
                id="satisfaction_rating"
                type="number"
                min="1"
                max="5"
                value={formData.satisfaction_rating}
                onChange={(e) => handleInputChange('satisfaction_rating', e.target.value)}
                placeholder="1 - 5"
              />
              {errors.satisfaction_rating && <p className="text-sm text-red-500">{errors.satisfaction_rating}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="failure_mode_id">Failure Mode</Label>
              <Select
                value={formData.failure_mode_id}
                onValueChange={(value) => handleInputChange('failure_mode_id', value)}
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={optionsLoading ? 'Loading failure modes...' : 'Select failure mode'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {failureModes.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id.toString()}>
                      {mode.code} - {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost_avoidance">Cost Avoidance</Label>
              <Input
                id="cost_avoidance"
                type="number"
                step="0.01"
                value={formData.cost_avoidance}
                onChange={(e) => handleInputChange('cost_avoidance', e.target.value)}
                placeholder="Amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downtime_avoidance_hours">Downtime Avoidance Hours</Label>
              <Input
                id="downtime_avoidance_hours"
                type="number"
                step="0.01"
                value={formData.downtime_avoidance_hours}
                onChange={(e) => handleInputChange('downtime_avoidance_hours', e.target.value)}
                placeholder="Hours"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || optionsLoading}>
              {loading ? 'Updating...' : 'Update Ticket Details'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
