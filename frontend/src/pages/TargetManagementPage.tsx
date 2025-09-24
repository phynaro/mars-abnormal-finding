import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { 
  Plus, 
  Trash2, 
  Copy,
  Target as TargetIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import targetService, { type Target, type CreateTargetRequest } from '@/services/targetService';
import dashboardService, { type AreaData } from '@/services/dashboardService';

const PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];
const TARGET_TYPES = ['open case', 'close case'] as const;
const UNITS = ['case', 'THB', 'percent'] as const;

const TargetManagementPage: React.FC = () => {
  const { toast } = useToast();
  
  // State
  const [targets, setTargets] = useState<Target[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);
  
  // Filters
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [areaFilterId, setAreaFilterId] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>('open case');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateTargetRequest>({
    type: 'open case',
    year: new Date().getFullYear(),
    target_value: 0,
    unit: 'case',
    area: '',
    created_by: 'admin'
  });
  
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  
  const [periodValues, setPeriodValues] = useState<{ [period: string]: number }>({});

  // Fetch areas
  const fetchAreas = async () => {
    try {
      setAreasLoading(true);
      const response = await dashboardService.getAllAreas();
      setAreas(response.data);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch areas',
        variant: 'destructive',
      });
    } finally {
      setAreasLoading(false);
    }
  };

  // Fetch available years
  const fetchAvailableYears = async () => {
    try {
      const response = await targetService.getAvailableYears();
      setAvailableYears(response.data);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  // Fetch targets
  const fetchTargets = async () => {
    try {
      setLoading(true);
      const filters = {
        area: areaFilter !== 'all' ? areaFilter : undefined,
        year: yearFilter,
        type: typeFilter as 'open case' | 'close case'
      };
      
      const response = await targetService.getTargets(filters);
      setTargets(response.data);
    } catch (error) {
      console.error('Error fetching targets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch targets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchAreas();
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [areaFilter, yearFilter, typeFilter]);

  // Group targets by area for matrix display
  const targetsByArea = useMemo(() => {
    const grouped: { [area: string]: { [period: string]: Target } } = {};
    
    targets.forEach(target => {
      if (!grouped[target.area]) {
        grouped[target.area] = {};
      }
      grouped[target.area][target.period] = target;
    });
    
    return grouped;
  }, [targets]);

  // Get area name with plant information
  const getAreaName = (areaCode: string) => {
    const area = areas.find(a => a.code === areaCode);
    if (area) {
      return `${area.name} (${area.code}) - ${area.plant_name || `Plant ${area.plant_id}`}`;
    }
    return areaCode;
  };

  // Handle create target
  const handleCreateTarget = async () => {
    try {
      // Validate required fields
      if (!selectedAreaId) {
        toast({
          title: 'Validation Error',
          description: 'Please select an area',
          variant: 'destructive',
        });
        return;
      }

      if (!createForm.type) {
        toast({
          title: 'Validation Error',
          description: 'Please select a type',
          variant: 'destructive',
        });
        return;
      }

      if (!createForm.year) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a year',
          variant: 'destructive',
        });
        return;
      }

      // Validate that all periods have values
      const missingPeriods = PERIODS.filter(period => !periodValues[period] && periodValues[period] !== 0);
      if (missingPeriods.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please fill in values for all periods: ${missingPeriods.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // Create targets for all periods in a single API call
      const targetsToCreate = PERIODS.map(period => ({
        ...createForm,
        target_value: periodValues[period] || 0,
        period: period
      }));

      // Call the API once with all periods
      await targetService.createTargets(targetsToCreate);

      toast({
        title: 'Success',
        description: 'Targets created successfully for all periods',
      });

      setCreateDialogOpen(false);
      setCreateForm({
        type: 'open case',
        year: new Date().getFullYear(),
        target_value: 0,
        unit: 'case',
        area: '',
        created_by: 'admin'
      });
      setSelectedAreaId('');
      setPeriodValues({});
      fetchTargets();
    } catch (error) {
      console.error('Error creating target:', error);
      toast({
        title: 'Error',
        description: 'Failed to create targets',
        variant: 'destructive',
      });
    }
  };

  // Handle delete target
  const handleDeleteTarget = async (target: Target) => {
    if (!confirm(`Are you sure you want to delete all targets for ${target.type} in ${getAreaName(target.area)} for ${target.year}?`)) {
      return;
    }

    try {
      await targetService.deleteTarget(target.id);
      toast({
        title: 'Success',
        description: 'Targets deleted successfully',
      });
      fetchTargets();
    } catch (error) {
      console.error('Error deleting target:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete targets',
        variant: 'destructive',
      });
    }
  };

  // Copy P1 value to all periods
  const copyP1ToAllPeriods = () => {
    const p1Value = periodValues['P1'];
    if (p1Value !== undefined) {
      const newValues = { ...periodValues };
      PERIODS.forEach(period => {
        newValues[period] = p1Value;
      });
      setPeriodValues(newValues);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Target Management</h1>
          <p className="text-muted-foreground">
            Manage targets for abnormal finding reporting
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Target</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={createForm.type} 
                    onValueChange={(value) => setCreateForm({ ...createForm, type: value as 'open case' | 'close case' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="area">Area (Select one area only)</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={selectedAreaId} 
                      onValueChange={(value) => {
                        setSelectedAreaId(value);
                        const selectedArea = areas.find(a => a.id.toString() === value);
                        if (selectedArea) {
                          setCreateForm({ ...createForm, area: selectedArea.code });
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map(area => (
                          <SelectItem key={area.id} value={area.id.toString()}>
                            {area.name} ({area.code}) - {area.plant_name || `Plant ${area.plant_id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAreaId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAreaId('');
                          setCreateForm({ ...createForm, area: '' });
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {selectedAreaId && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {areas.find(a => a.id.toString() === selectedAreaId)?.name} ({areas.find(a => a.id.toString() === selectedAreaId)?.code}) - {areas.find(a => a.id.toString() === selectedAreaId)?.plant_name || `Plant ${areas.find(a => a.id.toString() === selectedAreaId)?.plant_id}`}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={createForm.year}
                    onChange={(e) => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                    min="2020"
                    max="2030"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select 
                    value={createForm.unit} 
                    onValueChange={(value) => setCreateForm({ ...createForm, unit: value as 'case' | 'THB' | 'percent' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Period Values */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Period Values (All periods must be filled)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={copyP1ToAllPeriods}
                    disabled={periodValues['P1'] === undefined}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy P1 to All
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {PERIODS.map(period => (
                    <div key={period} className="space-y-2">
                      <Label htmlFor={period}>{period}</Label>
                      <Input
                        id={period}
                        type="number"
                        value={periodValues[period] || ''}
                        onChange={(e) => setPeriodValues({ 
                          ...periodValues, 
                          [period]: parseFloat(e.target.value) || 0 
                        })}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTarget}>
                  Create Target
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Area</Label>
              <Select value={areaFilterId} onValueChange={(value) => {
                setAreaFilterId(value);
                if (value === 'all') {
                  setAreaFilter('all');
                } else {
                  const selectedArea = areas.find(a => a.id.toString() === value);
                  if (selectedArea) {
                    setAreaFilter(selectedArea.code);
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={areasLoading ? "Loading..." : "Select area"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name} ({area.code}) - {area.plant_name || `Plant ${area.plant_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={yearFilter.toString()} onValueChange={(value) => setYearFilter(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={fetchTargets} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TargetIcon className="h-5 w-5" />
            Targets - {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} ({yearFilter})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading targets...
            </div>
          ) : Object.keys(targetsByArea).length === 0 ? (
            <Alert>
              <AlertDescription>
                No targets found for the selected filters. Create a new target to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Area</TableHead>
                    {PERIODS.map(period => (
                      <TableHead key={period} className="text-center min-w-[80px]">
                        {period}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(targetsByArea).map(([areaCode, areaTargets]) => (
                    <TableRow key={areaCode}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {getAreaName(areaCode)}
                      </TableCell>
                      {PERIODS.map(period => (
                        <TableCell key={period} className="text-center">
                          {areaTargets[period] ? (
                            <span className="font-mono text-sm">
                              {areaTargets[period].target_value}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const firstTarget = Object.values(areaTargets)[0];
                            if (firstTarget) {
                              handleDeleteTarget(firstTarget);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetManagementPage;
