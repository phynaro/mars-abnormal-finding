import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest, type Equipment } from '@/services/ticketService';
import { hierarchyService, type PUCritical } from '@/services/hierarchyService';
import { ticketClassService, type TicketClass } from '@/services/ticketClassService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, X, Search, Building2 } from 'lucide-react';
import authService from '@/services/authService';
import { compressTicketImage, formatFileSize, compressImage } from '@/utils/imageCompression';
import HierarchicalMachineSelectorV2, { type SelectedMachine } from '@/components/tickets/HierarchicalMachineSelectorV2';

/** Normalize search API response (uppercase keys) to SelectedMachine (lowercase). */
function mapSearchResultToSelectedMachine(item: Record<string, unknown>): SelectedMachine {
  const pucode = (item.PUCODE ?? item.pucode ?? '') as string;
  const parts = pucode.split('-');
  return {
    puno: (item.PUNO ?? item.puno ?? 0) as number,
    pucode,
    plant: (item.PLANT ?? item.plant ?? parts[0] ?? '') as string,
    puname: (item.PUDESC ?? item.PUNAME ?? item.puname ?? pucode) as string,
    pucriticalno: (item.PUCRITICALNO ?? item.pucriticalno) as number | undefined
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TicketCreatePageV2: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Pick<CreateTicketRequest, 'title' | 'description' | 'severity_level' | 'priority'> & { puno?: number; equipment_id?: number; pucriticalno?: number; ticketClass?: number | null }>({
    title: '',
    description: '',
    puno: undefined,
    equipment_id: undefined,
    pucriticalno: undefined,
    ticketClass: undefined,
    severity_level: 'medium',
    priority: 'normal',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Image selection state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Machine selection state - simplified approach
  const [selectionMode, setSelectionMode] = useState<'search' | 'hierarchy'>('hierarchy');
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineSearchResults, setMachineSearchResults] = useState<SelectedMachine[]>([]);
  const [machineSearchLoading, setMachineSearchLoading] = useState(false);
  const [machineSearchDropdownOpen, setMachineSearchDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<SelectedMachine | null>(null);
  const [isProgrammaticUpdate, setIsProgrammaticUpdate] = useState(false);

  // Equipment selection state
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // Critical levels state
  const [criticalLevels, setCriticalLevels] = useState<PUCritical[]>([]);
  const [criticalLevelsLoading, setCriticalLevelsLoading] = useState(false);
  
  // Ticket class state
  const [ticketClasses, setTicketClasses] = useState<TicketClass[]>([]);
  const [ticketClassesLoading, setTicketClassesLoading] = useState(false);

  // Create optimized preview images for faster loading
  useEffect(() => {
    if (selectedFiles.length > 0) {
      // Only create preview files if we don't already have them
      if (previewFiles.length === 0) {
        createPreviewImages();
      } else if (previewFiles.length > 0 && previewUrls.length === 0) {
        // We have preview files but no URLs, recreate URLs from existing files
        const urls = previewFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(urls);
      }
    } else {
      // Clean up when no files selected
      cleanupPreviewUrls();
      setPreviewFiles([]);
    }
  }, [selectedFiles.length, previewFiles.length, previewUrls.length]);
  
  // Clean up URLs when files change
  useEffect(() => {
    if (selectedFiles.length === 0 && previewUrls.length > 0) {
      // Files were cleared, clean up everything
      cleanupPreviewUrls();
      setPreviewFiles([]);
    } else if (selectedFiles.length > 0 && previewFiles.length > 0 && selectedFiles.length !== previewFiles.length) {
      // File count changed, recreate preview images
      cleanupPreviewUrls();
      setPreviewFiles([]);
      createPreviewImages();
    }
  }, [selectedFiles.length]);
  
  const createPreviewImages = async () => {
    if (selectedFiles.length === 0) return;
    
    setPreviewLoading(true);
    
    // Set a timeout for preview creation (3 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Preview creation timeout')), 3000);
    });
    
    try {
      // Create optimized preview images (smaller, faster loading)
      const optimizedFiles = await Promise.race([
        Promise.all(
          selectedFiles.map(async (file) => {
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
      const urls = selectedFiles.map(f => URL.createObjectURL(f));
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Global drag and drop handlers for the entire page
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    // Add global event listeners
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    console.log("formData", formData);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // File handling functions
  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024); // 10MB limit
    const validFiles = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);
    
    if (imageFiles.length !== fileArray.length) {
      toast({
        title: t('common.warning'),
        description: t('ticket.wizardImageFormat'),
        variant: 'destructive'
      });
    }
    
    if (oversizedFiles.length > 0) {
      toast({
        title: t('common.warning'),
        description: `${oversizedFiles.length} file(s) were skipped. ${t('ticket.wizardImageSize')}`,
        variant: 'destructive'
      });
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      if (errors.files) setErrors(prev => ({ ...prev, files: '' }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (submitting) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // Simplified machine search function
  const searchMachines = async (query: string) => {
    if (query.length < 2) {
      setMachineSearchResults([]);
      return;
    }

    try {
      setMachineSearchLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/pucode/search?search=${encodeURIComponent(query)}`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMachineSearchResults(data.data.map((item: Record<string, unknown>) => mapSearchResultToSelectedMachine(item)));
      } else {
        setMachineSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching machines:', error);
      toast({
        title: t('common.error'),
        description: t('ticket.failedToSearchPU'),
        variant: 'destructive'
      });
    } finally {
      setMachineSearchLoading(false);
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
      const response = await ticketService.getEquipmentByPUNO(selectedMachine.puno);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = t('ticket.titleRequired');
    if (!formData.description.trim()) newErrors.description = t('ticket.descriptionRequired');
    if (!selectedMachine) newErrors.machine = t('ticket.selectMachine');
    if (selectedFiles.length === 0) newErrors.files = t('ticket.atLeastOneAttachment');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Search machines with debounce
  useEffect(() => {
    // Skip search if this is a programmatic update (e.g., after machine selection)
    if (isProgrammaticUpdate) {
      setIsProgrammaticUpdate(false);
      return;
    }

    const t = setTimeout(async () => {
      if (machineSearchQuery.length >= 2) {
        await searchMachines(machineSearchQuery);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [machineSearchQuery, isProgrammaticUpdate]);

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
    loadTicketClasses();
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

  // Load ticket classes function
  const loadTicketClasses = async () => {
    try {
      setTicketClassesLoading(true);
      const classes = await ticketClassService.getTicketClasses();
      setTicketClasses(classes);
    } catch (error) {
      console.error('Error loading ticket classes:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load ticket classes',
        variant: 'destructive'
      });
    } finally {
      setTicketClassesLoading(false);
    }
  };

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = target.closest('.search-dropdown');
      
      if (searchInputRef.current && !searchInputRef.current.contains(target) && !dropdown) {
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

  // Machine selection handlers (search results already SelectedMachine after normalize)
  const onSelectMachine = (machine: SelectedMachine) => {
    setSelectedMachine(machine);
    handleInputChange('puno', machine.puno);
    setIsProgrammaticUpdate(true);
    setMachineSearchQuery(machine.pucode);
    setMachineSearchDropdownOpen(false);
    handleInputChange('pucriticalno', machine.pucriticalno ?? undefined);
    clearEquipmentSelection();
    
    // Blur the input to prevent onFocus from reopening the dropdown
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const clearMachineSelection = () => {
    setSelectedMachine(null);
    setIsProgrammaticUpdate(true);
    setMachineSearchQuery('');
    setMachineSearchResults([]);
    handleInputChange('puno', undefined);
    handleInputChange('pucriticalno', undefined);
    
    // Clear equipment selection when machine is cleared
    clearEquipmentSelection();
    
    // Blur the input to prevent onFocus from reopening the dropdown
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Handle machine selection from hierarchical selector (already SelectedMachine shape)
  const onHierarchicalMachineSelect = (machine: SelectedMachine) => {
    setSelectedMachine(machine);
    handleInputChange('puno', machine.puno);
    handleInputChange('pucriticalno', machine.pucriticalno ?? undefined);
    clearEquipmentSelection();
  };

  const onHierarchicalMachineClear = () => {
    clearMachineSelection();
  };

  // Handle selection mode change
  const handleSelectionModeChange = (mode: 'search' | 'hierarchy') => {
    setSelectionMode(mode);
    // Clear selections when switching modes
    clearMachineSelection();
  };

  // Equipment selection handlers
  const onSelectEquipment = (equipmentId: string) => {
    if (equipmentId === 'none') {
      setSelectedEquipment(null);
      handleInputChange('equipment_id', undefined);
    } else {
      const equipment = equipmentList.find(eq => eq.EQNO.toString() === equipmentId);
      if (equipment) {
        setSelectedEquipment(equipment);
        handleInputChange('equipment_id', equipment.EQNO);
      }
    }
  };

  const clearEquipmentSelection = () => {
    setSelectedEquipment(null);
    handleInputChange('equipment_id', undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      // Assemble payload
      const payload: CreateTicketRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        puno: formData.puno,
        equipment_id: formData.equipment_id,
        pucriticalno: formData.pucriticalno,
        ticketClass: formData.ticketClass,
        severity_level: formData.severity_level,
        priority: formData.priority,
      };

      // Compress images before upload to prevent 413 errors
      let filesToUpload = selectedFiles;
      if (selectedFiles.length > 0) {
        console.log(`Compressing ${selectedFiles.length} images before upload...`);
        filesToUpload = await Promise.all(
          selectedFiles.map(async (file, index) => {
            console.log(`Compressing image ${index + 1}/${selectedFiles.length}: ${formatFileSize(file.size)}`);
            const compressed = await compressTicketImage(file, { 
              maxWidth: 1920, 
              maxHeight: 1920, 
              quality: 0.9 
            });
            console.log(`Compressed to: ${formatFileSize(compressed.size)}`);
            return compressed;
          })
        );
      }

      const createRes = await ticketService.createTicket(payload, filesToUpload, 'before');
      const ticketId = createRes.data.id;

      try {
        // triggerTicketNotification removed - notifications now handled automatically
        console.log('LINE notification sent after ticket creation');
      } catch (notificationError) {
        console.error('Failed to send LINE notification:', notificationError);
        // Don't fail the ticket creation if notification fails
      }

      toast({ title: t('common.success'), description: t('ticket.ticketCreatedSuccess'), variant: 'default' });
      
      // Use setTimeout to ensure navigation happens after all async operations complete
      // This fixes mobile Safari/Chrome navigation issues
      setTimeout(() => {
        navigate(`/tickets/${ticketId}`, { replace: true });
      }, 100);
    } catch (error) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : t('ticket.failedToCreateTicket'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold primary-foreground">{t('ticket.reportAbnormalFinding')}</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/tickets')}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={submitting}
          >
            {submitting ? t('ticket.creating') : t('ticket.submitReport')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
            {/* LEFT COLUMN: Machine Selection */}
            <div className="space-y-4">
              {/* Machine Selection with Toggle */}
              <div className="space-y-3">
                <Label htmlFor="machine-search" className="text-base font-semibold">{t('ticket.wizardSelectMachine')} *</Label>
                
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
                          setMachineSearchQuery(e.target.value);
                          setMachineSearchDropdownOpen(true);
                        }}
                        onFocus={() => setMachineSearchDropdownOpen(true)}
                        placeholder={t('ticket.wizardSelectMachine')}
                        className={errors.machine ? 'border-red-500' : ''}
                        disabled={submitting}
                      />
                      {machineSearchDropdownOpen && machineSearchResults.length > 0 && (
                        <div className="search-dropdown absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {machineSearchLoading ? (
                            <div className="p-3 text-sm text-gray-500">{t('ticket.searchMachines')}</div>
                          ) : (
                            machineSearchResults.map((result, idx) => (
                              <button
                                type="button"
                                key={`${result.pucode}-${idx}`}
                                className="w-full text-left px-3 py-3 text-sm hover:bg-hover hover:text-hover-foreground border-b last:border-b-0"
                                onClick={() => onSelectMachine(result)}
                              >
                                <div className="font-medium text-base">{result.pucode}</div>
                                <div className="text-sm opacity-80 mt-1">{result.puname}</div>
                                <div className="text-xs opacity-60 mt-1">
                                  {result.pucode.split('-').join(' → ')}
                                </div>
                              </button>
                            ))
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

                {/* Hierarchy Mode (V2: PU children drill-down) */}
                {selectionMode === 'hierarchy' && (
                  <HierarchicalMachineSelectorV2
                    onMachineSelect={onHierarchicalMachineSelect}
                    onClear={onHierarchicalMachineClear}
                    selectedMachineData={selectedMachine}
                    disabled={submitting}
                  />
                )}
                
                {/* Selected Production Unit Display */}
                {selectedMachine && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">{t('ticket.selectedPU')}</p>
                        </div>
                        <p className="text-lg font-mono text-green-900 dark:text-green-100 mb-1">{selectedMachine.pucode}</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-2">{selectedMachine.puname}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearMachineSelection}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        disabled={submitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Equipment Selection */}
                {selectedMachine && equipmentList.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="equipment-select" className="text-base font-semibold">Equipment (Optional)</Label>
                    
                    <Select
                      value={selectedEquipment?.EQNO.toString() || 'none'}
                      onValueChange={onSelectEquipment}
                      disabled={equipmentLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={equipmentLoading ? "Loading equipment..." : "Select equipment..."}>
                          {selectedEquipment ? selectedEquipment.EQCODE : (equipmentLoading ? "Loading equipment..." : "Select equipment...")}
                        </SelectValue>
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
                            disabled={submitting}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {!selectedEquipment && (
                      <p className="text-xs text-gray-500">
                        Select specific equipment if the issue is related to a particular component
                      </p>
                    )}
                  </div>
                )}

                {errors.machine && <p className="text-sm text-red-500">{errors.machine}</p>}
              </div>
            </div>

            {/* RIGHT COLUMN: Title, Description, Critical Level & Images */}
            <div className="space-y-4">
              {/* Problem Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('ticket.problemTitle')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={t('ticket.addConciseTitle')}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description">{t('ticket.description')} *</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('ticket.describeAbnormalFinding')}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>

              {/* Critical Level */}
              <div className="space-y-2">
                <Label htmlFor="critical">{t('ticket.criticalLevel')}</Label>
                <Select
                  value={formData.pucriticalno?.toString() || ''}
                  onValueChange={(v) => handleInputChange('pucriticalno', parseInt(v))}
                  disabled={criticalLevelsLoading}
                >
                  <SelectTrigger>
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

              {/* Ticket Class */}
              <div className="space-y-2">
                <Label htmlFor="ticketClass">{t('ticket.ticketClass')}</Label>
                <Select
                  value={formData.ticketClass?.toString() || 'none'}
                  onValueChange={(v) => handleInputChange('ticketClass', v === 'none' ? null : parseInt(v))}
                  disabled={ticketClassesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={ticketClassesLoading ? "Loading ticket classes..." : "Select ticket class..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {ticketClasses.map((ticketClass) => (
                      <SelectItem key={ticketClass.id} value={ticketClass.id.toString()}>
                        {language === 'en' ? ticketClass.name_en : ticketClass.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attach images (before) */}
              <div className="space-y-2">
                <Label htmlFor="images" className="text-base font-semibold">{t('ticket.attachImages')} *</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 transition-all duration-200 ${
                    submitting
                      ? 'opacity-70 cursor-not-allowed border-muted-foreground/20'
                      : isDragOver
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-muted-foreground/40 hover:border-primary hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!submitting) {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className={`h-8 w-8 transition-colors ${
                      isDragOver ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="space-y-1">
                      <p className={`text-sm font-medium transition-colors ${
                        isDragOver ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {isDragOver ? t('ticket.dropFilesHere') : t('ticket.dragDropFiles')}
                      </p>
                      {!isDragOver && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          disabled={submitting}
                        >
                          {t('ticket.browseFiles')}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('ticket.imageUploadInfo')}
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    id="images"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={submitting}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('ticket.selectedFiles')} {selectedFiles.length} file(s)</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFiles([])} disabled={submitting}>{t('ticket.clearAll')}</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-h-48 overflow-y-auto pr-1">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="group relative overflow-hidden rounded-lg border">
                          {previewLoading || !previewUrls[idx] ? (
                            <div className="h-24 w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <img 
                              src={previewUrls[idx]} 
                              alt={file.name} 
                              className="h-24 w-full object-cover" 
                              loading="lazy"
                            />
                          )}
                          <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={submitting}
                          >
                            {t('ticket.remove')}
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
                            <div className="truncate">{file.name}</div>
                            <div className="text-xs opacity-75">
                              {(file.size / (1024 * 1024)).toFixed(1)}MB
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.files && (
                  <p className="text-sm text-red-500">{errors.files}</p>
                )}
              </div>

              {/* Severity & Priority */}
              {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="severity_level">{t('ticket.severity')}</Label>
                  <Select value={formData.severity_level} onValueChange={(v) => handleInputChange('severity_level', v as any)}>
                    <SelectTrigger><SelectValue placeholder={t('ticket.selectSeverity')} /></SelectTrigger>
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
                  <Select value={formData.priority} onValueChange={(v) => handleInputChange('priority', v as any)}>
                    <SelectTrigger><SelectValue placeholder={t('ticket.selectPriority')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('ticket.low')}</SelectItem>
                      <SelectItem value="normal">{t('ticket.normal')}</SelectItem>
                      <SelectItem value="high">{t('ticket.high')}</SelectItem>
                      <SelectItem value="urgent">{t('ticket.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div> */}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketCreatePageV2;
