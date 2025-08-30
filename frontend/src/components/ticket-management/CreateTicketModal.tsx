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

  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    affected_point_type: 'machine',
    affected_point_name: '',
    severity_level: 'medium',
    priority: 'normal',
    estimated_downtime_hours: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.affected_point_name.trim()) {
      newErrors.affected_point_name = 'Affected point name is required';
    }

    if (formData.estimated_downtime_hours !== undefined && formData.estimated_downtime_hours < 0) {
      newErrors.estimated_downtime_hours = 'Estimated downtime cannot be negative';
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
        title: 'Success',
        description: 'Ticket created successfully',
        variant: 'default'
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        affected_point_type: 'machine',
        affected_point_name: '',
        severity_level: 'medium',
        priority: 'normal',
        estimated_downtime_hours: undefined
      });
      
      setErrors({});
      setOpen(false);
      onTicketCreated();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ticket',
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

  const handleNumberInput = (field: keyof CreateTicketRequest, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleInputChange(field, numValue);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Abnormal Finding</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
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
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the abnormal finding, including symptoms and observations"
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Affected Point Type and Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affected_point_type">Affected Point Type</Label>
              <Select
                value={formData.affected_point_type}
                onValueChange={(value) => handleInputChange('affected_point_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affected_point_name">Affected Point Name *</Label>
              <Input
                id="affected_point_name"
                value={formData.affected_point_name}
                onChange={(e) => handleInputChange('affected_point_name', e.target.value)}
                placeholder="Name of the affected machine/area/equipment"
                className={errors.affected_point_name ? 'border-red-500' : ''}
              />
              {errors.affected_point_name && <p className="text-sm text-red-500">{errors.affected_point_name}</p>}
            </div>
          </div>

          {/* Severity and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity_level">Severity Level</Label>
              <Select
                value={formData.severity_level}
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
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
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

          {/* Estimated Downtime */}
          <div className="space-y-2">
            <Label htmlFor="estimated_downtime_hours">Estimated Downtime (hours)</Label>
            <Input
              id="estimated_downtime_hours"
              type="number"
              step="0.5"
              min="0"
              value={formData.estimated_downtime_hours || ''}
              onChange={(e) => handleNumberInput('estimated_downtime_hours', e.target.value)}
              placeholder="Estimated time to resolve (optional)"
              className={errors.estimated_downtime_hours ? 'border-red-500' : ''}
            />
            {errors.estimated_downtime_hours && <p className="text-sm text-red-500">{errors.estimated_downtime_hours}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
