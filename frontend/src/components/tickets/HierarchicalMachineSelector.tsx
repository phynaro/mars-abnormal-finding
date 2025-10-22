import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { hierarchyService } from '@/services/hierarchyService';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

interface HierarchyOption {
  code: string;
  name: string;
  type?: string;
  puno?: number;
  pucode?: string;
  plant?: string;
  area?: string;
  line?: string;
  machine?: string;
  number?: string;
  puname?: string;
  pudescription?: string;
  digit_count?: number;
}

interface SelectedMachine {
  puno: number;
  pucode: string;
  plant: string;
  area: string;
  line: string;
  machine: string;
  number: string;
  puname: string;
  pudescription: string;
  digit_count: number;
}

interface HierarchicalMachineSelectorProps {
  onMachineSelect: (machine: SelectedMachine) => void;
  onClear: () => void;
  selectedMachineData: SelectedMachine | null;
  disabled?: boolean;
}

const HierarchicalMachineSelector: React.FC<HierarchicalMachineSelectorProps> = ({
  onMachineSelect,
  onClear,
  selectedMachineData,
  disabled = false
}) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  // State for each hierarchy level
  const [plants, setPlants] = useState<HierarchyOption[]>([]);
  const [areas, setAreas] = useState<HierarchyOption[]>([]);
  const [lines, setLines] = useState<HierarchyOption[]>([]);
  const [machines, setMachines] = useState<HierarchyOption[]>([]);

  // Selected values
  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');

  // Loading states
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);

  // Load plants on mount
  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      setLoadingPlants(true);
      const response = await hierarchyService.getDistinctPlants();
      if (response.success) {
        setPlants(response.data);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load plants',
        variant: 'destructive'
      });
    } finally {
      setLoadingPlants(false);
    }
  };

  const loadAreas = async (plant: string) => {
    try {
      setLoadingAreas(true);
      const response = await hierarchyService.getDistinctAreas(plant);
      if (response.success) {
        setAreas(response.data);
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load areas',
        variant: 'destructive'
      });
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadLines = async (plant: string, area: string) => {
    try {
      setLoadingLines(true);
      const response = await hierarchyService.getLinesOrMachinesAfterArea(plant, area);
      if (response.success) {
        // Add lines with a "None" option if there are machines without lines
        const linesData = response.data.lines.map(item => ({ ...item, type: 'line' }));
        
        // If there are machines without lines, add a "None" option
        if (response.data.machines.length > 0) {
          linesData.push({
            code: 'none',
            name: t('ticket.noneOption'),
            type: 'none'
          });
        }
        
        setLines(linesData);
      }
    } catch (error) {
      console.error('Error loading lines:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load lines',
        variant: 'destructive'
      });
    } finally {
      setLoadingLines(false);
    }
  };

  const loadMachines = async (plant: string, area: string, line: string) => {
    try {
      setLoadingMachines(true);
      
      if (line === 'none') {
        // Load machines without lines
        const response = await hierarchyService.getDistinctMachinesWithoutLines(plant, area);
        if (response.success) {
          setMachines(response.data);
        }
      } else {
        // Load machines for the specific line
        const response = await hierarchyService.getDistinctMachines(plant, area, line);
        if (response.success) {
          setMachines(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load machines',
        variant: 'destructive'
      });
    } finally {
      setLoadingMachines(false);
    }
  };

  const handlePlantChange = (value: string) => {
    setSelectedPlant(value);
    setSelectedArea('');
    setSelectedLine('');
    setSelectedMachine('');
    setAreas([]);
    setLines([]);
    setMachines([]);
    onClear();
    
    if (value) {
      loadAreas(value);
    }
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedLine('');
    setSelectedMachine('');
    setLines([]);
    setMachines([]);
    onClear();
    
    if (value && selectedPlant) {
      loadLines(selectedPlant, value);
    }
  };

  const handleLineChange = (value: string) => {
    setSelectedLine(value);
    setSelectedMachine('');
    setMachines([]);
    onClear();
    
    if (value && selectedPlant && selectedArea) {
      loadMachines(selectedPlant, selectedArea, value);
    }
  };

  const handleMachineChange = (value: string) => {
    setSelectedMachine(value);
    
    if (value && selectedPlant && selectedArea && selectedLine) {
      // Find the selected machine data from the machines array
      const selectedMachineData = machines.find(m => m.code === value);
      if (selectedMachineData) {
        // Use the machine data directly since it now contains all the details
        onMachineSelect(selectedMachineData as SelectedMachine);
        // Don't clear selections - keep them visible to show what was selected
      }
    }
  };

  const clearAllSelections = () => {
    setSelectedPlant('');
    setSelectedArea('');
    setSelectedLine('');
    setSelectedMachine('');
    setAreas([]);
    setLines([]);
    setMachines([]);
    onClear();
  };

  const getSelectedPath = () => {
    const path = [];
    if (selectedPlant) {
      const plant = plants.find(p => p.code === selectedPlant);
      path.push(plant?.name || selectedPlant);
    }
    if (selectedArea) {
      const area = areas.find(a => a.code === selectedArea);
      path.push(area?.name || selectedArea);
    }
    if (selectedLine) {
      const line = lines.find(l => l.code === selectedLine);
      path.push(line?.name || selectedLine);
    }
    if (selectedMachine) {
      const machine = machines.find(m => m.code === selectedMachine);
      path.push(machine?.name || selectedMachine);
    }
    return path.join(' → ');
  };

  return (
    <div className="space-y-4">
      {/* Hierarchy Path Display */}
      {getSelectedPath() && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">{t('ticket.hierarchyPathSelected')}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={disabled}
                className="text-blue-600 hover:text-blue-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2 text-sm text-blue-700 font-mono">
              {getSelectedPath()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cascading Dropdowns */}
      <div className="grid gap-4">
        {/* Plant Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('ticket.selectPlant')}</Label>
          <Select
            value={selectedPlant}
            onValueChange={handlePlantChange}
            disabled={disabled || loadingPlants}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingPlants ? "Loading plants..." : "Select plant..."} />
            </SelectTrigger>
              <SelectContent>
                {plants.map((plant, index) => (
                  <SelectItem key={`plant-${plant.code}-${index}`} value={plant.code}>
                    <span>{plant.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
        </div>

        {/* Area Selection */}
        {selectedPlant && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('ticket.selectArea')}</Label>
            <Select
              value={selectedArea}
              onValueChange={handleAreaChange}
              disabled={disabled || loadingAreas}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingAreas ? "Loading areas..." : "Select area..."} />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area, index) => (
                  <SelectItem key={`area-${area.code}-${index}`} value={area.code}>
                    <span>{area.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Line Selection */}
        {selectedArea && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('ticket.selectLine')}</Label>
            <Select
              value={selectedLine}
              onValueChange={handleLineChange}
              disabled={disabled || loadingLines}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingLines ? "Loading lines..." : "Select line..."} />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line, index) => (
                  <SelectItem key={`line-${line.code}-${index}`} value={line.code}>
                    <span>{line.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Machine Selection */}
        {selectedLine && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('ticket.selectMachine')}</Label>
            <Select
              value={selectedMachine}
              onValueChange={handleMachineChange}
              disabled={disabled || loadingMachines}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingMachines ? "Loading machines..." : "Select machine..."} />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine, index) => (
                  <SelectItem key={`machine-${machine.code}-${index}`} value={machine.code}>
                    <span>{machine.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        {t('ticket.hierarchyHelpText')}
      </p>
    </div>
  );
};

export default HierarchicalMachineSelector;
