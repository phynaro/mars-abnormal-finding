import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import administrationService, { 
  type TicketApproval,
  type TicketApprovalSummary,
  type CreateTicketApprovalRequest,
  type Area, 
  type Line, 
  type Plant, 
  type Person,
  type LookupData
} from '@/services/administrationService';
import { ApprovalFormView, ApprovalListView } from '@/components/ticket-approval';

type ViewMode = 'list' | 'create' | 'edit';

// Types for simplified lookup data
type SimplifiedPlant = LookupData['plants'][number];
type SimplifiedArea = LookupData['areas'][number];
type SimplifiedLine = LookupData['lines'][number];

const TicketApprovalManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [approvals, setApprovals] = useState<TicketApprovalSummary[]>([]);
  const [plants, setPlants] = useState<SimplifiedPlant[]>([]);
  const [areas, setAreas] = useState<SimplifiedArea[]>([]);
  const [lines, setLines] = useState<SimplifiedLine[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<TicketApprovalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterApprovalLevel, setFilterApprovalLevel] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
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
    approval_level: 2,
    is_active: true,
    hierarchies: []
  });

  // Filtered data for UI
  const [filteredAreas, setFilteredAreas] = useState<SimplifiedArea[]>([]);
  const [filteredLines, setFilteredLines] = useState<SimplifiedLine[]>([]);
  
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
        
        // Filter lines based on selected plants - but if areas are selected, we'll filter further in handleAreaSelection
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
    
    // Update filtered lines based on selected areas - must match BOTH plant and area
    const selectedAreaCodes = formData.hierarchies
      .filter(h => h.area_code)
      .map(h => ({ areaCode: h.area_code!, plantCode: h.plant_code }));
    
    if (checked) {
      selectedAreaCodes.push({ areaCode, plantCode });
    }
    
    if (selectedAreaCodes.length > 0) {
      // Get area IDs with their associated plant IDs
      const selectedAreaPlantPairs = selectedAreaCodes
        .map(({ areaCode, plantCode }) => {
          const area = areas.find(a => a.code === areaCode);
          const plant = plants.find(p => p.code === plantCode);
          if (!area || !plant) return null;
          return { areaId: area.id, plantId: plant.id };
        })
        .filter(Boolean) as { areaId: number; plantId: number }[];
      
      // Filter lines that match BOTH area_id and plant_id
      setFilteredLines(lines.filter(line => 
        selectedAreaPlantPairs.some(pair => 
          line.area_id === pair.areaId && line.plant_id === pair.plantId
        )
      ));
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
    
    // Filter lines that match BOTH area_id and plant_id
    setFilteredLines(lines.filter(line => 
      filteredAreas.some(area => 
        area.id === line.area_id && area.plant_id === line.plant_id
      )
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
      approval_level: 2,
      is_active: true,
      hierarchies: []
    });
    setPersonSearch('');
    setFilteredAreas([]);
    setFilteredLines([]);
    setExistingApprovalLevels([]);
    setViewMode('create');
  }

  const handleEdit = async (approval: TicketApprovalSummary) => {
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
        // Load the detailed approvals for this person and level to check for duplicates
        let filteredApprovalsToCreate = approvalsToCreate;
        let existingApprovalsCount = 0;
        try {
          const existingApprovals = await administrationService.ticketApproval.getByPersonAndLevel(
            formData.personno,
            formData.approval_level
          );
          existingApprovalsCount = existingApprovals.length;
          
          filteredApprovalsToCreate = approvalsToCreate.filter(newApproval => {
            return !existingApprovals.some(existing => 
              existing.plant_code === newApproval.plant_code &&
              (existing.area_code || '') === (newApproval.area_code || '') &&
              (existing.line_code || '') === (newApproval.line_code || '') &&
              (existing.machine_code || '') === (newApproval.machine_code || '')
            );
          });
        } catch (error) {
          console.log('No existing approvals found, creating all');
        }
        
        console.log('=== FRONTEND: Filtered approvals ===');
        console.log('Existing approvals for this person/level:', existingApprovalsCount);
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
        console.log('Form data hierarchies:', formData.hierarchies);
        console.log('Form data hierarchies length:', formData.hierarchies.length);
        
        if (formData.hierarchies.length === 0) {
          toast({
            title: 'Error',
            description: 'Please select at least one location',
            variant: 'destructive'
          });
          return;
        }
        
        // Delete all existing approvals for this person/level using personno and approval_level
        console.log('Deleting existing approvals for person:', selectedApproval.personno, 'level:', selectedApproval.approval_level);
        try {
          const deleteResult = await administrationService.ticketApproval.deleteByPersonAndLevel(
            selectedApproval.personno, 
            selectedApproval.approval_level
          );
          console.log('Deletion complete. Deleted count:', deleteResult.count);
        } catch (deleteError: any) {
          console.log('Delete error (may be expected if no existing approvals):', deleteError.message);
          // Continue anyway - it's ok if there are no existing approvals to delete
        }

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
        
        console.log('=== FRONTEND: Creating new approvals ===');
        console.log('Approvals to create:', JSON.stringify(approvalsToCreate, null, 2));
        console.log('Approvals count:', approvalsToCreate.length);
        
        // Use bulk create to insert all new approvals
        const result = await administrationService.ticketApproval.createMultiple(approvalsToCreate);
        console.log('=== FRONTEND: Bulk approval response ===');
        console.log('Result:', result);
        
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

  const handleEditApproval = async (approval: TicketApprovalSummary) => {
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

  const handleDeleteApproval = async (approval: TicketApprovalSummary) => {
    const personName = approval.person_name || `Person #${approval.personno}`;
    if (!confirm(`Are you sure you want to delete all ${approval.total_approvals} approval(s) for ${personName} at Level ${approval.approval_level}?`)) {
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

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ApprovalFormView
        viewMode={viewMode}
        loading={loading}
        formData={formData}
        persons={persons}
        plants={plants}
        areas={areas}
        lines={lines}
        filteredAreas={filteredAreas}
        filteredLines={filteredLines}
        existingApprovalLevels={existingApprovalLevels}
        personSearch={personSearch}
        showPersonSearch={showPersonSearch}
        showCopyDialog={showCopyDialog}
        copyFromPersonno={copyFromPersonno}
        copyFromApprovalLevel={copyFromApprovalLevel}
        approvals={approvals}
        onSubmit={handleSubmit}
        onCancel={() => setViewMode('list')}
        onPersonSearchChange={(search) => {
          handlePersonSearch(search);
          setShowPersonSearch(true);
        }}
        onPersonSearchFocus={() => setShowPersonSearch(true)}
        onPersonSelect={selectPerson}
        onApprovalLevelChange={(level) => setFormData({ ...formData, approval_level: level })}
        onStatusChange={(isActive) => setFormData({ ...formData, is_active: isActive })}
        onShowCopyDialog={setShowCopyDialog}
        setCopyFromPersonno={setCopyFromPersonno}
        setCopyFromApprovalLevel={setCopyFromApprovalLevel}
        onCopyPermissions={handleCopyPermissions}
        isPlantSelected={isPlantSelected}
        isAreaSelected={isAreaSelected}
        isLineSelected={isLineSelected}
        onPlantSelection={handlePlantSelection}
        onAreaSelection={handleAreaSelection}
        onLineSelection={handleLineSelection}
        onSelectAllPlants={handleSelectAllPlants}
        onClearAllPlants={handleClearAllPlants}
        onSelectAllAreas={handleSelectAllAreas}
        onClearAllAreas={handleClearAllAreas}
        onSelectAllLines={handleSelectAllLines}
        onClearAllLines={handleClearAllLines}
      />
    );
  }

  return (
    <ApprovalListView
      approvals={approvals}
      loading={loading}
      searchTerm={searchTerm}
      filterActive={filterActive}
      filterApprovalLevel={filterApprovalLevel}
      filterDepartment={filterDepartment}
      onSearchChange={setSearchTerm}
      onFilterChange={setFilterActive}
      onApprovalLevelFilterChange={setFilterApprovalLevel}
      onDepartmentFilterChange={setFilterDepartment}
      onCreate={handleCreate}
      onEdit={handleEditApproval}
      onDelete={handleDeleteApproval}
    />
  );
};

export default TicketApprovalManagementPage;
