import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import administrationService, { 
  type TicketApproval, 
  type CreateTicketApprovalRequest,
  type Area, 
  type Line, 
  type Plant, 
  type Person,
  getApprovalLevelName
} from '@/services/administrationService';
import { Plus, Edit, Trash2, Search, CheckSquare, Square } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

const TicketApprovalManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [approvals, setApprovals] = useState<TicketApproval[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<TicketApproval | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [personSearch, setPersonSearch] = useState('');
  const [showPersonSearch, setShowPersonSearch] = useState(false);
  const { toast } = useToast();

  // Form state - simplified to use hierarchy objects directly
  const [formData, setFormData] = useState<{
    personno: number;
    approval_level: number;
    is_active: boolean;
    hierarchies: Array<{
      plant_code: string;
      area_code?: string;
      line_code?: string;
      machine_code?: string;
    }>;
  }>({
    personno: 0,
    approval_level: 1,
    is_active: true,
    hierarchies: []
  });

  // Filtered data for UI
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([]);
  const [filteredLines, setFilteredLines] = useState<Line[]>([]);
  
  // Track existing approval levels for selected user
  const [existingApprovalLevels, setExistingApprovalLevels] = useState<number[]>([]);
  
  // Copy permissions functionality
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromPersonno, setCopyFromPersonno] = useState<number | null>(null);
  const [copyFromApprovalLevel, setCopyFromApprovalLevel] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Check existing approval levels for selected user
  const checkExistingApprovalLevels = async (personno: number) => {
    if (personno === 0) {
      setExistingApprovalLevels([]);
      return;
    }
    
    try {
      const existingApprovals = approvals.filter(approval => approval.personno === personno);
      const levels = [...new Set(existingApprovals.map(approval => approval.approval_level))];
      setExistingApprovalLevels(levels);
    } catch (error) {
      console.error('Error checking existing approval levels:', error);
      setExistingApprovalLevels([]);
    }
  }

  // Check if approval level is disabled
  const isApprovalLevelDisabled = (level: number) => {
    return viewMode === 'create' && existingApprovalLevels.includes(level);
  }

  // Copy permissions from another user
  const handleCopyPermissions = async () => {
    if (!copyFromPersonno || !copyFromApprovalLevel) {
      toast({
        title: 'Error',
        description: 'Please select a user and approval level to copy from',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Load permissions from the selected user and level
      const sourceApprovals = await administrationService.ticketApproval.getByPersonAndLevel(
        copyFromPersonno, 
        copyFromApprovalLevel
      );
      
      if (sourceApprovals.length === 0) {
        toast({
          title: 'Info',
          description: 'No permissions found for the selected user and level',
          variant: 'default'
        });
        return;
      }
      
      // Convert to hierarchy objects
      const hierarchies = sourceApprovals.map(approval => ({
        plant_code: approval.plant_code,
        area_code: approval.area_code || undefined,
        line_code: approval.line_code || undefined,
        machine_code: approval.machine_code || undefined
      }));
      
      // Update form data with copied permissions
      setFormData(prev => ({
        ...prev,
        approval_level: copyFromApprovalLevel,
        hierarchies: hierarchies
      }));
      
      // Update filtered areas and lines based on copied plants
      const selectedPlantCodes = [...new Set(hierarchies.map(h => h.plant_code))];
      if (selectedPlantCodes.length > 0) {
        const selectedPlantIds = selectedPlantCodes.map(code => 
          plants.find(p => p.code === code)?.id
        ).filter(Boolean) as number[];
        
        setFilteredAreas(areas.filter(area => selectedPlantIds.includes(area.plant_id)));
        setFilteredLines(lines.filter(line => selectedPlantIds.includes(line.plant_id)));
      }
      
      // Close dialog
      setShowCopyDialog(false);
      setCopyFromPersonno(null);
      setCopyFromApprovalLevel(null);
      
      toast({
        title: 'Success',
        description: `Copied ${hierarchies.length} permission(s) from the selected user`,
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error copying permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  // Helper functions for managing hierarchy in formData
  const addPlantToHierarchy = (plantCode: string) => {
    setFormData(prev => ({
      ...prev,
      hierarchies: [...prev.hierarchies, { plant_code: plantCode }]
    }));
  }

  const removePlantFromHierarchy = (plantCode: string) => {
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => h.plant_code !== plantCode)
    }));
  }

  const addAreaToHierarchy = (plantCode: string, areaCode: string) => {
    setFormData(prev => {
      const newHierarchies = [...prev.hierarchies];
      
      // Check if this specific area already exists
      const existingAreaIndex = newHierarchies.findIndex(h => 
        h.plant_code === plantCode && h.area_code === areaCode && !h.line_code
      );
      
      if (existingAreaIndex === -1) {
        // Add new area-level entry (keep plant-level entry)
        newHierarchies.push({ plant_code: plantCode, area_code: areaCode });
      }
      
      return { ...prev, hierarchies: newHierarchies }
    });
  }

  const removeAreaFromHierarchy = (plantCode: string, areaCode: string) => {
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => !(h.plant_code === plantCode && h.area_code === areaCode))
    }));
  }

  const addLineToHierarchy = (plantCode: string, areaCode: string, lineCode: string) => {
    setFormData(prev => {
      const newHierarchies = [...prev.hierarchies];
      
      // Check if this specific line already exists
      const existingLineIndex = newHierarchies.findIndex(h => 
        h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode && !h.machine_code
      );
      
      if (existingLineIndex === -1) {
        // Add new line-level entry (keep plant and area level entries)
        newHierarchies.push({ plant_code: plantCode, area_code: areaCode, line_code: lineCode });
      }
      
      return { ...prev, hierarchies: newHierarchies }
    });
  }

  const removeLineFromHierarchy = (plantCode: string, areaCode: string, lineCode: string) => {
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => 
        !(h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode)
      )
    }));
  }

  const addMachineToHierarchy = (plantCode: string, areaCode: string, lineCode: string, machineCode: string) => {
    setFormData(prev => {
      const newHierarchies = [...prev.hierarchies];
      
      // Check if this specific machine already exists
      const existingMachineIndex = newHierarchies.findIndex(h => 
        h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode && h.machine_code === machineCode
      );
      
      if (existingMachineIndex === -1) {
        // Add new machine-level entry (keep plant, area, and line level entries)
        newHierarchies.push({ 
          plant_code: plantCode, 
          area_code: areaCode, 
          line_code: lineCode, 
          machine_code: machineCode 
        });
      }
      
      return { ...prev, hierarchies: newHierarchies }
    });
  }

  const removeMachineFromHierarchy = (plantCode: string, areaCode: string, lineCode: string, machineCode: string) => {
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => 
        !(h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode && h.machine_code === machineCode)
      )
    }));
  }

  // Check if a hierarchy level is selected
  const isPlantSelected = (plantCode: string) => {
    return formData.hierarchies.some(h => h.plant_code === plantCode);
  }

  const isAreaSelected = (plantCode: string, areaCode: string) => {
    return formData.hierarchies.some(h => h.plant_code === plantCode && h.area_code === areaCode);
  }

  const isLineSelected = (plantCode: string, areaCode: string, lineCode: string) => {
    return formData.hierarchies.some(h => 
      h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode
    );
  }

  const isMachineSelected = (plantCode: string, areaCode: string, lineCode: string, machineCode: string) => {
    return formData.hierarchies.some(h => 
      h.plant_code === plantCode && h.area_code === areaCode && h.line_code === lineCode && h.machine_code === machineCode
    );
  }

  // Close person search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.person-search-container')) {
        setShowPersonSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsData, lookupData] = await Promise.all([
        administrationService.ticketApproval.getAll(),
        administrationService.lookup.getLookupData()
      ]);
      
      setApprovals(approvalsData);
      setPlants(lookupData.plants);
      setAreas(lookupData.areas);
      setLines(lookupData.lines);
      setFilteredAreas(lookupData.areas);
      setFilteredLines(lookupData.lines);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  // Hierarchical selection handlers
  const handlePlantSelection = (plantCode: string, checked: boolean) => {
    if (checked) {
      addPlantToHierarchy(plantCode);
    } else {
      // Remove all hierarchies for this plant
      setFormData(prev => ({
        ...prev,
        hierarchies: prev.hierarchies.filter(h => h.plant_code !== plantCode)
      }));
    }
    
    // Update filtered areas based on selected plants
    const selectedPlantCodes = formData.hierarchies.map(h => h.plant_code);
    if (checked) {
      selectedPlantCodes.push(plantCode);
    }
    
    if (selectedPlantCodes.length > 0) {
      const selectedPlantIds = selectedPlantCodes.map(code => 
        plants.find(p => p.code === code)?.id
      ).filter(Boolean) as number[];
      
      setFilteredAreas(areas.filter(area => selectedPlantIds.includes(area.plant_id)));
    } else {
      setFilteredAreas([]);
      setFilteredLines([]);
    }
  }

  const handleAreaSelection = (areaCode: string, plantCode: string, checked: boolean) => {
    // Find the area within the specific plant
    const plant = plants.find(p => p.code === plantCode);
    if (!plant) return;
    
    const area = areas.find(a => a.code === areaCode && a.plant_id === plant.id);
    if (!area) return;
    
    if (checked) {
      addAreaToHierarchy(plant.code, areaCode);
    } else {
      // Remove all hierarchies for this plant-area combination
      setFormData(prev => ({
        ...prev,
        hierarchies: prev.hierarchies.filter(h => 
          !(h.plant_code === plant.code && h.area_code === areaCode)
        )
      }));
    }
    
    // Update filtered lines based on selected areas
    const selectedAreaCodes = formData.hierarchies
      .filter(h => h.area_code)
      .map(h => h.area_code!);
    
    if (checked) {
      selectedAreaCodes.push(areaCode);
    }
    
    if (selectedAreaCodes.length > 0) {
      const selectedAreaIds = selectedAreaCodes.map(code => 
        areas.find(a => a.code === code)?.id
      ).filter(Boolean) as number[];
      
      setFilteredLines(lines.filter(line => selectedAreaIds.includes(line.area_id)));
    } else {
      setFilteredLines([]);
    }
  }

  const handleLineSelection = (lineCode: string, plantCode: string, areaCode: string, checked: boolean) => {
    // Find the line within the specific plant and area
    const plant = plants.find(p => p.code === plantCode);
    if (!plant) return;
    
    const area = areas.find(a => a.code === areaCode && a.plant_id === plant.id);
    if (!area) return;
    
    const line = lines.find(l => l.code === lineCode && l.area_id === area.id);
    if (!line) return;
    
    if (checked) {
      addLineToHierarchy(plant.code, area.code, lineCode);
    } else {
      // Remove all hierarchies for this plant-area-line combination
      setFormData(prev => ({
        ...prev,
        hierarchies: prev.hierarchies.filter(h => 
          !(h.plant_code === plant.code && h.area_code === area.code && h.line_code === lineCode)
        )
      }));
    }
  }

  const handleSelectAllPlants = () => {
    const allPlantCodes = plants.map(plant => plant.code);
    setFormData(prev => ({
      ...prev,
      hierarchies: allPlantCodes.map(plantCode => ({ plant_code: plantCode }))
    }));
    setFilteredAreas(areas);
    setFilteredLines(lines);
  }

  const handleClearAllPlants = () => {
    setFormData(prev => ({
      ...prev,
      hierarchies: []
    }));
    setFilteredAreas([]);
    setFilteredLines([]);
  }

  const handleSelectAllAreas = () => {
    // Start with existing hierarchies
    const newHierarchies = [...formData.hierarchies];
    
    // Add all area-level entries for the filtered areas
    filteredAreas.forEach(area => {
      const plant = plants.find(p => p.id === area.plant_id);
      if (plant) {
        // Check if this specific area already exists
        const exists = newHierarchies.some(h => 
          h.plant_code === plant.code && h.area_code === area.code && !h.line_code
        );
        if (!exists) {
          newHierarchies.push({ plant_code: plant.code, area_code: area.code });
        }
      }
    });
    
    setFormData(prev => ({
      ...prev,
      hierarchies: newHierarchies
    }));
    
    setFilteredLines(lines.filter(line => 
      filteredAreas.some(area => area.id === line.area_id)
    ));
  }

  const handleClearAllAreas = () => {
    // Remove only area-level entries (those with area_code but no line_code)
    // Keep plant-level entries and line-level entries
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => 
        !h.area_code || h.line_code // Keep plant-level (no area_code) and line-level (has line_code)
      )
    }));
    setFilteredLines([]);
  }

  const handleSelectAllLines = () => {
    // Start with existing hierarchies
    const newHierarchies = [...formData.hierarchies];
    
    // Add all line-level entries for the filtered lines
    filteredLines.forEach(line => {
      const area = areas.find(a => a.id === line.area_id);
      const plant = plants.find(p => p.id === line.plant_id);
      if (area && plant) {
        // Check if this specific line already exists
        const exists = newHierarchies.some(h => 
          h.plant_code === plant.code && h.area_code === area.code && h.line_code === line.code && !h.machine_code
        );
        if (!exists) {
          newHierarchies.push({ 
            plant_code: plant.code, 
            area_code: area.code, 
            line_code: line.code 
          });
        }
      }
    });
    
    setFormData(prev => ({
      ...prev,
      hierarchies: newHierarchies
    }));
  }

  const handleClearAllLines = () => {
    // Remove all line-level and below hierarchies, keep only plant and area level
    setFormData(prev => ({
      ...prev,
      hierarchies: prev.hierarchies.filter(h => !h.line_code)
    }));
  }

  const handleCreate = () => {
    setSelectedApproval(null);
    setFormData({
      personno: 0,
      approval_level: 1,
      is_active: true,
      hierarchies: []
    });
    setPersonSearch('');
    setFilteredAreas([]);
    setFilteredLines([]);
    setExistingApprovalLevels([]);
    setViewMode('create');
  }

  const handleEdit = async (approval: TicketApproval) => {
    try {
      setLoading(true);
      
      // Load all approvals for this person and level
      const allApprovalsForPersonLevel = await administrationService.ticketApproval.getByPersonAndLevel(
        approval.personno, 
        approval.approval_level
      );
      
      console.log('Loaded approvals for edit:', allApprovalsForPersonLevel);
      
    setSelectedApproval(approval);
      
      // Convert existing approvals to hierarchy objects
      const hierarchies = allApprovalsForPersonLevel.map(approval => ({
        plant_code: approval.plant_code,
        area_code: approval.area_code || undefined,
        line_code: approval.line_code || undefined,
        machine_code: approval.machine_code || undefined
      }));
      
    setFormData({
        personno: approval.personno,
        approval_level: approval.approval_level,
        is_active: approval.is_active,
        hierarchies: hierarchies
      });
      
      // Set person search
    if (approval.person_name) {
        setPersonSearch(`${approval.person_name} (${approval.personno})`);
    } else {
      setPersonSearch(`Person #${approval.personno}`);
    }
      
      // Check existing approval levels for this user
      checkExistingApprovalLevels(approval.personno);
      
      // Filter areas and lines based on selected plants
      const selectedPlantCodes = [...new Set(hierarchies.map(h => h.plant_code))];
      if (selectedPlantCodes.length > 0) {
        const selectedPlantIds = selectedPlantCodes.map(code => 
          plants.find(p => p.code === code)?.id
        ).filter(Boolean) as number[];
        
        setFilteredAreas(areas.filter(area => selectedPlantIds.includes(area.plant_id)));
        setFilteredLines(lines.filter(line => selectedPlantIds.includes(line.plant_id)));
      }
      
    setViewMode('edit');
    } catch (error) {
      console.error('Error loading approvals for edit:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approval data for editing',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }


  const searchPersons = async (search: string) => {
    if (search.length < 2) {
      setPersons([]);
      return;
    }
    try {
      const results = await administrationService.person.searchPersons(search, 10);
      setPersons(results);
    } catch (error) {
      console.error('Error searching persons:', error);
    }
  }

  const handlePersonSearch = (search: string) => {
    setPersonSearch(search);
    searchPersons(search);
  }

  const selectPerson = (person: Person) => {
    setFormData(prev => ({ ...prev, personno: person.PERSONNO }));
    setPersonSearch(`${person.PERSON_NAME} (${person.PERSONCODE})`);
    setShowPersonSearch(false);
    setPersons([]);
    
    // Check existing approval levels for this user
    checkExistingApprovalLevels(person.PERSONNO);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.personno || formData.hierarchies.length === 0 || !formData.approval_level) {
      toast({
        title: 'Error',
        description: 'Please select a person, at least one location, and approval level',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      if (viewMode === 'create') {
        // Create approvals directly from formData hierarchies
        console.log('=== FRONTEND: Starting approval creation ===');
        console.log('Form data:', formData);
        
        const approvalsToCreate: CreateTicketApprovalRequest[] = formData.hierarchies.map(hierarchy => ({
          personno: formData.personno,
          plant_code: hierarchy.plant_code,
          area_code: hierarchy.area_code || undefined,
          line_code: hierarchy.line_code || undefined,
          machine_code: hierarchy.machine_code || undefined,
          approval_level: formData.approval_level,
        is_active: formData.is_active
        }));
        
        console.log('=== FRONTEND: Generated approvals ===');
        console.log('Total approvals to create:', approvalsToCreate.length);
        console.log('Approvals to create:', approvalsToCreate);
        
        // Check for duplicates against existing approvals
        const existingApprovals = approvals.filter(a => a.personno === formData.personno && a.approval_level === formData.approval_level);
        const filteredApprovalsToCreate = approvalsToCreate.filter(newApproval => {
          return !existingApprovals.some(existing => 
            existing.plant_code === newApproval.plant_code &&
            (existing.area_code || '') === (newApproval.area_code || '') &&
            (existing.line_code || '') === (newApproval.line_code || '') &&
            (existing.machine_code || '') === (newApproval.machine_code || '')
          );
        });
        
        console.log('=== FRONTEND: Filtered approvals ===');
        console.log('Existing approvals for this person/level:', existingApprovals.length);
        console.log('Filtered approvals to create:', filteredApprovalsToCreate.length);
        console.log('Skipped duplicates:', approvalsToCreate.length - filteredApprovalsToCreate.length);
        
        if (filteredApprovalsToCreate.length === 0) {
          toast({
            title: 'Info',
            description: 'All selected locations already have approvals for this person and level',
            variant: 'default'
          });
          return;
        }
        
        // Create all approvals using bulk API
        console.log('=== FRONTEND: Sending bulk approval request ===');
        console.log('Approvals to create:', JSON.stringify(approvalsToCreate, null, 2));
        console.log('Approvals count:', approvalsToCreate.length);
        
        const result = await administrationService.ticketApproval.createMultiple(filteredApprovalsToCreate);
        console.log('=== FRONTEND: Bulk approval response ===');
        console.log('Result:', result);
        
        toast({
          title: 'Success',
          description: `Ticket approval created successfully for ${filteredApprovalsToCreate.length} location(s)${approvalsToCreate.length > filteredApprovalsToCreate.length ? ` (${approvalsToCreate.length - filteredApprovalsToCreate.length} duplicates skipped)` : ''}`
        });
      } else if (viewMode === 'edit' && selectedApproval) {
        // Update existing approval - Delete all and recreate
        console.log('=== FRONTEND: Starting approval update ===');
        console.log('Form data:', formData);
        
        // Delete all existing approvals for this person/level using personno and approval_level
        await administrationService.ticketApproval.deleteByPersonAndLevel(
          selectedApproval.personno, 
          selectedApproval.approval_level
        );

        // Create new approvals directly from formData hierarchies
        const approvalsToCreate: CreateTicketApprovalRequest[] = formData.hierarchies.map(hierarchy => ({
          personno: formData.personno,
          plant_code: hierarchy.plant_code,
          area_code: hierarchy.area_code || undefined,
          line_code: hierarchy.line_code || undefined,
          machine_code: hierarchy.machine_code || undefined,
          approval_level: formData.approval_level,
          is_active: formData.is_active
        }));
        
        console.log('Approvals to create:', approvalsToCreate);
        // Use bulk create to insert all new approvals
        const result = await administrationService.ticketApproval.createMultiple(approvalsToCreate);
        
        toast({
          title: 'Success',
          description: `Ticket approval updated successfully for ${result.count} location(s)`
        });
      }
      
      await loadData();
      setViewMode('list');
      setPersonSearch('');
    } catch (error: any) {
      console.log('=== FRONTEND: Error occurred ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message || 'Unknown error');
      console.error('Error stack:', error.stack || 'No stack trace');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ticket approval',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (approval: TicketApproval) => {
    if (!confirm(`Are you sure you want to delete this approval for person ${approval.personno}?`)) {
      return;
    }

    // Use setTimeout to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        setLoading(true);
        await administrationService.ticketApproval.delete(approval.id);
        toast({
          title: 'Success',
          description: 'Ticket approval deleted successfully'
        });
        await loadData();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete ticket approval',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }, 0);
  }

  const handleEditApproval = async (approval: TicketApproval) => {
    try {
      setLoading(true);
      
      // Load all approvals for this person and level
      const allApprovalsForPersonLevel = await administrationService.ticketApproval.getByPersonAndLevel(
        approval.personno, 
        approval.approval_level
      );
      
      console.log('Loaded approvals for edit:', allApprovalsForPersonLevel);
      
      setSelectedApproval(approval);
      
      // Convert existing approvals to hierarchy objects
      const hierarchies = allApprovalsForPersonLevel.map(approval => ({
        plant_code: approval.plant_code,
        area_code: approval.area_code || undefined,
        line_code: approval.line_code || undefined,
        machine_code: approval.machine_code || undefined
      }));
      
      setFormData({
        personno: approval.personno,
        approval_level: approval.approval_level,
        is_active: approval.is_active,
        hierarchies: hierarchies
      });
      
      // Set person search
      if (approval.person_name) {
        setPersonSearch(`${approval.person_name} (${approval.personno})`);
      } else {
        setPersonSearch(`Person #${approval.personno}`);
      }
      
      // Check existing approval levels for this user
      checkExistingApprovalLevels(approval.personno);
      
      // Filter areas and lines based on selected plants
      const selectedPlantCodes = [...new Set(hierarchies.map(h => h.plant_code))];
      if (selectedPlantCodes.length > 0) {
        const selectedPlantIds = selectedPlantCodes.map(code => 
          plants.find(p => p.code === code)?.id
        ).filter(Boolean) as number[];
        
        setFilteredAreas(areas.filter(area => selectedPlantIds.includes(area.plant_id)));
        setFilteredLines(lines.filter(line => selectedPlantIds.includes(line.plant_id)));
      }
      
      setViewMode('edit');
    } catch (error) {
      console.error('Error loading approvals for edit:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approval data for editing',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteApproval = async (approval: TicketApproval) => {
    const personName = approval.person_name || `Person #${approval.personno}`;
    if (!confirm(`Are you sure you want to delete all ${approval.total_approvals || 0} approval(s) for ${personName} at Level ${approval.approval_level}?`)) {
      return;
    }

    // Use setTimeout to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        setLoading(true);
        
        // Get all individual approvals for this person/level combination
        const allApprovalsForPersonLevel = await administrationService.ticketApproval.getByPersonAndLevel(
          approval.personno, 
          approval.approval_level
        );

        // Delete all individual approvals
        const deletePromises = allApprovalsForPersonLevel.map(individualApproval => 
          administrationService.ticketApproval.delete(individualApproval.id!)
        );
        
        await Promise.all(deletePromises);
        
        toast({
          title: 'Success',
          description: `Successfully deleted ${allApprovalsForPersonLevel.length} approval(s) for ${personName}`
        });
        await loadData();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete ticket approvals',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }, 0);
  }

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.personno.toString().includes(searchTerm) ||
                         approval.person_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActive === 'all' || 
                         (filterActive === 'active' && approval.is_active) ||
                         (filterActive === 'inactive' && !approval.is_active);
    return matchesSearch && matchesActive;
  });

  const getLocationSummary = (approval: TicketApproval) => {
    const parts = [
      approval.plant_name || approval.plant_code,
      approval.area_name || approval.area_code,
      approval.line_name || approval.line_code,
      approval.machine_name || approval.machine_code
    ].filter(Boolean);

    if (parts.length === 0) {
      return approval.location_scope || 'All Locations';
    }

    return parts.join(' → ');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === 'create' ? 'Create New Ticket Approval' : 'Edit Ticket Approval'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Person Selection */}
                <div>
                  <Label htmlFor="personno">Person *</Label>
                  <div className="relative person-search-container">
                    <Input
                      id="personno"
                      value={personSearch}
                      onChange={(e) => {
                        handlePersonSearch(e.target.value);
                        setShowPersonSearch(true);
                      }}
                      onFocus={() => setShowPersonSearch(true)}
                      placeholder="Search for person..."
                      required
                      className={!formData.personno ? "border-red-500" : ""}
                    />
                    {!formData.personno && (
                      <p className="text-sm text-red-500 mt-1">Please select a person</p>
                    )}
                    {showPersonSearch && persons.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {persons.map((person) => (
                          <div
                            key={person.PERSONNO}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectPerson(person)}
                          >
                            <div className="font-medium">{person.PERSON_NAME}</div>
                            <div className="text-sm text-gray-500">
                              {person.PERSONCODE} • {person.FIRSTNAME} {person.LASTNAME}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Level */}
                <div>
                  <Label htmlFor="approval_level">Approval Level *</Label>
                  <Select
                    value={formData.approval_level.toString()}
                    onValueChange={(value) => setFormData({ ...formData, approval_level: parseInt(value) })}
                    disabled={viewMode === 'edit'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approval level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="1" 
                        disabled={isApprovalLevelDisabled(1)}
                      >
                        Level 1 {isApprovalLevelDisabled(1) && '(Already exists)'}
                        </SelectItem>
                      <SelectItem 
                        value="2" 
                        disabled={isApprovalLevelDisabled(2)}
                      >
                        Level 2 {isApprovalLevelDisabled(2) && '(Already exists)'}
                      </SelectItem>
                      <SelectItem 
                        value="3" 
                        disabled={isApprovalLevelDisabled(3)}
                      >
                        Level 3 {isApprovalLevelDisabled(3) && '(Already exists)'}
                      </SelectItem>
                      <SelectItem 
                        value="4" 
                        disabled={isApprovalLevelDisabled(4)}
                      >
                        Level 4 {isApprovalLevelDisabled(4) && '(Already exists)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {viewMode === 'edit' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Approval level cannot be changed when editing
                    </p>
                  )}
                  {viewMode === 'create' && existingApprovalLevels.length > 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      Some approval levels are disabled because they already exist for this user
                    </p>
                  )}
                  {viewMode === 'create' && formData.personno > 0 && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCopyDialog(true)}
                        className="text-xs"
                      >
                        Copy from existing user
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hierarchical Selection */}
                <div>
                  <Label>Select Lines *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {/* Plants Column */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Plants</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAllPlants}
                              className="text-xs px-2 py-1"
                            >
                              <CheckSquare className="w-3 h-3 mr-1" />
                              All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleClearAllPlants}
                              className="text-xs px-2 py-1"
                            >
                              <Square className="w-3 h-3 mr-1" />
                              Clear
                            </Button>
                </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {plants.map((plant) => (
                            <div key={plant.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`plant-${plant.id}`}
                                checked={isPlantSelected(plant.code)}
                                onCheckedChange={(checked) => 
                                  handlePlantSelection(plant.code, checked as boolean)
                                }
                              />
                              <Label htmlFor={`plant-${plant.id}`} className="text-sm">
                                {plant.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Areas Column */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Areas</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAllAreas}
                              className="text-xs px-2 py-1"
                              disabled={filteredAreas.length === 0}
                            >
                              <CheckSquare className="w-3 h-3 mr-1" />
                              All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleClearAllAreas}
                              className="text-xs px-2 py-1"
                            >
                              <Square className="w-3 h-3 mr-1" />
                              Clear
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredAreas.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Select plants first
                            </p>
                          ) : (
                            filteredAreas.map((area) => {
                              const plant = plants.find(p => p.id === area.plant_id);
                              if (!plant) return null; // Skip if plant not found
                              return (
                                <div key={area.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`area-${area.id}`}
                                    checked={isAreaSelected(plant.code, area.code)}
                                    onCheckedChange={(checked) => 
                                      handleAreaSelection(area.code, plant.code, checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`area-${area.id}`} className="text-sm">
                                    {plant.name} - {area.name}
                                  </Label>
                                </div>
                              );
                            }).filter(Boolean)
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lines Column */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Lines</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAllLines}
                              className="text-xs px-2 py-1"
                              disabled={filteredLines.length === 0}
                            >
                              <CheckSquare className="w-3 h-3 mr-1" />
                              All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleClearAllLines}
                              className="text-xs px-2 py-1"
                            >
                              <Square className="w-3 h-3 mr-1" />
                              Clear
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredLines.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Select areas first
                            </p>
                          ) : (
                            filteredLines.map((line) => {
                              const area = areas.find(a => a.id === line.area_id);
                              const plant = plants.find(p => p.id === line.plant_id);
                              if (!area || !plant) return null; // Skip if area or plant not found
                              return (
                                <div key={line.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`line-${line.id}`}
                                    checked={isLineSelected(plant.code, area.code, line.code)}
                                    onCheckedChange={(checked) => 
                                      handleLineSelection(line.code, plant.code, area.code, checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`line-${line.id}`} className="text-sm">
                                    {plant.name} - {area.name} - {line.name}
                                  </Label>
                                </div>
                              );
                            }).filter(Boolean)
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {formData.hierarchies.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700">
                        Selected: {formData.hierarchies.length} location(s) - {formData.hierarchies.map(h => {
                          const parts = [h.plant_code];
                          if (h.area_code) parts.push(h.area_code);
                          if (h.line_code) parts.push(h.line_code);
                          if (h.machine_code) parts.push(h.machine_code);
                          return parts.join('-');
                        }).join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading || !formData.personno || formData.hierarchies.length === 0 || !formData.approval_level}
                  >
                    {loading ? 'Saving...' : (viewMode === 'create' ? 'Create' : 'Update')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setViewMode('list')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        {/* Copy Permissions Dialog */}
        {showCopyDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Copy Permissions from Existing User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Select User to Copy From */}
                <div>
                  <Label htmlFor="copy-from-user">Select User to Copy From *</Label>
                  <Select
                    value={copyFromPersonno?.toString() || ''}
                    onValueChange={(value) => setCopyFromPersonno(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvals
                        .filter(approval => approval.personno !== formData.personno) // Exclude current user
                        .reduce((unique, approval) => {
                          if (!unique.find(u => u.personno === approval.personno)) {
                            unique.push(approval);
                          }
                          return unique;
                        }, [] as TicketApproval[])
                        .map((approval) => (
                          <SelectItem key={approval.personno} value={approval.personno.toString()}>
                            {approval.person_name || `Person #${approval.personno}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select Approval Level to Copy From */}
                {copyFromPersonno && (
                  <div>
                    <Label htmlFor="copy-from-level">Select Approval Level to Copy From *</Label>
                    <Select
                      value={copyFromApprovalLevel?.toString() || ''}
                      onValueChange={(value) => setCopyFromApprovalLevel(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select approval level" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvals
                          .filter(approval => approval.personno === copyFromPersonno)
                          .reduce((unique, approval) => {
                            if (!unique.find(u => u.approval_level === approval.approval_level)) {
                              unique.push(approval);
                            }
                            return unique;
                          }, [] as TicketApproval[])
                          .map((approval) => (
                            <SelectItem key={approval.approval_level} value={approval.approval_level.toString()}>
                              Level {approval.approval_level}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCopyPermissions}
                    disabled={loading || !copyFromPersonno || !copyFromApprovalLevel}
                  >
                    {loading ? 'Copying...' : 'Copy Permissions'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCopyDialog(false);
                      setCopyFromPersonno(null);
                      setCopyFromApprovalLevel(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ticket Approval Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can approve tickets across plants, areas, lines, and machines.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          New Approval
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by person or ID"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="active-filter" className="text-sm text-muted-foreground">
                Status
              </Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger id="active-filter" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Person</th>
                  <th className="px-3 py-2">Approval Level</th>
                  <th className="px-3 py-2">Locations</th>
                  <th className="px-3 py-2">Assignments</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((approval) => (
                  <tr key={`${approval.personno}-${approval.approval_level}`} className="border-b last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {approval.person_name || `Person #${approval.personno}`}
                      </div>
                      <div className="text-xs text-muted-foreground">#{approval.personno}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">Level {approval.approval_level}</div>
                      <div className="text-xs text-muted-foreground">
                        {getApprovalLevelName(approval.approval_level)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-xs truncate" title={getLocationSummary(approval)}>
                        {getLocationSummary(approval)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary">{approval.total_approvals ?? '-'}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={approval.is_active ? 'default' : 'secondary'}>
                        {approval.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditApproval(approval)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteApproval(approval)}
                          className="text-destructive"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredApprovals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      {searchTerm ? 'No approvals match your search.' : 'No ticket approvals found yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TicketApprovalManagementPage;
