import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ticketService, type Plant, type Area, type Line, type Machine, type PUCODE, type CreateTicketRequest } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';

interface TicketFormData {
  title: string;
  description: string;
  plantId: number | null;
  areaId: number | null;
  lineId: number | null;
  machineId: number | null;
  machineNumber: number | null;
  pucode: string;
  pu_id: number | null; // Added PU ID
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  costAvoidance: number | null;
  downtimeAvoidanceHours: number | null;
  failureModeId: number;
}

interface FileWithPreview extends File {
  preview?: string;
}

const NewTicketForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    plantId: null,
    areaId: null,
    lineId: null,
    machineId: null,
    machineNumber: null,
    pucode: '',
    pu_id: null,
    severityLevel: 'medium',
    priority: 'normal',
    costAvoidance: null,
    downtimeAvoidanceHours: null,
    failureModeId: 0
  });

  // Hierarchy data
  const [plants, setPlants] = useState<Plant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // PUCODE search
  const [pucodeSearch, setPucodeSearch] = useState('');
  const [pucodeResults, setPucodeResults] = useState<PUCODE[]>([]);
  const [showPucodeResults, setShowPucodeResults] = useState(false);
  
  // File uploads
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [loadingPucode, setLoadingPucode] = useState(false);
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    loadPlants();
  }, []);

  // Load hierarchy data when selections change
  useEffect(() => {
    if (formData.plantId) {
      loadAreas(formData.plantId);
    } else {
      setAreas([]);
      setLines([]);
      setMachines([]);
      setFormData(prev => ({
        ...prev,
        areaId: null,
        lineId: null,
        machineId: null,
        machineNumber: null
      }));
    }
  }, [formData.plantId]);

  useEffect(() => {
    if (formData.areaId) {
      loadLines(formData.areaId);
    } else {
      setLines([]);
      setMachines([]);
      setFormData(prev => ({
        ...prev,
        lineId: null,
        machineId: null,
        machineNumber: null
      }));
    }
  }, [formData.areaId]);

  useEffect(() => {
    if (formData.lineId) {
      loadMachines(formData.lineId);
    } else {
      setMachines([]);
      setFormData(prev => ({
        ...prev,
        machineId: null,
        machineNumber: null
      }));
    }
  }, [formData.lineId]);

  useEffect(() => {
    if (formData.machineId) {
      const selectedMachine = machines.find(m => m.id === formData.machineId);
      if (selectedMachine) {
        setFormData(prev => ({
          ...prev,
          machineNumber: selectedMachine.machine_number
        }));
        generatePucodeFromSelection();
      }
    }
  }, [formData.machineId, machines]);

  // Load hierarchy data
  const loadPlants = async () => {
    try {
      const response = await ticketService.getPlants();
      setPlants(response.data);
    } catch (error) {
      console.error('Error loading plants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plants',
        variant: 'destructive'
      });
    }
  };

  const loadAreas = async (plantId: number) => {
    try {
      setLoadingHierarchy(true);
      const response = await ticketService.getAreasByPlant(plantId);
      setAreas(response.data);
    } catch (error) {
      console.error('Error loading areas:', error);
      toast({
        title: 'Error',
        description: 'Failed to load areas',
        variant: 'destructive'
      });
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const loadLines = async (areaId: number) => {
    try {
      setLoadingHierarchy(true);
      const response = await ticketService.getLinesByArea(areaId);
      setLines(response.data);
    } catch (error) {
      console.error('Error loading lines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lines',
        variant: 'destructive'
      });
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const loadMachines = async (lineId: number) => {
    try {
      setLoadingHierarchy(true);
      const response = await ticketService.getMachinesByLine(lineId);
      setMachines(response.data);
    } catch (error) {
      console.error('Error loading machines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machines',
        variant: 'destructive'
      });
    } finally {
      setLoadingHierarchy(false);
    }
  };

  // PUCODE search
  const searchPucode = useCallback(
    async (search: string) => {
      if (search.length < 2) {
        setPucodeResults([]);
        setShowPucodeResults(false);
        return;
      }

      try {
        setLoadingPucode(true);
        const response = await ticketService.searchPUCODE(search);
        setPucodeResults(response.data);
        setShowPucodeResults(true);
      } catch (error) {
        console.error('Error searching PUCODE:', error);
        toast({
          title: 'Error',
          description: 'Failed to search PUCODE',
          variant: 'destructive'
        });
      } finally {
        setLoadingPucode(false);
      }
    },
    [toast]
  );

  // Debounced PUCODE search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pucodeSearch) {
        searchPucode(pucodeSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pucodeSearch, searchPucode]);

  // Generate PUCODE from hierarchy selection
  const generatePucodeFromSelection = async () => {
    if (formData.plantId && formData.areaId && formData.lineId && formData.machineId) {
      try {
        const response = await ticketService.generatePUCODE(
          formData.plantId,
          formData.areaId,
          formData.lineId,
          formData.machineId
        );
        setFormData(prev => ({
          ...prev,
          pucode: response.data.pucode
        }));
      } catch (error) {
        console.error('Error generating PUCODE:', error);
      }
    }
  };

  // Handle PUCODE selection
  const handlePucodeSelect = async (pucode: string) => {
    try {
      const response = await ticketService.getPUCODEDetails(pucode);
      const { pu, hierarchy } = response.data;
      
      if (hierarchy) {
        setFormData(prev => ({
          ...prev,
          pucode: pu.PUCODE,
          pu_id: pu.PUNO,
          plantId: hierarchy.plant_id,
          areaId: hierarchy.area_id,
          lineId: hierarchy.line_id,
          machineId: hierarchy.machine_id,
          machineNumber: hierarchy.machine_number
        }));
        
        // Load the hierarchy data to populate dropdowns
        await loadAreas(hierarchy.plant_id);
        await loadLines(hierarchy.area_id);
        await loadMachines(hierarchy.line_id);
      }
      
      setShowPucodeResults(false);
      setPucodeSearch('');
    } catch (error) {
      console.error('Error loading PUCODE details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load PUCODE details',
        variant: 'destructive'
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: FileWithPreview[] = files.map(file => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.preview = URL.createObjectURL(file);
      return fileWithPreview;
    });
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  // Remove file
  const removeFile = (index: number) => {
    const file = selectedFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.pucode.trim()) {
      newErrors.pucode = 'PUCODE is required';
    }

    if (selectedFiles.length === 0) {
      newErrors.files = 'At least one attachment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const ticketData: CreateTicketRequest = {
        title: formData.title,
        description: formData.description,
        pucode: formData.pucode,
        pu_id: formData.pu_id || undefined,
        severity_level: formData.severityLevel,
        priority: formData.priority,
        cost_avoidance: formData.costAvoidance || undefined,
        downtime_avoidance_hours: formData.downtimeAvoidanceHours || undefined,
        failure_mode_id: formData.failureModeId || undefined,
      };

      const response = await ticketService.createTicket(ticketData);
      
      // Upload images if any
      if (selectedFiles.length > 0) {
        try {
          await ticketService.uploadTicketImages(
            response.data.id,
            selectedFiles,
            'other'
          );
          
          // Trigger LINE notification after images are uploaded
          try {
            await ticketService.triggerTicketNotification(response.data.id);
            console.log('LINE notification sent with images');
          } catch (notificationError) {
            console.error('Failed to send LINE notification:', notificationError);
            // Don't fail the ticket creation if notification fails
          }
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          // Don't fail the ticket creation if image upload fails
        }
      } else {
        // If no images, trigger notification immediately
        try {
          await ticketService.triggerTicketNotification(response.data.id);
          console.log('LINE notification sent without images');
        } catch (notificationError) {
          console.error('Failed to send LINE notification:', notificationError);
          // Don't fail the ticket creation if notification fails
        }
      }

      toast({
        title: 'Success',
        description: 'Ticket created successfully',
        variant: 'default'
      });

      navigate(`/tickets/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Create New Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter ticket title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the issue in detail"
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* PUCODE Search */}
            <div className="space-y-2">
              <Label htmlFor="pucode-search">Search PUCODE</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="pucode-search"
                  value={pucodeSearch}
                  onChange={(e) => setPucodeSearch(e.target.value)}
                  placeholder="Search by PUCODE..."
                  className="pl-10"
                />
                {loadingPucode && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              
              {/* PUCODE Search Results */}
              {showPucodeResults && pucodeResults.length > 0 && (
                <div className="border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                  {pucodeResults.map((pu) => (
                    <div
                      key={pu.PUCODE}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handlePucodeSelect(pu.PUCODE)}
                    >
                      <div className="font-medium">{pu.PUCODE}</div>
                      <div className="text-sm text-gray-600">{pu.PUDESC}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hierarchy Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Plant */}
              <div className="space-y-2">
                <Label htmlFor="plant">Plant *</Label>
                <Select
                  value={formData.plantId?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plantId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id.toString()}>
                        {plant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label htmlFor="area">Area *</Label>
                <Select
                  value={formData.areaId?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, areaId: parseInt(value) }))}
                  disabled={!formData.plantId || loadingHierarchy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Line */}
              <div className="space-y-2">
                <Label htmlFor="line">Line *</Label>
                <Select
                  value={formData.lineId?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lineId: parseInt(value) }))}
                  disabled={!formData.areaId || loadingHierarchy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Line" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Machine */}
              <div className="space-y-2">
                <Label htmlFor="machine">Machine *</Label>
                <Select
                  value={formData.machineId?.toString() || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, machineId: parseInt(value) }))}
                  disabled={!formData.lineId || loadingHierarchy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id.toString()}>
                        {machine.name} (#{machine.machine_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generated PUCODE */}
            {formData.pucode && (
              <div className="space-y-2">
                <Label>Generated PUCODE</Label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-mono text-green-800">{formData.pucode}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Severity and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={formData.severityLevel}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, severityLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost and Downtime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costAvoidance">Cost Avoidance ($)</Label>
                <Input
                  id="costAvoidance"
                  type="number"
                  step="0.01"
                  value={formData.costAvoidance || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    costAvoidance: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="downtimeAvoidance">Downtime Avoidance (hours)</Label>
                <Input
                  id="downtimeAvoidance"
                  type="number"
                  step="0.1"
                  value={formData.downtimeAvoidanceHours || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    downtimeAvoidanceHours: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="files">Attachments *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload images or documents
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG, PDF up to 10MB each
                      </span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
              
              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files</Label>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.files && (
                <p className="text-sm text-red-500">{errors.files}</p>
              )}
            </div>

            {/* Error Display */}
            {errors.pucode && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.pucode}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTicketForm;
