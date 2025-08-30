import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest } from '@/services/ticketService';
import { machineService, type Machine } from '@/services/machineService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';

// Simple illustration fallback
const defaultIllustration = '/vector.png';

type StepKey = 'title' | 'description' | 'machine' | 'severity' | 'priority' | 'downtime' | 'images' | 'review';

const stepsOrder: StepKey[] = ['title','description','machine','severity','priority','downtime','images','review'];

const TicketCreateWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  // Data state (mirrors CreateTicketRequest with extras)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [machineId, setMachineId] = useState<number | undefined>(undefined);
  const [machineName, setMachineName] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');
  const [downtime, setDowntime] = useState<number | undefined>(undefined);

  // Images
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const previews = useMemo(() => beforeFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [beforeFiles]);
  useEffect(() => () => { previews.forEach(p => URL.revokeObjectURL(p.url)); }, [previews]);

  // Machine search
  const [machineQuery, setMachineQuery] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machineOpen, setMachineOpen] = useState(false);
  const machineInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setMachinesLoading(true);
        const res = await machineService.getAllMachines(1, 10, machineQuery ? { search: machineQuery } : undefined);
        if (!cancelled) setMachines(res.data);
      } catch {
        if (!cancelled) setMachines([]);
      } finally {
        if (!cancelled) setMachinesLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [machineQuery]);

  const canNext = (): boolean => {
    const step = stepsOrder[currentIndex];
    switch (step) {
      case 'title': return title.trim().length > 0;
      case 'description': return description.trim().length > 0;
      case 'machine': return !!machineId;
      default: return true;
    }
  };

  const next = () => setCurrentIndex((i) => Math.min(i + 1, stepsOrder.length - 1));
  const back = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const submittingRef = useRef(false);
  const submit = async () => {
    if (submittingRef.current) return; // guard against double taps
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload: CreateTicketRequest = {
        title: title.trim(),
        description: description.trim(),
        machine_id: machineId,
        affected_point_type: 'machine',
        affected_point_name: machineName || 'Machine',
        severity_level: severity,
        priority,
        estimated_downtime_hours: downtime,
      };
      const created = await ticketService.createTicket(payload);
      const ticketId = created.data.id;
      if (beforeFiles.length > 0) {
        setImagesUploading(true);
        try { await ticketService.uploadTicketImages(ticketId, beforeFiles, 'before'); } finally { setImagesUploading(false); }
      }
      toast({ title: 'Success', description: 'Ticket created successfully' });
      navigate(`/tickets/${ticketId}`);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to create ticket', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const progress = Math.round(((currentIndex + 1) / stepsOrder.length) * 100);
  const step = stepsOrder[currentIndex];

  const StepIllustration: React.FC<{ src?: string; alt?: string }> = ({ src, alt }) => (
    <div className="w-full flex justify-center mb-4">
      <img src={src || defaultIllustration} alt={alt || 'illustration'} className="max-h-40 object-contain" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        <div className="text-sm text-gray-600 dark:text-gray-400">{currentIndex + 1} / {stepsOrder.length}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-6">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 shadow border border-gray-200 dark:border-gray-800">
        {step === 'title' && (
          <>
            <StepIllustration />
            <Label htmlFor="title">What’s the issue title?</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Abnormal vibration" className="mt-2" />
          </>
        )}

        {step === 'description' && (
          <>
            <StepIllustration />
            <Label htmlFor="desc">Describe what you observed</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Provide details, symptoms, conditions…" className="mt-2" />
          </>
        )}

        {step === 'machine' && (
          <>
            <StepIllustration />
            <Label htmlFor="machine">Which machine is affected?</Label>
            <div className="relative mt-2">
              <Input
                id="machine"
                ref={machineInputRef}
                value={machineQuery}
                onChange={(e) => { setMachineQuery(e.target.value); setMachineOpen(true); }}
                onFocus={() => setMachineOpen(true)}
                placeholder="Search machine by name/code"
              />
              {machineOpen && (
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
                        onClick={() => { setMachineId(m.MachineID); setMachineName(m.MachineName); setMachineQuery(m.MachineName); setMachineOpen(false); }}
                      >
                        <div className="font-medium">{m.MachineName}</div>
                        <div className="text-xs text-gray-500">{m.MachineCode} • {m.Location || m.Department || m.MachineType}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {machineId && (
                <div className="text-xs text-gray-600 mt-2">Selected: {machineName} (ID: {machineId})</div>
              )}
            </div>
          </>
        )}

        {step === 'severity' && (
          <>
            <StepIllustration />
            <Label>How severe is it?</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {step === 'priority' && (
          <>
            <StepIllustration />
            <Label>How urgent is it?</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {step === 'downtime' && (
          <>
            <StepIllustration />
            <Label htmlFor="dt">Estimated downtime (hours)</Label>
            <Input id="dt" type="number" step="0.5" min="0" value={downtime ?? ''} onChange={(e) => setDowntime(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="mt-2" placeholder="Optional" />
          </>
        )}

        {step === 'images' && (
          <>
            <StepIllustration />
            <Label htmlFor="img">Add photos (before)</Label>
            <Input id="img" type="file" accept="image/*" multiple onChange={(e) => setBeforeFiles(Array.from(e.target.files || []))} className="mt-2" />
            {beforeFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative border rounded overflow-hidden">
                    <img src={p.url} alt={p.file.name} className="w-full h-24 object-cover" />
                    <button type="button" className="absolute top-1 right-1 bg-white/80 border rounded px-1 text-xs" onClick={() => setBeforeFiles(prev => prev.filter((_, i) => i !== idx))}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'review' && (
          <>
            <StepIllustration />
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Title:</span> <span className="font-medium">{title}</span></div>
              <div><span className="text-gray-500">Description:</span> <span className="font-medium whitespace-pre-wrap">{description}</span></div>
              <div><span className="text-gray-500">Machine:</span> <span className="font-medium">{machineName || '-'}</span></div>
              <div><span className="text-gray-500">Severity:</span> <span className="font-medium capitalize">{severity}</span></div>
              <div><span className="text-gray-500">Priority:</span> <span className="font-medium capitalize">{priority}</span></div>
              <div><span className="text-gray-500">Est. Downtime:</span> <span className="font-medium">{downtime ?? '-'}</span></div>
              <div><span className="text-gray-500">Images:</span> <span className="font-medium">{beforeFiles.length}</span></div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={currentIndex === 0}>Back</Button>
        {step !== 'review' ? (
          <Button onClick={next} disabled={!canNext()}>Next</Button>
        ) : (
          <Button onClick={submit} disabled={submitting || imagesUploading}>{submitting ? 'Creating…' : imagesUploading ? 'Uploading…' : 'Submit'}</Button>
        )}
      </div>
    </div>
  );
};

export default TicketCreateWizardPage;
