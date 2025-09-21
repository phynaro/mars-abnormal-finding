import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ticketService } from '@/services/ticketService';
import type { Ticket, UpdateTicketRequest } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';

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
  const { toast } = useToast();

  const [formData, setFormData] = useState<UpdateTicketRequest>({
    title: ticket.title,
    description: ticket.description,
    severity_level: ticket.severity_level,
    priority: ticket.priority,
    assigned_to: ticket.assigned_to,
    status_notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when ticket changes
  useEffect(() => {
    setFormData({
      title: ticket.title,
      description: ticket.description,
      severity_level: ticket.severity_level,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      status_notes: ''
    });
    setErrors({});
  }, [ticket]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.estimated_downtime_hours !== undefined && formData.estimated_downtime_hours < 0) {
      newErrors.estimated_downtime_hours = 'Estimated downtime cannot be negative';
    }

    if (formData.actual_downtime_hours !== undefined && formData.actual_downtime_hours < 0) {
      newErrors.actual_downtime_hours = 'Actual downtime cannot be negative';
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
      await ticketService.updateTicket(ticket.id, formData);
      toast({
        title: 'Success',
        description: 'Ticket updated successfully',
        variant: 'default'
      });
      
      onTicketUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update ticket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateTicketRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberInput = (field: keyof UpdateTicketRequest, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleInputChange(field, numValue);
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ticket #{ticket.ticket_number}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
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

          {/* Description */}
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

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority || ''}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Severity and Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity_level">Severity Level</Label>
              <Select
                value={formData.severity_level || ''}
                onValueChange={(value) => handleInputChange('severity_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To (User ID)</Label>
              <Input
                id="assigned_to"
                type="number"
                value={formData.assigned_to || ''}
                onChange={(e) => handleInputChange('assigned_to', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="User ID to assign ticket to"
              />
            </div>
          </div>

          {/* Downtime Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_downtime_hours">Estimated Downtime (hours)</Label>
              <Input
                id="estimated_downtime_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_downtime_hours || ''}
                onChange={(e) => handleNumberInput('estimated_downtime_hours', e.target.value)}
                placeholder="Estimated time to resolve"
                className={errors.estimated_downtime_hours ? 'border-red-500' : ''}
              />
              {errors.estimated_downtime_hours && <p className="text-sm text-red-500">{errors.estimated_downtime_hours}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_downtime_hours">Actual Downtime (hours)</Label>
              <Input
                id="actual_downtime_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.actual_downtime_hours || ''}
                onChange={(e) => handleNumberInput('actual_downtime_hours', e.target.value)}
                placeholder="Actual time taken to resolve"
                className={errors.actual_downtime_hours ? 'border-red-500' : ''}
              />
              {errors.actual_downtime_hours && <p className="text-sm text-red-500">{errors.actual_downtime_hours}</p>}
            </div>
          </div>

          {/* Status Notes */}
          <div className="space-y-2">
            <Label htmlFor="status_notes">Status Change Notes</Label>
            <Textarea
              id="status_notes"
              value={formData.status_notes || ''}
              onChange={(e) => handleInputChange('status_notes', e.target.value)}
              placeholder="Notes about status change (optional)"
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
