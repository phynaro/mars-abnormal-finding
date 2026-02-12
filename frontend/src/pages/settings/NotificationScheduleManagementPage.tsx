import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';
import { 
  Clock, 
  RefreshCw, 
  Play, 
  Edit2 
} from 'lucide-react';
import notificationScheduleService, { 
  type NotificationSchedule,
  type UpdateNotificationScheduleRequest 
} from '@/services/notificationScheduleService';

const TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' }
];

const getTimezoneOffsetString = (tz: string): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset'
  });
  const parts = formatter.formatToParts(new Date());
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart?.value) return '+07:00';
  const m = tzPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (m) {
    const sign = m[1];
    const h = m[2].padStart(2, '0');
    const mins = (m[3] ?? '00').padStart(2, '0');
    return `${sign}${h}:${mins}`;
  }
  return '+07:00';
};

const NotificationScheduleManagementPage: React.FC = () => {
  const { toast } = useToast();
  
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<NotificationSchedule | null>(null);
  
  const [formData, setFormData] = useState<UpdateNotificationScheduleRequest>({
    schedule_cron: '',
    timezone: 'Asia/Bangkok',
    is_enabled: true,
    description: ''
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await notificationScheduleService.getAll();
      if (response.success) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: NotificationSchedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      schedule_cron: schedule.schedule_cron,
      timezone: schedule.timezone,
      is_enabled: schedule.is_enabled,
      description: schedule.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSchedule) return;

    try {
      setLoading(true);
      await notificationScheduleService.update(selectedSchedule.id, formData);
      
      toast({
        title: 'Success',
        description: 'Notification schedule updated successfully'
      });
      
      setEditDialogOpen(false);
      await loadSchedules();
      
      // Note: The scheduled job will reload the schedule on the next server restart
      // or we could trigger a reload here if needed
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notification schedule',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!confirm('This will send test notifications to all users with pending tickets. Continue?')) {
      return;
    }

    try {
      setTesting(true);
      const response = await notificationScheduleService.test();
      
      toast({
        title: 'Success',
        description: `Test notification sent. ${response.data.sent} users notified.`
      });
      
      await loadSchedules(); // Refresh to get updated last_run
    } catch (error: any) {
      console.error('Error testing notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to test notification',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  /**
   * Format datetime for display. The API returns datetimes stored in the schedule's timezone
   * but serialized as UTC (e.g. 8 AM Bangkok becomes "08:00Z"). We re-interpret the UTC
   * parts as the schedule's local time so it displays correctly.
   */
  const formatDate = (dateString: string | null, scheduleTimezone: string = 'Asia/Bangkok') => {
    if (!dateString) return 'Never';
    const d = new Date(dateString);
    // Stored value is in schedule timezone but sent as UTC - use UTC components as local
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const sec = String(d.getUTCSeconds()).padStart(2, '0');
    const offset = getTimezoneOffsetString(scheduleTimezone);
    const asScheduleTz = `${y}-${m}-${day}T${h}:${min}:${sec}${offset}`;
    return new Date(asScheduleTz).toLocaleString('en-US', {
      timeZone: scheduleTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseCronExpression = (cron: string) => {
    // Simple parser for common cron patterns
    if (cron === '0 9 * * *') return 'Daily at 9:00 AM';
    if (cron === '0 8 * * *') return 'Daily at 8:00 AM';
    if (cron === '0 10 * * *') return 'Daily at 10:00 AM';
    if (cron === '0 */6 * * *') return 'Every 6 hours';
    if (cron === '0 0 * * *') return 'Daily at midnight';
    
    // Parse basic pattern
    const parts = cron.split(' ');
    if (parts.length >= 2) {
      const minuteM = parts[0];
      const hourM = parts[1];
      if (hourM !== '*' && minuteM === '0') {
        return `Daily at ${hourM}:00`;
      }
    }
    
    return cron;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Schedule Management</h1>
          <p className="text-muted-foreground">
            Configure scheduled LINE notifications for pending tickets
          </p>
        </div>
        
        <Button
          onClick={handleTest}
          disabled={testing}
          variant="default"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test Notification
            </>
          )}
        </Button>
      </div>

      {/* Current Configuration Card */}
      {loading && schedules.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Alert>
          <AlertDescription>
            No notification schedules found.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {schedule.notification_type}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                      {schedule.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
                {schedule.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {schedule.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Schedule</Label>
                    <p className="text-sm font-medium mt-1">
                      {parseCronExpression(schedule.schedule_cron)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cron: {schedule.schedule_cron}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timezone</Label>
                    <p className="text-sm font-medium mt-1">
                      {schedule.timezone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Run</Label>
                    <p className="text-sm font-medium mt-1">
                      {formatDate(schedule.last_run, schedule.timezone || 'Asia/Bangkok')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Next Run</Label>
                    <p className="text-sm font-medium mt-1">
                      {schedule.is_enabled ? formatDate(schedule.next_run, schedule.timezone || 'Asia/Bangkok') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notification Schedule</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cron">Cron Expression</Label>
              <Input
                id="cron"
                value={formData.schedule_cron}
                onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day month weekday (e.g., "0 9 * * *" for 9 AM daily)
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                Common examples:
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Daily at 9 AM: <code className="bg-muted px-1 rounded">0 9 * * *</code></li>
                  <li>Daily at 8 AM: <code className="bg-muted px-1 rounded">0 8 * * *</code></li>
                  <li>Every 6 hours: <code className="bg-muted px-1 rounded">0 */6 * * *</code></li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center justify-between py-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Notification</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_enabled 
                    ? 'Notifications will be sent according to the schedule'
                    : 'Notifications are disabled'}
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationScheduleManagementPage;

