import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest, type Equipment } from '@/services/ticketService';
import { hierarchyService, type PUCritical } from '@/services/hierarchyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Search, Building2 } from 'lucide-react';
import authService from '@/services/authService';
import { compressTicketImage, formatFileSize, compressImage } from '@/utils/imageCompression';
import HierarchicalMachineSelector from '@/components/tickets/HierarchicalMachineSelector';

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
  PUCRITICALNO: number; // Added Critical Level
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
  const [submitProgress, setSubmitProgress] = useState<{
    stage: 'creating' | 'compressing' | 'uploading' | 'complete' | null;
    currentImage?: number;
    totalImages?: number;
    message: string;
  }>({ stage: null, message: '' });

  // Machine selection state
  const [selectionMode, setSelectionMode] = useState<'search' | 'hierarchy'>('hierarchy');
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineSearchResults, setMachineSearchResults] = useState<PUCODEResult[]>([]);
  const [machineSearchLoading, setMachineSearchLoading] = useState(false);
  const [machineSearchDropdownOpen, setMachineSearchDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<PUCODEResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextSearchRef = useRef(false);

  // Data state (mirrors CreateTicketRequest with extras)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pucode, setPucode] = useState('');
  const [puno, setPuno] = useState<number | undefined>(undefined);
  const [pucriticalno, setPucriticalno] = useState<number | undefined>(undefined);
  const [severity, setSeverity] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');

  // Equipment selection state
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [redirectTicketId, setRedirectTicketId] = useState<number | null>(null);

  // Critical levels state
  const [criticalLevels, setCriticalLevels] = useState<PUCritical[]>([]);
  const [criticalLevelsLoading, setCriticalLevelsLoading] = useState(false);

  // Images
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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
    // Skip search if this is a programmatic update (e.g., after machine selection)
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

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

  // Load equipment when machine is selected
  useEffect(() => {
    if (selectedMachine) {
      loadEquipment();
    } else {
      setEquipmentList([]);
      setSelectedEquipment(null);
    }
  }, [selectedMachine]);

  // Load critical levels on component mount
  useEffect(() => {
    loadCriticalLevels();
  }, []);

  // Load critical levels function
  const loadCriticalLevels = async () => {
    try {
      setCriticalLevelsLoading(true);
      const response = await hierarchyService.getPUCriticalLevels();
      if (response.success) {
        setCriticalLevels(response.data || []);
      }
    } catch (error) {
      console.error('Error loading critical levels:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load critical levels',
        variant: 'destructive'
      });
    } finally {
      setCriticalLevelsLoading(false);
    }
  };

  // Load equipment function
  const loadEquipment = async () => {
    if (!selectedMachine) {
      setEquipmentList([]);
      return;
    }

    try {
      setEquipmentLoading(true);
      const response = await ticketService.getEquipmentByPUNO(selectedMachine.PUNO);
      if (response.success) {
        setEquipmentList(response.data || []);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load equipment',
        variant: 'destructive'
      });
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Machine selection handlers
  const onSelectMachine = (machine: PUCODEResult) => {
    setSelectedMachine(machine);
    setPucode(machine.PUCODE);
    setPuno(machine.PUNO);
    skipNextSearchRef.current = true;
    setMachineSearchQuery(machine.PUCODE);
    setMachineSearchDropdownOpen(false);
    
    // Auto-populate critical level from machine's PUCRITICALNO
    if (machine.PUCRITICALNO) {
      setPucriticalno(machine.PUCRITICALNO);
    }
    
    // Clear equipment selection when machine changes
    clearEquipmentSelection();
    
    // Blur the input to prevent onFocus from reopening the dropdown
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const clearMachineSelection = () => {
    setSelectedMachine(null);
    skipNextSearchRef.current = true;
    setMachineSearchQuery('');
    setMachineSearchResults([]);
    setPucode('');
    setPuno(undefined);
    setPucriticalno(undefined);
    setMachineSearchDropdownOpen(false);
    setIsSearching(false);
    setMachineSearchLoading(false);
    
    // Clear equipment selection when machine is cleared
    clearEquipmentSelection();
    
    // Blur the input to prevent onFocus from reopening the dropdown
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Equipment selection handlers
  const onSelectEquipment = (equipmentId: string) => {
    if (equipmentId === 'none') {
      setSelectedEquipment(null);
    } else {
      const equipment = equipmentList.find(eq => eq.EQNO.toString() === equipmentId);
      if (equipment) {
        setSelectedEquipment(equipment);
      }
    }
  };

  const clearEquipmentSelection = () => {
    setSelectedEquipment(null);
  };

  // Handle selection mode change
  const handleSelectionModeChange = (mode: 'search' | 'hierarchy') => {
    setSelectionMode(mode);
    // Clear selections when switching modes
    clearMachineSelection();
  };

  // Handle machine selection from hierarchical selector
  const onHierarchicalMachineSelect = (machine: any) => {
    // Convert hierarchical machine data to PUCODEResult format
    const pucodeResult: PUCODEResult = {
      PUCODE: machine.pucode,
      PUDESC: machine.pudescription || machine.puname,
      PUNO: machine.puno,
      PLANT: machine.plant,
      AREA: machine.area,
      LINE: machine.line,
      MACHINE: machine.machine,
      NUMBER: machine.number,
      PUCRITICALNO: machine.pucriticalno || 0
    };
    
    setSelectedMachine(pucodeResult);
    setPuno(machine.puno);
    
    // Auto-populate critical level if available (same as search functionality)
    if (machine.pucriticalno) {
      setPucriticalno(machine.pucriticalno);
    }
    
    // Clear equipment selection when machine changes
    clearEquipmentSelection();
  };

  const onHierarchicalMachineClear = () => {
    clearMachineSelection();
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (redirectTicketId !== null) {
      navigate(`/tickets/${redirectTicketId}`, { replace: true });
    }
  }, [redirectTicketId, navigate]);

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
        equipment_id: selectedEquipment?.EQNO,
        pucriticalno: pucriticalno,
        severity_level: severity,
        priority,
      };
      
      // Stage 1: Creating ticket
      setSubmitProgress({ stage: 'creating', message: 'Creating ticket...' });
      const created = await ticketService.createTicket(payload);
      const ticketId = created.data.id;
      
      if (beforeFiles.length > 0) {
        setImagesUploading(true);
        try { 
          // Stage 2: Compressing images
          setSubmitProgress({ 
            stage: 'compressing', 
            currentImage: 0, 
            totalImages: beforeFiles.length,
            message: `Compressing image 0/${beforeFiles.length}...` 
          });
          
          console.log(`Compressing ${beforeFiles.length} images before upload...`);
          const compressedFiles = await Promise.all(
            beforeFiles.map(async (file, index) => {
              console.log(`Compressing image ${index + 1}/${beforeFiles.length}: ${formatFileSize(file.size)}`);
              const compressed = await compressTicketImage(file, { 
                maxWidth: 1920, 
                maxHeight: 1920, 
                quality: 0.9 
              });
              console.log(`Compressed to: ${formatFileSize(compressed.size)}`);
              
              // Update progress after each image compression
              setSubmitProgress({ 
                stage: 'compressing', 
                currentImage: index + 1, 
                totalImages: beforeFiles.length,
                message: `Compressing image ${index + 1}/${beforeFiles.length}...` 
              });
              
              return compressed;
            })
          );
          
          // Stage 3: Uploading images
          setSubmitProgress({ 
            stage: 'uploading', 
            currentImage: 0,
            totalImages: beforeFiles.length,
            message: `Uploading ${beforeFiles.length} image(s)...` 
          });
          
          await ticketService.uploadTicketImages(ticketId, compressedFiles, 'before'); 
          
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
      
      // Stage 4: Complete
      setSubmitProgress({ stage: 'complete', message: 'Ticket created successfully!' });
      
      // Brief delay before redirect to show completion
      setTimeout(() => setRedirectTicketId(ticketId), 500);
    } catch (e) {
      // Reset progress on error
      setSubmitProgress({ stage: null, message: '' });
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : t('ticket.failedToCreateTicket'), variant: 'destructive' });
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
      submittingRef.current = false;
    }
  };

  const progress = Math.round(((currentIndex + 1) / stepsOrder.length) * 100);
  const step = stepsOrder[currentIndex];

  // Only create preview URLs when needed (images step or review step)
  const needsPreviews = step === 'images' || step === 'review';
  
  // Create optimized preview images for faster loading
  useEffect(() => {
    if (needsPreviews && beforeFiles.length > 0) {
      // Create preview files if we don't have them
      if (previewFiles.length === 0) {
        createPreviewImages();
      } else if (previewFiles.length > 0 && previewUrls.length === 0) {
        // We have preview files but no URLs, recreate URLs from existing files
        const urls = previewFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(urls);
      }
    } else if (!needsPreviews && previewUrls.length > 0) {
      // Only clean up URLs when leaving both images and review steps
      cleanupPreviewUrls();
    }
  }, [beforeFiles, needsPreviews, previewFiles.length, previewUrls.length]);
  
  // Clean up URLs when files change (but keep them if we're on a step that needs them)
  useEffect(() => {
    if (beforeFiles.length === 0 && previewUrls.length > 0) {
      // Files were cleared, clean up everything
      cleanupPreviewUrls();
      setPreviewFiles([]);
    } else if (beforeFiles.length > 0 && previewFiles.length > 0 && beforeFiles.length !== previewFiles.length) {
      // File count changed, recreate preview images
      cleanupPreviewUrls();
      setPreviewFiles([]);
      if (needsPreviews) {
        createPreviewImages();
      }
    }
  }, [beforeFiles.length]);
  
  const createPreviewImages = async () => {
    if (beforeFiles.length === 0) return;
    
    setPreviewLoading(true);
    
    // Set a timeout for preview creation (3 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Preview creation timeout')), 3000);
    });
    
    try {
      // Create optimized preview images (smaller, faster loading)
      const optimizedFiles = await Promise.race([
        Promise.all(
          beforeFiles.map(async (file) => {
            return await compressImage(file, {
              maxWidth: 400,  // Much smaller for preview
              maxHeight: 400,
              quality: 0.7,   // Lower quality for speed
              format: 'jpeg'
            });
          })
        ),
        timeoutPromise
      ]) as File[];
      
      setPreviewFiles(optimizedFiles);
      
      // Create URLs from optimized files
      const urls = optimizedFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(urls);
    } catch (error) {
      console.error('Error creating preview images:', error);
      // Fallback to original files if compression fails or times out
      const urls = beforeFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(urls);
      // Don't set previewFiles to avoid confusion
    } finally {
      setPreviewLoading(false);
    }
  };
  
  const cleanupPreviewUrls = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const SubmitProgressOverlay: React.FC<{
    stage: 'creating' | 'compressing' | 'uploading' | 'complete' | null;
    currentImage?: number;
    totalImages?: number;
    message: string;
  }> = ({ stage, currentImage, totalImages, message }) => {
    if (!stage) return null;
    
    const stages = [
      { key: 'creating', label: 'Creating ticket', icon: '📝' },
      { key: 'compressing', label: 'Compressing images', icon: '🗜️' },
      { key: 'uploading', label: 'Uploading images', icon: '📤' },
      { key: 'complete', label: 'Complete!', icon: '✅' }
    ];
    
    const currentStageIndex = stages.findIndex(s => s.key === stage);
    
    return (
      <div className="fixed inset-0 bg-black/50 z-[9850] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div className="text-center">
            {/* Header */}
            <div className="mb-6">
              <div className="text-2xl mb-2">{stages[currentStageIndex]?.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Creating Ticket
              </h3>
            </div>
            
            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              {stages.map((stageItem, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;
                
                return (
                  <div key={stageItem.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent 
                        ? 'bg-brand text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {isCompleted ? '✓' : isCurrent ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : index + 1}
                    </div>
                    <span className={`text-sm ${
                      isCompleted || isCurrent 
                        ? 'text-gray-900 dark:text-gray-100 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      {stageItem.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Current Status Message */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {message}
              </p>
              
              {/* Image Progress for compression/upload stages */}
              {(stage === 'compressing' || stage === 'uploading') && currentImage !== undefined && totalImages !== undefined && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-brand h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentImage / totalImages) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
            
            {/* Success message for complete stage */}
            {stage === 'complete' && (
              <div className="text-green-600 dark:text-green-400 font-medium">
                Redirecting to ticket...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      <SubmitProgressOverlay {...submitProgress} />
      
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
              {/* Selection Mode Toggle */}
              <div className="flex rounded-lg border p-1 bg-muted">
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                    selectionMode === 'hierarchy'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => handleSelectionModeChange('hierarchy')}
                  disabled={submitting}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('ticket.selectionModeHierarchy')}</span>
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                    selectionMode === 'search'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => handleSelectionModeChange('search')}
                  disabled={submitting}
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('ticket.selectionModeSearch')}</span>
                </button>
              </div>

              {/* Search Mode */}
              {selectionMode === 'search' && (
                <div className="space-y-2">
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
                  
                  {!selectedMachine && (
                    <p className="text-xs text-gray-500">
                      {t('ticket.typeToSearch')}
                    </p>
                  )}
                </div>
              )}

              {/* Hierarchy Mode */}
              {selectionMode === 'hierarchy' && (
                <HierarchicalMachineSelector
                  onMachineSelect={onHierarchicalMachineSelect}
                  onClear={onHierarchicalMachineClear}
                  selectedMachineData={selectedMachine ? {
                    puno: selectedMachine.PUNO,
                    pucode: selectedMachine.PUCODE,
                    plant: selectedMachine.PLANT,
                    area: selectedMachine.AREA,
                    line: selectedMachine.LINE,
                    machine: selectedMachine.MACHINE,
                    number: selectedMachine.NUMBER,
                    puname: selectedMachine.PUDESC,
                    pudescription: selectedMachine.PUDESC,
                    digit_count: 5
                  } : null}
                  disabled={submitting}
                />
              )}
              
              {/* Selected Machine Display */}
              {selectedMachine && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">Selected Machine</p>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-1">{selectedMachine.PUDESC}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{selectedMachine.PUCODE}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearMachineSelection}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Equipment Selection */}
              {selectedMachine && equipmentList.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="equipment-select" className="text-base font-semibold">Equipment (Optional)</Label>
                  
                  <Select
                    value={selectedEquipment?.EQNO.toString() || 'none'}
                    onValueChange={onSelectEquipment}
                    disabled={equipmentLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={equipmentLoading ? "Loading equipment..." : "Select equipment..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific equipment</SelectItem>
                      {equipmentList.map((equipment) => (
                        <SelectItem key={equipment.EQNO} value={equipment.EQNO.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{equipment.EQCODE}</span>
                            <span className="text-sm text-muted-foreground">{equipment.EQNAME}</span>
                            {equipment.EQTYPENAME && (
                              <span className="text-xs text-muted-foreground">Type: {equipment.EQTYPENAME}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Equipment Display */}
                  {selectedEquipment && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Selected Equipment</p>
                          </div>
                          <p className="text-lg font-mono text-blue-900 dark:text-blue-100 mb-1">{selectedEquipment.EQCODE}</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{selectedEquipment.EQNAME}</p>
                          {selectedEquipment.EQTYPENAME && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Type: {selectedEquipment.EQTYPENAME}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearEquipmentSelection}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Select specific equipment if the issue is related to a particular component
                  </p>
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
              onChange={(files) => {
                if (files && files.length > 0) {
                  const newFiles = Array.from(files);
                  setBeforeFiles(prev => [...prev, ...newFiles]);
                }
              }} 
              className="mb-3"
              placeholder={t('ticket.chooseFiles')}
              showCamera={true}
            />
              {beforeFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {beforeFiles.map((file, idx) => (
                    <div key={idx} className="relative border rounded overflow-hidden">
                      {previewLoading || !previewUrls[idx] ? (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <img 
                          src={previewUrls[idx]} 
                          alt={file.name} 
                          className="w-full h-32 object-cover" 
                          loading="lazy"
                        />
                      )}
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
                <Label className="text-base font-semibold">Critical Level</Label>
                <Select
                  value={pucriticalno?.toString() || ''}
                  onValueChange={(v) => setPucriticalno(parseInt(v))}
                  disabled={criticalLevelsLoading}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={criticalLevelsLoading ? "Loading critical levels..." : "Select critical level..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {criticalLevels.map((level) => (
                      <SelectItem key={level.PUCRITICALNO} value={level.PUCRITICALNO.toString()}>
                        {level.PUCRITICALNAME}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div>
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
              </div> */}
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
                {equipmentList.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equipment:</span> 
                    <span className="font-medium">{selectedEquipment ? `${selectedEquipment.EQCODE} - ${selectedEquipment.EQNAME}` : 'No specific equipment'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.description')}:</span> 
                  <span className="font-medium">{description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.title')}:</span> 
                  <span className="font-medium">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Critical Level:</span> 
                  <span className="font-medium">
                    {pucriticalno ? criticalLevels.find(level => level.PUCRITICALNO === pucriticalno)?.PUCRITICALNAME || `Level ${pucriticalno}` : '-'}
                  </span>
                </div>
                {/* <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.severity')}:</span> 
                  <span className="font-medium capitalize">{severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('ticket.priority')}:</span> 
                  <span className="font-medium capitalize">{priority}</span>
                </div> */}
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
                    {beforeFiles.map((file, idx) => (
                      <div key={idx} className="relative border rounded overflow-hidden">
                        {previewLoading || !previewUrls[idx] ? (
                          <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <img 
                            src={previewUrls[idx]} 
                            alt={file.name} 
                            className="w-full h-24 object-cover" 
                            loading="lazy"
                          />
                        )}
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
