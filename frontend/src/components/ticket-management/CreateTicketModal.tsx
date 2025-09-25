import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import type { CreateTicketRequest } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateTicketModalProps {
  onTicketCreated: () => void;
  trigger?: React.ReactNode;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ 
  onTicketCreated, 
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    pucode: '',
    severity_level: 'medium',
    priority: 'normal',
    cost_avoidance: undefined,
    downtime_avoidance_hours: undefined,
    failure_mode_id: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('ticket.titleRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('ticket.descriptionRequired');
    }

    if (!formData.pucode?.trim()) {
      newErrors.pucode = t('ticket.pucodeRequired');
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
      await ticketService.createTicket(formData);
      toast({
        title: t('common.success'),
        description: t('ticket.ticketCreatedSuccess'),
        variant: 'default'
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        pucode: '',
        severity_level: 'medium',
        priority: 'normal',
        cost_avoidance: undefined,
        downtime_avoidance_hours: undefined,
        failure_mode_id: 0
      });
      
      setErrors({});
      setOpen(false);
      onTicketCreated();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('ticket.failedToCreateTicket'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTicketRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('ticket.create')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('ticket.reportAbnormalFinding')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('ticket.title')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={t('ticket.briefDescription')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('ticket.description')} *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('ticket.detailedDescription')}
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* PUCODE */}
          <div className="space-y-2">
            <Label htmlFor="pucode">{t('ticket.pucode')} *</Label>
            <Input
              id="pucode"
              value={formData.pucode}
              onChange={(e) => handleInputChange('pucode', e.target.value)}
              placeholder="PLANT-AREA-LINE-MACHINE-NUMBER"
              className={errors.pucode ? 'border-red-500' : ''}
            />
            {errors.pucode && <p className="text-sm text-red-500">{errors.pucode}</p>}
          </div>

          {/* Severity and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity_level">{t('ticket.severity')}</Label>
              <Select
                value={formData.severity_level}
                onValueChange={(value) => handleInputChange('severity_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('ticket.low')}</SelectItem>
                  <SelectItem value="medium">{t('ticket.medium')}</SelectItem>
                  <SelectItem value="high">{t('ticket.high')}</SelectItem>
                  <SelectItem value="critical">{t('ticket.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('ticket.priority')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('ticket.low')}</SelectItem>
                  <SelectItem value="normal">{t('ticket.normal')}</SelectItem>
                  <SelectItem value="high">{t('ticket.high')}</SelectItem>
                  <SelectItem value="urgent">{t('ticket.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('ticket.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
