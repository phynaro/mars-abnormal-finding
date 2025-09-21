import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';

// Simple illustration fallback
const defaultIllustration = '/vector.png';

type StepKey = 'title' | 'description' | 'pucode' | 'severity' | 'priority' | 'assignee' | 'images' | 'review';

const stepsOrder: StepKey[] = ['title','description','pucode','severity','priority','assignee','images','review'];

// Optional: per-step illustration mapping. Replace paths to change images.
const illustrations: Record<StepKey, string> = {
  title: '/illustrations/title.png',
  description: '/illustrations/description.png',
  pucode: '/illustrations/machine.png',
  severity: '/illustrations/severity.png',
  priority: '/illustrations/priority.png',
  assignee: '/illustrations/assignee.png',
  images: '/illustrations/images.png',
  review: '/illustrations/review.png',
};

const TicketCreateWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  // Data state (mirrors CreateTicketRequest with extras)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pucode, setPucode] = useState('');
  const [severity, setSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [assigneeName, setAssigneeName] = useState<string | undefined>(undefined);

  // Images
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const previews = useMemo(() => beforeFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [beforeFiles]);
  useEffect(() => () => { previews.forEach(p => URL.revokeObjectURL(p.url)); }, [previews]);

  // Assignee search
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string; email?: string }>>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setAssigneesLoading(true);
        const res = await ticketService.getAvailableAssignees(assigneeQuery || undefined);
        if (!cancelled) setAssignees(res.data || []);
      } catch {
        if (!cancelled) setAssignees([]);
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [assigneeQuery]);

  const canNext = (): boolean => {
    const step = stepsOrder[currentIndex];
    switch (step) {
      case 'title': return title.trim().length > 0;
      case 'description': return description.trim().length > 0;
      case 'pucode': return pucode.trim().length > 0;
      case 'assignee': return !!assigneeId;
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
        pucode: pucode.trim(),
        severity_level: severity,
        priority,
        suggested_assignee_id: assigneeId,
      };
      const created = await ticketService.createTicket(payload);
      const ticketId = created.data.id;
      if (beforeFiles.length > 0) {
        setImagesUploading(true);
        try { 
          await ticketService.uploadTicketImages(ticketId, beforeFiles, 'before'); 
          
          // Trigger LINE notification after images are uploaded
          try {
            await ticketService.triggerTicketNotification(ticketId);
            console.log('LINE notification sent with images');
          } catch (notificationError) {
            console.error('Failed to send LINE notification:', notificationError);
            // Don't fail the ticket creation if notification fails
          }
        } finally { 
          setImagesUploading(false); 
        }
      } else {
        // If no images, trigger notification immediately
        try {
          await ticketService.triggerTicketNotification(ticketId);
          console.log('LINE notification sent without images');
        } catch (notificationError) {
          console.error('Failed to send LINE notification:', notificationError);
          // Don't fail the ticket creation if notification fails
        }
      }
      //toast({ title: 'Success', description: 'Ticket created successfully' });
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
        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <div className="background rounded-lg p-5 shadow border border-gray-200 dark:border-gray-800">
        {step === 'title' && (
          <>
            <StepIllustration src={illustrations.title} />
            <Label htmlFor="title">What’s the issue title?</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Abnormal vibration" className="mt-2" />
          </>
        )}

        {step === 'description' && (
          <>
            <StepIllustration src={illustrations.description} />
            <Label htmlFor="desc">Describe what you observed</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Provide details, symptoms, conditions…" className="mt-2" />
          </>
        )}

        {step === 'pucode' && (
          <>
            <StepIllustration src={illustrations.pucode} />
            <Label htmlFor="pucode">What's the PUCODE?</Label>
            <Input 
              id="pucode" 
              value={pucode} 
              onChange={(e) => setPucode(e.target.value)} 
              placeholder="PLANT-AREA-LINE-MACHINE-NUMBER" 
              className="mt-2" 
            />
            <div className="text-xs text-gray-500 mt-1">
              Format: PLANT-AREA-LINE-MACHINE-NUMBER
            </div>
          </>
        )}

        {step === 'severity' && (
          <>
            <StepIllustration src={illustrations.severity} />
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
            <StepIllustration src={illustrations.priority} />
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

        {step === 'assignee' && (
          <>
            <StepIllustration src={illustrations.assignee} />
            <Label htmlFor="assignee">Who should handle this?</Label>
            <div className="mt-2 relative">
              <Input
                id="assignee"
                ref={assigneeInputRef}
                placeholder={assigneeName || 'Search name or email'}
                value={assigneeQuery}
                onChange={(e) => { setAssigneeQuery(e.target.value); setAssigneeOpen(true); }}
                onFocus={() => setAssigneeOpen(true)}
              />
              {assigneeOpen && (
                <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow max-h-56 overflow-auto">
                  {assigneesLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading...</div>
                  ) : assignees.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No results</div>
                  ) : (
                    assignees.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => { setAssigneeId(a.id); setAssigneeName(a.name); setAssigneeQuery(a.name); setAssigneeOpen(false); }}
                      >
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-gray-500">{a.email || ''}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {assigneeId && (
                <div className="text-xs text-gray-600 mt-2">Selected: {assigneeName} (ID: {assigneeId})</div>
              )}
            </div>
          </>
        )}

        {step === 'images' && (
          <>
            <StepIllustration src={illustrations.images} />
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
            <StepIllustration src={illustrations.review} />
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Title:</span> <span className="font-medium">{title}</span></div>
              <div><span className="text-gray-500">Description:</span> <span className="font-medium whitespace-pre-wrap">{description}</span></div>
              <div><span className="text-gray-500">PUCODE:</span> <span className="font-medium font-mono">{pucode || '-'}</span></div>
              <div><span className="text-gray-500">Severity:</span> <span className="font-medium capitalize">{severity}</span></div>
              <div><span className="text-gray-500">Priority:</span> <span className="font-medium capitalize">{priority}</span></div>
              <div><span className="text-gray-500">Assignee:</span> <span className="font-medium">{assigneeName || '-'}</span></div>
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
