import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest, type Equipment } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, X } from 'lucide-react';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TicketCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Pick<CreateTicketRequest, 'title' | 'description' | 'severity_level' | 'priority'> & { puno?: number; equipment_id?: number }>({
    title: '',
    description: '',
    puno: undefined,
    equipment_id: undefined,
    severity_level: 'medium',
    priority: 'normal',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Image selection state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Machine selection state - simplified approach
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineSearchResults, setMachineSearchResults] = useState<PUCODEResult[]>([]);
  const [machineSearchLoading, setMachineSearchLoading] = useState(false);
  const [machineSearchDropdownOpen, setMachineSearchDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<PUCODEResult | null>(null);

  // Equipment selection state
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // Generate previews and revoke URLs on unmount/change
  const previews = useMemo(() => selectedFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [selectedFiles]);
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

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
      if (data.success) {
        setMachineSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Error searching machines:', error);
      toast({
        title: t('common.error'),
        description: t('ticket.failedToSearchMachines'),
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
    const t = setTimeout(async () => {
      if (machineSearchQuery.length >= 2) {
        await searchMachines(machineSearchQuery);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [machineSearchQuery]);

  // Load equipment when machine is selected
  useEffect(() => {
    if (selectedMachine) {
      loadEquipment();
    } else {
      setEquipmentList([]);
      setSelectedEquipment(null);
    }
  }, [selectedMachine]);

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

  // Machine selection handlers
  const onSelectMachine = (machine: PUCODEResult) => {
    setSelectedMachine(machine);
    handleInputChange('puno', machine.PUNO);
    setMachineSearchQuery(machine.PUCODE);
    setMachineSearchDropdownOpen(false);
    
    // Clear equipment selection when machine changes
    clearEquipmentSelection();
  };

  const clearMachineSelection = () => {
    setSelectedMachine(null);
    setMachineSearchQuery('');
    setMachineSearchResults([]);
    handleInputChange('puno', undefined);
    
    // Clear equipment selection when machine is cleared
    clearEquipmentSelection();
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
        severity_level: formData.severity_level,
        priority: formData.priority,
      };

      const createRes = await ticketService.createTicket(payload, selectedFiles, 'before');
      const ticketId = createRes.data.id;

      try {
        // triggerTicketNotification removed - notifications now handled automatically
        console.log('LINE notification sent after ticket creation');
      } catch (notificationError) {
        console.error('Failed to send LINE notification:', notificationError);
        // Don't fail the ticket creation if notification fails
      }

      toast({ title: t('common.success'), description: t('ticket.ticketCreatedSuccess'), variant: 'default' });
      navigate(`/tickets/${ticketId}`);
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
            {/* LEFT COLUMN: Machine Selection & Attachments */}
            <div className="space-y-6">
              {/* Simplified Machine Selection */}
              <div className="space-y-4">
                <Label htmlFor="machine-search" className="text-base font-semibold">{t('ticket.wizardSelectMachine')} *</Label>
                
                <div className="space-y-3">
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
                    />
                    {machineSearchDropdownOpen && machineSearchResults.length > 0 && (
                      <div className="search-dropdown absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                        {machineSearchLoading ? (
                          <div className="p-3 text-sm text-gray-500">{t('ticket.searchMachines')}</div>
                        ) : (
                          machineSearchResults.map((result, idx) => (
                            <button
                              type="button"
                              key={idx}
                              className="w-full text-left px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground border-b last:border-b-0"
                              onClick={() => onSelectMachine(result)}
                            >
                              <div className="font-medium text-base">{result.PUCODE}</div>
                              <div className="text-sm opacity-80 mt-1">{result.PUDESC}</div>
                              <div className="text-xs opacity-60 mt-1">
                                {result.PLANT} → {result.AREA} → {result.LINE} → {result.MACHINE} → {result.NUMBER}
                              </div>
                            </button>
                          ))
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
                            <p className="text-sm font-medium text-green-800">{t('ticket.selectedMachine')}</p>
                          </div>
                          <p className="text-lg font-mono text-green-900 mb-1">{selectedMachine.PUCODE}</p>
                          <p className="text-sm text-green-700 mb-2">{selectedMachine.PUDESC}</p>
                          <div className="text-xs text-green-600">
                            {selectedMachine.PLANT} → {selectedMachine.AREA} → {selectedMachine.LINE} → {selectedMachine.MACHINE} → {selectedMachine.NUMBER}
                          </div>
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
                  
                  {/* Equipment Selection */}
                  {selectedMachine && (
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
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <p className="text-sm font-medium text-blue-800">Selected Equipment</p>
                              </div>
                              <p className="text-lg font-mono text-blue-900 mb-1">{selectedEquipment.EQCODE}</p>
                              <p className="text-sm text-blue-700 mb-2">{selectedEquipment.EQNAME}</p>
                              {selectedEquipment.EQTYPENAME && (
                                <div className="text-xs text-blue-600">
                                  Type: {selectedEquipment.EQTYPENAME}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearEquipmentSelection}
                              className="text-blue-600 hover:text-blue-700"
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
                  
                  <p className="text-xs text-gray-500">
                    {t('ticket.typeToSearch')}
                  </p>
                </div>

                {errors.machine && <p className="text-sm text-red-500">{errors.machine}</p>}
              </div>

              {/* Attach images (before) */}
              <div className="space-y-3">
                <Label htmlFor="images" className="text-base font-semibold">{t('ticket.attachImages')} *</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
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
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Upload className={`h-12 w-12 transition-colors ${
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 max-h-60 overflow-y-auto pr-1">
                      {previews.map((p, idx) => (
                        <div key={idx} className="group relative overflow-hidden rounded-lg border">
                          <img src={p.url} alt={p.file.name} className="h-40 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={submitting}
                          >
                            {t('ticket.remove')}
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
                            <div className="truncate">{p.file.name}</div>
                            <div className="text-xs opacity-75">
                              {(p.file.size / (1024 * 1024)).toFixed(1)}MB
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
            </div>

            {/* RIGHT COLUMN: Title, Description, Severity & Priority */}
            <div className="space-y-6">
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

              {/* Severity & Priority */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketCreatePage;
