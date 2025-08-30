import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest } from '@/services/ticketService';
import { machineService, type Machine } from '@/services/machineService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

const TicketCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [formData, setFormData] = useState<Pick<CreateTicketRequest, 'title' | 'description' | 'severity_level' | 'priority' | 'estimated_downtime_hours' | 'suggested_assignee_id'> & { machine_id?: number; affected_point_name?: string; suggested_assignee_name?: string }>({
    title: '',
    description: '',
    severity_level: 'medium',
    priority: 'normal',
    estimated_downtime_hours: undefined,
    machine_id: undefined,
    affected_point_name: undefined,
    suggested_assignee_id: undefined,
    suggested_assignee_name: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Machine search/dropdown state
  const [machineQuery, setMachineQuery] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
  const machineInputRef = useRef<HTMLInputElement | null>(null);

  // Image selection state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Assignee selection state (L2+ users)
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string; email?: string }>>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeInputRef = useRef<HTMLInputElement | null>(null);

  // Generate previews and revoke URLs on unmount/change
  const previews = useMemo(() => selectedFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [selectedFiles]);
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleNumberInput = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleInputChange(field, numValue as any);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.machine_id) newErrors.machine_id = 'Machine is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch machines when query changes (debounced)
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setMachinesLoading(true);
        const res = await machineService.getAllMachines(1, 20, machineQuery ? { search: machineQuery } : undefined);
        if (!cancelled) setMachines(res.data);
      } catch (e) {
        if (!cancelled) setMachines([]);
      } finally {
        if (!cancelled) setMachinesLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [machineQuery]);

  // Fetch L2+ assignees (supports optional ?search=, falls back to all)
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setAssigneesLoading(true);
        const res = await ticketService.getAvailableAssignees(assigneeQuery || undefined);
        if (!cancelled) setAssignees(res.data || []);
      } catch (e) {
        if (!cancelled) setAssignees([]);
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [assigneeQuery]);

  const onSelectMachine = (m: Machine) => {
    handleInputChange('machine_id', m.MachineID);
    handleInputChange('affected_point_name', m.MachineName);
    setMachineQuery(m.MachineName || String(m.MachineID));
    setMachineDropdownOpen(false);
  };

  const onSelectAssignee = (u: { id: number; name: string; email?: string }) => {
    handleInputChange('suggested_assignee_id', u.id as any);
    handleInputChange('suggested_assignee_name', u.name as any);
    setAssigneeQuery(u.name);
    setAssigneeDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      // Assemble payload. We skip showing affected_point_* in UI, but send them implicitly as required by backend.
      const payload: CreateTicketRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        machine_id: formData.machine_id,
        affected_point_type: 'machine',
        affected_point_name: formData.affected_point_name || 'Machine',
        severity_level: formData.severity_level,
        priority: formData.priority,
        estimated_downtime_hours: formData.estimated_downtime_hours,
        ...(formData.suggested_assignee_id ? { suggested_assignee_id: formData.suggested_assignee_id } : {}),
      };

      const createRes = await ticketService.createTicket(payload);
      const ticketId = createRes.data.id;

      // Upload images if any, with image_type = 'before'
      if (selectedFiles.length > 0) {
        setImagesUploading(true);
        try {
          await ticketService.uploadTicketImages(ticketId, selectedFiles, 'before');
        } finally {
          setImagesUploading(false);
        }
      }

      toast({ title: 'Success', description: 'Ticket created successfully' });
      navigate(`/tickets/${ticketId}`);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create ticket', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Create Ticket</h1>
        <Button variant="outline" onClick={() => navigate('/tickets')}>Cancel</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Abnormal Finding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                rows={5}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the abnormal finding in detail"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Machine selector (searchable) */}
            <div className="space-y-2">
              <Label htmlFor="machine">Machine *</Label>
              <div className="relative">
                <Input
                  id="machine"
                  ref={machineInputRef}
                  value={machineQuery}
                  onChange={(e) => { setMachineQuery(e.target.value); setMachineDropdownOpen(true); }}
                  onFocus={() => setMachineDropdownOpen(true)}
                  placeholder="Search machine by name/code"
                  className={errors.machine_id ? 'border-red-500' : ''}
                />
                {/* Dropdown */}
                {machineDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {machinesLoading ? (
                      <div className="p-3 text-sm text-gray-500">Searching…</div>
                    ) : machines.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No machines found</div>
                    ) : (
                      machines.map((m) => (
                        <button
                          type="button"
                          key={m.MachineID}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => onSelectMachine(m)}
                        >
                          <div className="font-medium">{m.MachineName}</div>
                          <div className="text-xs text-gray-500">{m.MachineCode} • {m.Location || m.Department || m.MachineType}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {formData.machine_id && (
                <div className="text-xs text-gray-600">Selected: {formData.affected_point_name} (ID: {formData.machine_id})</div>
              )}
              {errors.machine_id && <p className="text-sm text-red-500">{errors.machine_id}</p>}
            </div>

            {/* Severity & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity_level">Severity</Label>
                <Select value={formData.severity_level} onValueChange={(v) => handleInputChange('severity_level', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={formData.priority} onValueChange={(v) => handleInputChange('priority', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                value={formData.estimated_downtime_hours ?? ''}
                onChange={(e) => handleNumberInput('estimated_downtime_hours', e.target.value)}
                placeholder="e.g. 1.5"
              />
            </div>

            {/* Suggested Assignee (optional, L2+) */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Suggest Assignee (optional)</Label>
              <div className="relative">
                <Input
                  id="assignee"
                  ref={assigneeInputRef}
                  value={assigneeQuery}
                  onChange={(e) => { setAssigneeQuery(e.target.value); setAssigneeDropdownOpen(true); }}
                  onFocus={() => setAssigneeDropdownOpen(true)}
                  placeholder="Search L2 engineer by name/email"
                />
                {assigneeDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {assigneesLoading ? (
                      <div className="p-3 text-sm text-gray-500">Searching…</div>
                    ) : assignees.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No assignees found</div>
                    ) : (
                      assignees.map((u) => (
                        <button
                          type="button"
                          key={u.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => onSelectAssignee(u)}
                        >
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {formData.suggested_assignee_id && (
                <div className="text-xs text-gray-600">Selected: {formData.suggested_assignee_name} (ID: {formData.suggested_assignee_id})</div>
              )}
            </div>

            {/* Attach images (before) */}
            <div className="space-y-2">
              <Label htmlFor="images">Attach Images (Before)</Label>
              <Input id="images" type="file" accept="image/*" multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
              {selectedFiles.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Selected: {selectedFiles.length} file(s)</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFiles([])} disabled={imagesUploading}>Clear</Button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {previews.map((p, idx) => (
                      <div key={idx} className="relative border rounded overflow-hidden">
                        <img src={p.url} alt={p.file.name} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-white/80 border rounded px-1 text-xs"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={imagesUploading}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">Images upload after ticket creation. Type is set to "before".</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/tickets')} disabled={submitting || imagesUploading}>Cancel</Button>
              <Button type="submit" disabled={submitting || imagesUploading}>
                {submitting ? 'Creating…' : imagesUploading ? 'Uploading images…' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketCreatePage;
