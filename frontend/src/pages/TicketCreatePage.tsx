import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type CreateTicketRequest } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { Search, Filter, Upload, X } from 'lucide-react';
import authService from '@/services/authService';

// Hierarchy data types
interface Plant {
  id: number;
  name: string;
  code: string;
}

interface Area {
  id: number;
  name: string;
  code: string;
  plant_id: number;
}

interface Line {
  id: number;
  name: string;
  code: string;
  area_id: number;
}

interface Machine {
  id: number;
  name: string;
  code: string;
  line_id: number;
  machine_number: number;
}

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

  const [submitting, setSubmitting] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [formData, setFormData] = useState<Pick<CreateTicketRequest, 'title' | 'description' | 'severity_level' | 'priority'> & { pucode?: string; pu_id?: number }>({
    title: '',
    description: '',
    pucode: '',
    pu_id: undefined,
    severity_level: 'medium',
    priority: 'normal',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Image selection state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PUCODE hierarchy state
  const [pucodeMode, setPucodeMode] = useState<'search' | 'filter'>('search');
  const [pucodeSearchQuery, setPucodeSearchQuery] = useState('');
  const [pucodeSearchResults, setPucodeSearchResults] = useState<PUCODEResult[]>([]);
  const [pucodeSearchLoading, setPucodeSearchLoading] = useState(false);
  const [pucodeSearchDropdownOpen, setPucodeSearchDropdownOpen] = useState(false);
  
  // Hierarchy filter state
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // Hierarchy data
  const [plants, setPlants] = useState<Plant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // Loading states
  const [plantsLoading, setPlantsLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [machinesLoading, setMachinesLoading] = useState(false);

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
        title: 'Warning',
        description: 'Some files were skipped. Only image files are supported.',
        variant: 'destructive'
      });
    }
    
    if (oversizedFiles.length > 0) {
      toast({
        title: 'Warning',
        description: `${oversizedFiles.length} file(s) were skipped. Maximum file size is 10MB.`,
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
    
    if (imagesUploading) return;
    
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

  // API functions for hierarchy data
  const fetchPlants = async () => {
    try {
      setPlantsLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/plants`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Please check authentication.');
      }
      
      const data = await response.json();
      if (data.success) {
        setPlants(data.data || []);
      } else {
        console.error('API error:', data.message);
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch plants',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch plants. Please check your authentication.',
        variant: 'destructive'
      });
    } finally {
      setPlantsLoading(false);
    }
  };

  const fetchAreas = async (plantId: number) => {
    try {
      setAreasLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/plants/${plantId}/areas`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setAreas(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    } finally {
      setAreasLoading(false);
    }
  };

  const fetchLines = async (areaId: number) => {
    try {
      setLinesLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/areas/${areaId}/lines`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setLines(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching lines:', error);
    } finally {
      setLinesLoading(false);
    }
  };

  const fetchMachines = async (lineId: number) => {
    try {
      setMachinesLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/lines/${lineId}/machines`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setMachines(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    } finally {
      setMachinesLoading(false);
    }
  };

  const searchPUCODE = async (query: string) => {
    if (query.length < 2) {
      setPucodeSearchResults([]);
      return;
    }

    try {
      setPucodeSearchLoading(true);
      const response = await fetch(`${API_BASE_URL}/hierarchy/pucode/search?search=${encodeURIComponent(query)}`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setPucodeSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Error searching PUCODE:', error);
    } finally {
      setPucodeSearchLoading(false);
    }
  };

  const generatePUCODE = async (plantId: number, areaId: number, lineId: number, machineId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hierarchy/pucode/generate`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ plantId, areaId, lineId, machineId })
      });
      const data = await response.json();
      if (data.success) {
        return data.data.pucode;
      }
    } catch (error) {
      console.error('Error generating PUCODE:', error);
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.pucode?.trim()) newErrors.pucode = 'PUCODE is required';
    if (selectedFiles.length === 0) newErrors.files = 'At least one attachment is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch plants on component mount
  useEffect(() => {
    // Check if user is authenticated before fetching data
    const token = authService.getToken();
    console.log('Authentication check:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      apiBaseUrl: API_BASE_URL 
    });
    
    if (token) {
      fetchPlants();
    } else {
      console.warn('No authentication token found. User may need to log in.');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access PUCODE selection features.',
        variant: 'destructive'
      });
    }
  }, []);

  // Fetch areas when plant is selected
  useEffect(() => {
    if (selectedPlant) {
      fetchAreas(selectedPlant.id);
      // Reset dependent selections
      setSelectedArea(null);
      setSelectedLine(null);
      setSelectedMachine(null);
      setAreas([]);
      setLines([]);
      setMachines([]);
    }
  }, [selectedPlant]);

  // Fetch lines when area is selected
  useEffect(() => {
    if (selectedArea) {
      fetchLines(selectedArea.id);
      // Reset dependent selections
      setSelectedLine(null);
      setSelectedMachine(null);
      setLines([]);
      setMachines([]);
    }
  }, [selectedArea]);

  // Fetch machines when line is selected
  useEffect(() => {
    if (selectedLine) {
      fetchMachines(selectedLine.id);
      // Reset dependent selections
      setSelectedMachine(null);
      setMachines([]);
    }
  }, [selectedLine]);

  // Search PUCODE with debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      if (pucodeMode === 'search' && pucodeSearchQuery.length >= 2) {
        await searchPUCODE(pucodeSearchQuery);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [pucodeSearchQuery, pucodeMode]);

  // Generate PUCODE when all hierarchy selections are made
  useEffect(() => {
    const generatePucodeFromHierarchy = async () => {
      if (selectedPlant && selectedArea && selectedLine && selectedMachine) {
        const pucode = await generatePUCODE(selectedPlant.id, selectedArea.id, selectedLine.id, selectedMachine.id);
        if (pucode) {
          handleInputChange('pucode', pucode);
        }
      }
    };
    generatePucodeFromHierarchy();
  }, [selectedPlant, selectedArea, selectedLine, selectedMachine]);

  // PUCODE selection handlers
  const onSelectPUCODE = (pucode: PUCODEResult) => {
    handleInputChange('pucode', pucode.PUCODE);
    handleInputChange('pu_id', pucode.PUNO);
    setPucodeSearchQuery(pucode.PUCODE);
    setPucodeSearchDropdownOpen(false);
  };

  const onSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
  };

  const onSelectArea = (area: Area) => {
    setSelectedArea(area);
  };

  const onSelectLine = (line: Line) => {
    setSelectedLine(line);
  };

  const onSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const clearHierarchySelection = () => {
    setSelectedPlant(null);
    setSelectedArea(null);
    setSelectedLine(null);
    setSelectedMachine(null);
    setAreas([]);
    setLines([]);
    setMachines([]);
    handleInputChange('pucode', '');
    handleInputChange('pu_id', undefined);
  };

  const switchPucodeMode = (mode: 'search' | 'filter') => {
    setPucodeMode(mode);
    if (mode === 'search') {
      clearHierarchySelection();
    } else {
      setPucodeSearchQuery('');
      setPucodeSearchResults([]);
      setPucodeSearchDropdownOpen(false);
    }
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
        pucode: formData.pucode?.trim() || '',
        pu_id: formData.pu_id,
        severity_level: formData.severity_level,
        priority: formData.priority,
      };

      const createRes = await ticketService.createTicket(payload);
      const ticketId = createRes.data.id;

      // Upload images if any, with image_type = 'before'
      if (selectedFiles.length > 0) {
        setImagesUploading(true);
        try {
          await ticketService.uploadTicketImages(ticketId, selectedFiles, 'before');
          
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

      toast({ title: 'Success', description: 'Ticket created successfully', variant: 'default' });
      navigate(`/tickets/${ticketId}`);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create ticket', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold primary-foreground">Report Abnormal Finding</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/tickets')}
            disabled={submitting || imagesUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={submitting || imagesUploading}
          >
            {submitting ? 'Creating…' : imagesUploading ? 'Uploading images…' : 'Submit Report'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
            {/* LEFT COLUMN: Machine Selection & Attachments */}
            <div className="space-y-6">
              {/* Machine Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pucode" className="text-base font-semibold">What machine is affected? *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={pucodeMode === 'search' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchPucodeMode('search')}
                    >
                      <Search className="w-4 h-4 mr-1" />
                      Search
                    </Button>
                    <Button
                      type="button"
                      variant={pucodeMode === 'filter' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => switchPucodeMode('filter')}
                    >
                      <Filter className="w-4 h-4 mr-1" />
                      Filter
                    </Button>
                  </div>
                </div>

                {pucodeMode === 'search' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        id="pucode"
                        value={pucodeSearchQuery}
                        onChange={(e) => {
                          setPucodeSearchQuery(e.target.value);
                          setPucodeSearchDropdownOpen(true);
                        }}
                        onFocus={() => setPucodeSearchDropdownOpen(true)}
                        placeholder="Search PUCODE (e.g., PLANT-AREA-LINE-MACHINE-NUMBER)"
                        className={errors.pucode ? 'border-red-500' : ''}
                      />
                      {pucodeSearchDropdownOpen && pucodeSearchResults.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {pucodeSearchLoading ? (
                            <div className="p-3 text-sm text-gray-500">Searching...</div>
                          ) : (
                            pucodeSearchResults.map((result, idx) => (
                              <button
                                type="button"
                                key={idx}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => onSelectPUCODE(result)}
                              >
                                <div className="font-medium">{result.PUCODE}</div>
                                <div className="text-xs text-gray-500">{result.PUDESC}</div>
                                <div className="text-xs text-gray-400">
                                  {result.PLANT} → {result.AREA} → {result.LINE} → {result.MACHINE} → {result.NUMBER}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <Input
                      value={formData.pucode || ''}
                      onChange={(e) => handleInputChange('pucode', e.target.value)}
                      placeholder="Or enter PUCODE directly (PLANT-AREA-LINE-MACHINE-NUMBER)"
                      className={errors.pucode ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-gray-500">
                      Enter PUCODE in format: PLANT-AREA-LINE-MACHINE-NUMBER
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hierarchy Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Plant Selection */}
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Plant</Label>
                        <Select
                          value={selectedPlant?.id.toString() || ''}
                          onValueChange={(value) => {
                            const plant = plants.find(p => p.id.toString() === value);
                            if (plant) onSelectPlant(plant);
                          }}
                          disabled={plantsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={plantsLoading ? "Loading..." : "Select Plant"} />
                          </SelectTrigger>
                          <SelectContent>
                            {plants.map((plant) => (
                              <SelectItem key={plant.id} value={plant.id.toString()}>
                                {plant.name} ({plant.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Area Selection */}
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Area</Label>
                        <Select
                          value={selectedArea?.id.toString() || ''}
                          onValueChange={(value) => {
                            const area = areas.find(a => a.id.toString() === value);
                            if (area) onSelectArea(area);
                          }}
                          disabled={!selectedPlant || areasLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={areasLoading ? "Loading..." : !selectedPlant ? "Select Plant first" : "Select Area"} />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id.toString()}>
                                {area.name} ({area.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Line Selection */}
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Line</Label>
                        <Select
                          value={selectedLine?.id.toString() || ''}
                          onValueChange={(value) => {
                            const line = lines.find(l => l.id.toString() === value);
                            if (line) onSelectLine(line);
                          }}
                          disabled={!selectedArea || linesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={linesLoading ? "Loading..." : !selectedArea ? "Select Area first" : "Select Line"} />
                          </SelectTrigger>
                          <SelectContent>
                            {lines.map((line) => (
                              <SelectItem key={line.id} value={line.id.toString()}>
                                {line.name} ({line.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Machine Selection */}
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Machine</Label>
                        <Select
                          value={selectedMachine?.id.toString() || ''}
                          onValueChange={(value) => {
                            const machine = machines.find(m => m.id.toString() === value);
                            if (machine) onSelectMachine(machine);
                          }}
                          disabled={!selectedLine || machinesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={machinesLoading ? "Loading..." : !selectedLine ? "Select Line first" : "Select Machine"} />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.map((machine) => (
                              <SelectItem key={machine.id} value={machine.id.toString()}>
                                {machine.name} ({machine.code}-{machine.machine_number})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    {/* Generated PUCODE Display */}
                    {formData.pucode && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">Generated PUCODE:</p>
                            <p className="text-lg font-mono text-green-900">{formData.pucode}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearHierarchySelection}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errors.pucode && <p className="text-sm text-red-500">{errors.pucode}</p>}
              </div>

              {/* Attach images (before) */}
              <div className="space-y-3">
                <Label htmlFor="images" className="text-base font-semibold">Attach Images (Before) *</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                    imagesUploading 
                      ? 'opacity-70 cursor-not-allowed border-muted-foreground/20' 
                      : isDragOver
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-muted-foreground/40 hover:border-primary hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!imagesUploading) {
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
                        {isDragOver ? 'Drop files here' : 'Drag & drop files here or'}
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
                          disabled={imagesUploading}
                        >
                          Browse files
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or JPEG up to 10MB each. Images upload after ticket creation.
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
                    disabled={imagesUploading}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Selected: {selectedFiles.length} file(s)</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFiles([])} disabled={imagesUploading}>Clear all</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 max-h-60 overflow-y-auto pr-1">
                      {previews.map((p, idx) => (
                        <div key={idx} className="group relative overflow-hidden rounded-lg border">
                          <img src={p.url} alt={p.file.name} className="h-40 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={imagesUploading}
                          >
                            Remove
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
                <Label htmlFor="title">Problem Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Add a concise problem title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-3">
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

              {/* Severity & Priority */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="severity_level">Severity</Label>
                  <Select value={formData.severity_level} onValueChange={(v) => handleInputChange('severity_level', v as any)}>
                    <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
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
