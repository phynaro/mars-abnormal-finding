import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import calibrationService from '@/services/calibrationService';
import type {
  CalibrationUserEvent,
  CalibrationUserEventCategoryOption,
  CalibrationUserEventUpsertPayload,
} from '@/services/calibrationService';
import type { Department } from '@/services/personnelService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventItem: CalibrationUserEvent | null;
  categories: CalibrationUserEventCategoryOption[];
  departments: Department[];
  users: Array<{ id: number; name: string }>;
  onSaved: () => void;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  plant_code: string;
  dept_no: string;
  assignee_id: string;
  color_hex: string;
  is_active: boolean;
}

function toDateTimeLocalValue(raw: string | null | undefined): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultFormState(): FormState {
  const now = new Date();
  const end = new Date(now);
  end.setHours(end.getHours() + 1);
  return {
    title: '',
    description: '',
    category: 'other',
    start_at: toDateTimeLocalValue(now.toISOString()),
    end_at: toDateTimeLocalValue(end.toISOString()),
    is_all_day: true,
    plant_code: 'all',
    dept_no: 'all',
    assignee_id: 'all',
    color_hex: '',
    is_active: true,
  };
}

const CalibrationUserEventModal: React.FC<Props> = ({
  open,
  onOpenChange,
  eventItem,
  categories,
  departments,
  users,
  onSaved,
}) => {
  const { toast } = useToast();
  const isEditMode = Boolean(eventItem);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (eventItem) {
      setForm({
        title: eventItem.title,
        description: eventItem.description ?? '',
        category: eventItem.category,
        start_at: toDateTimeLocalValue(eventItem.start_at),
        end_at: toDateTimeLocalValue(eventItem.end_at),
        is_all_day: eventItem.is_all_day,
        plant_code: eventItem.plant_code ?? 'all',
        dept_no: eventItem.dept_no != null ? String(eventItem.dept_no) : 'all',
        assignee_id: eventItem.assignee_id != null ? String(eventItem.assignee_id) : 'all',
        color_hex: eventItem.color_hex ?? '',
        is_active: eventItem.is_active,
      });
    } else {
      setForm(defaultFormState());
    }
    setError(null);
  }, [eventItem, open]);

  const categoryOptions = useMemo(
    () => (categories.length > 0 ? categories : [{ value: 'other', label: 'Other' }]),
    [categories],
  );

  const toPayload = (): CalibrationUserEventUpsertPayload => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    category: form.category as CalibrationUserEventUpsertPayload['category'],
    start_at: new Date(form.start_at).toISOString(),
    end_at: new Date(form.end_at).toISOString(),
    is_all_day: form.is_all_day,
    plant_code: form.plant_code === 'all' ? null : form.plant_code,
    dept_no: form.dept_no === 'all' ? null : parseInt(form.dept_no, 10),
    assignee_id: form.assignee_id === 'all' ? null : parseInt(form.assignee_id, 10),
    color_hex: form.color_hex.trim() || null,
    is_active: form.is_active,
  });

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.start_at || !form.end_at) return 'Start and end date/time are required';
    if (new Date(form.start_at) > new Date(form.end_at)) return 'End date/time must be after start date/time';
    if (form.color_hex.trim() && !/^#[0-9A-Fa-f]{6}$/.test(form.color_hex.trim())) return 'Color must be in #RRGGBB format';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = toPayload();
      if (isEditMode && eventItem) {
        await calibrationService.updateCalibrationUserEvent(eventItem.id, payload);
      } else {
        await calibrationService.createCalibrationUserEvent(payload);
      }

      toast({
        title: 'Success',
        description: `User event ${isEditMode ? 'updated' : 'created'} successfully`,
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user event';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!eventItem) return;
    if (!window.confirm(`Delete "${eventItem.title}"?`)) return;

    try {
      setDeleting(true);
      await calibrationService.deleteCalibrationUserEvent(eventItem.id);
      toast({
        title: 'Success',
        description: 'User event deleted successfully',
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user event';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User Event' : 'Create User Event'}</DialogTitle>
          <DialogDescription>
            Manage factory events such as shutdown, cleaning, inspection, or other user-defined calendar overlays.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Factory shutdown"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Optional details for the calendar event"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-color">Color</Label>
              <Input
                id="event-color"
                value={form.color_hex}
                onChange={(e) => setForm((prev) => ({ ...prev, color_hex: e.target.value }))}
                placeholder="#64748B"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Plant Scope</Label>
              <Select
                value={form.plant_code}
                onValueChange={(value) => setForm((prev) => ({ ...prev, plant_code: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plants</SelectItem>
                  <SelectItem value="PP">Pouch Plant</SelectItem>
                  <SelectItem value="DJ">Dry Jaroen</SelectItem>
                  <SelectItem value="DP">Dry Plant</SelectItem>
                  <SelectItem value="SN">Dry Sanook</SelectItem>
                  <SelectItem value="CT">Care & Treat</SelectItem>
                  <SelectItem value="PS">Positive Treat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department Scope</Label>
              <Select
                value={form.dept_no}
                onValueChange={(value) => setForm((prev) => ({ ...prev, dept_no: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.DEPTNO} value={String(dept.DEPTNO)}>
                      {dept.DEPTNAME}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee Scope</Label>
              <Select
                value={form.assignee_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, assignee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="event-all-day">All day</Label>
                <p className="text-xs text-muted-foreground">Show as a full-day calendar event</p>
              </div>
              <Switch
                id="event-all-day"
                checked={form.is_all_day}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_all_day: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="event-active">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive events stay in the list but do not show in the calendar overlay</p>
              </div>
              <Switch
                id="event-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {isEditMode && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving || deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CalibrationUserEventModal;
