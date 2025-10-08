import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';
import authService from '@/services/authService';

// Machine data type from PU table
interface PUCODEResult {
  PUCODE: string;
  PUDESC: string;
  PUNO: number; // Added PU ID
  PLANT: string;
  AREA: string;
  LINE: string;
  MACHINE: string;
  NUMBER: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

type StepKey = 'machine' | 'images' | 'title' | 'description' | 'severity_priority' | 'review';

const stepsOrder: StepKey[] = ['machine', 'images', 'title', 'description', 'severity_priority', 'review'];

// Step illustrations mapping
const stepIllustrations: Record<StepKey, string> = {
  machine: '/illustrations/machine.png',
  images: '/illustrations/images.png',
  title: '/illustrations/title.png',
  description: '/illustrations/description.png',
  severity_priority: '/illustrations/severity.png',
  review: '/illustrations/review.png',
};

const TicketCreateWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  // Machine selection state
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineSearchResults, setMachineSearchResults] = useState<PUCODEResult[]>([]);
  const [machineSearchLoading, setMachineSearchLoading] = useState(false);
  const [machineSearchDropdownOpen, setMachineSearchDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<PUCODEResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data state (mirrors CreateTicketRequest with extras)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pucode, setPucode] = useState('');
  const [puno, setPuno] = useState<number | undefined>(undefined);
  const [severity, setSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');

  // Images
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const previews = useMemo(() => beforeFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [beforeFiles]);
  useEffect(() => () => { previews.forEach(p => URL.revokeObjectURL(p.url)); }, [previews]);

  // Improved machine search function with better UX
  const searchMachines = async (query: string) => {
    if (query.length < 2) {
      setMachineSearchResults([]);
      setMachineSearchLoading(false);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setMachineSearchLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/pucode/search?search=${encodeURIComponent(query)}`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setMachineSearchResults(data.data || []);
        // Keep dropdown open if we have results or if user is still typing
        if (data.data && data.data.length > 0) {
          setMachineSearchDropdownOpen(true);
        }
      } else {
        setMachineSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching machines:', error);
      setMachineSearchResults([]);
      toast({
        title: 'Error',
        description: 'Failed to search machines. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMachineSearchLoading(false);
      setIsSearching(false);
    }
  };

  // Improved search with better debouncing and state management
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is too short, clear results immediately
    if (machineSearchQuery.length < 2) {
      setMachineSearchResults([]);
      setMachineSearchLoading(false);
      setIsSearching(false);
      return;
    }

    // Set searching state immediately for better UX
    setIsSearching(true);
    setMachineSearchDropdownOpen(true);

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(async () => {
      await searchMachines(machineSearchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [machineSearchQuery]);

  // Improved click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = target.closest('.search-dropdown');
      const input = target.closest('input');
      
      // Don't close if clicking on input or dropdown
      if (searchInputRef.current && !searchInputRef.current.contains(target) && !dropdown && !input) {
        setMachineSearchDropdownOpen(false);
      }
    };

    if (machineSearchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [machineSearchDropdownOpen]);

  // Machine selection handlers
  const onSelectMachine = (machine: PUCODEResult) => {
    setSelectedMachine(machine);
    setPucode(machine.PUCODE);
    setPuno(machine.PUNO);
    setMachineSearchQuery(machine.PUCODE);
    setMachineSearchDropdownOpen(false);
  };

  const clearMachineSelection = () => {
    setSelectedMachine(null);
    setMachineSearchQuery('');
    setMachineSearchResults([]);
    setPucode('');
    setPuno(undefined);
    setMachineSearchDropdownOpen(false);
    setIsSearching(false);
    setMachineSearchLoading(false);
  };

  const canNext = (): boolean => {
    const step = stepsOrder[currentIndex];
    switch (step) {
      case 'machine': return !!selectedMachine;
      case 'images': return beforeFiles.length > 0; // Force at least 1 image
      case 'title': return title.trim().length > 0;
      case 'description': return description.trim().length > 0;
      case 'severity_priority': return true; // Always valid
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
        puno: puno,
        severity_level: severity,
        priority,
      };
      const created = await ticketService.createTicket(payload);
      const ticketId = created.data.id;
      if (beforeFiles.length > 0) {
        setImagesUploading(true);
        try { 
          await ticketService.uploadTicketImages(ticketId, beforeFiles, 'before'); 
          
          // Trigger LINE notification after images are uploaded
          try {
            console.log('Ticket created with images - notifications handled automatically');
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
            console.log('Ticket created without images - notifications handled automatically');
        } catch (notificationError) {
          console.error('Failed to send LINE notification:', notificationError);
          // Don't fail the ticket creation if notification fails
        }
      }
      //toast({ title: t('common.success'), description: t('ticket.ticketCreatedSuccess') });
      navigate(`/tickets/${ticketId}`);
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('ticket.failedToCreateTicket'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const progress = Math.round(((currentIndex + 1) / stepsOrder.length) * 100);
  const step = stepsOrder[currentIndex];

  const StepIllustration: React.FC<{ step: StepKey }> = ({ step }) => (
    <div className="w-full flex justify-center mb-4">
      <img 
        src={stepIllustrations[step]} 
        alt={`${step} illustration`} 
        className="max-h-40 object-contain" 
      />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-4 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>{t('ticket.wizardBack')}</Button>
        <div className="text-sm text-gray-600 dark:text-gray-400">{currentIndex + 1} / {stepsOrder.length}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-6">
        <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <div className="background rounded-lg p-5 shadow border border-gray-200 dark:border-gray-800">
        {step === 'machine' && (
          <>
            <StepIllustration step="machine" />
            <Label htmlFor="machine-search" className="text-base font-semibold">{t('ticket.wizardSelectMachine')} *</Label>
            
            <div className="space-y-3 mt-4">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  id="machine-search"
                  value={machineSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMachineSearchQuery(value);
                    // Keep dropdown open while typing, but don't force it if query is too short
                    if (value.length >= 2) {
                      setMachineSearchDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (machineSearchQuery.length >= 2 || machineSearchResults.length > 0) {
                      setMachineSearchDropdownOpen(true);
                    }
                  }}
                  placeholder={t('ticket.wizardSelectMachine')}
                  className="pr-8"
                />
                {machineSearchDropdownOpen && (
                  <div className="search-dropdown absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {machineSearchLoading || isSearching ? (
                      <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        {t('common.loading')}
                      </div>
                    ) : machineSearchResults.length > 0 ? (
                      machineSearchResults.map((result, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="w-full text-left px-3 py-3 text-sm hover:bg-hover hover:text-hover-foreground border-b last:border-b-0 transition-colors"
                          onClick={() => onSelectMachine(result)}
                        >
                          <div className="font-medium text-base">{result.PUDESC}</div>
                          <div className="text-sm mt-1">{result.PUCODE}</div>
                        </button>
                      ))
                    ) : machineSearchQuery.length >= 2 ? (
                      <div className="p-3 text-sm text-gray-500">
                        No machines found for "{machineSearchQuery}"
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-gray-500">
                        Type at least 2 characters to search
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Machine Display */}
              {selectedMachine && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-sm font-medium text-green-800">Selected Machine</p>
                      </div>
                      <p className="text-sm text-green-700 mb-1">{selectedMachine.PUDESC}</p>
                      <p className="text-xs text-gray-500 mb-2">{selectedMachine.PUCODE}</p>
                     
                      {/* <div className="text-xs text-green-600">
                        {selectedMachine.PLANT} → {selectedMachine.AREA} → {selectedMachine.LINE} → {selectedMachine.MACHINE} → {selectedMachine.NUMBER}
                      </div> */}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearMachineSelection}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
            </div>
          </>
        )}

        {step === 'images' && (
          <>
            <StepIllustration step="images" />
            <Label htmlFor="img" className="text-base font-semibold">{t('ticket.wizardUploadImages')} *</Label>
            <div className="mt-4">
            <FileUpload 
              accept="image/*" 
              multiple 
              onChange={(files) => setBeforeFiles(Array.from(files || []))} 
              className="mb-3"
              placeholder={t('ticket.chooseFiles')}
            />
              {beforeFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {previews.map((p, idx) => (
                    <div key={idx} className="relative border rounded overflow-hidden">
                      <img src={p.url} alt={p.file.name} className="w-full h-32 object-cover" />
                      <button 
                        type="button" 
                        className="absolute top-1 right-1 bg-white/80 border rounded px-1 text-xs" 
                        onClick={() => setBeforeFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {t('ticket.wizardDragDropImages')}
              </p>
            </div>
          </>
        )}

        {step === 'title' && (
          <>
            <StepIllustration step="title" />
            <Label htmlFor="title" className="text-base font-semibold">{t('ticket.title')} *</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
             // placeholder={t('ticket.briefDescription')} 
              className="mt-4" 
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('ticket.briefDescription')}
            </p>
          </>
        )}

        {step === 'description' && (
          <>
            <StepIllustration step="description" />
            <Label htmlFor="desc" className="text-base font-semibold">{t('ticket.description')} *</Label>
            <Textarea 
              id="desc" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={5} 
             // placeholder={t('ticket.detailedDescription')} 
              className="mt-4" 
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('ticket.detailedDescription')}
            </p>
          </>
        )}

        {step === 'severity_priority' && (
          <>
            <StepIllustration step="severity_priority" />
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('ticket.severity')}</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger className="mt-2">
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
              
              <div>
                <Label className="text-base font-semibold">{t('ticket.priority')}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger className="mt-2">
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
          </>
        )}

        {step === 'review' && (
          <>
            <StepIllustration step="review" />
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.wizardSelectMachine')}:</span> 
                  <span className="font-medium font-mono">{selectedMachine?.PUCODE || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.machineName')}:</span> 
                  <span className="font-medium">{selectedMachine?.PUDESC || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.description')}:</span> 
                  <span className="font-medium">{description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.title')}:</span> 
                  <span className="font-medium">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.severity')}:</span> 
                  <span className="font-medium capitalize">{severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.priority')}:</span> 
                  <span className="font-medium capitalize">{priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.wizardUploadImages')}:</span> 
                  <span className="font-medium">{beforeFiles.length} photo(s)</span>
                </div>
              </div>
              
              {/* Image preview */}
              {beforeFiles.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">{t('ticket.wizardImagePreview')}:</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {previews.map((p, idx) => (
                      <div key={idx} className="relative border rounded overflow-hidden">
                        <img src={p.url} alt={p.file.name} className="w-full h-24 object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={currentIndex === 0}>{t('ticket.wizardPrevious')}</Button>
        {step !== 'review' ? (
          <Button onClick={next} disabled={!canNext()}>{t('ticket.wizardNext')}</Button>
        ) : (
          <Button onClick={submit} disabled={submitting || imagesUploading}>
            {submitting ? t('common.loading') : imagesUploading ? t('common.loading') : t('ticket.wizardFinish')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TicketCreateWizardPage;
