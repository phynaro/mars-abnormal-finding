import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronRight, Factory, Building2, Cog, Wrench, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/useToast';
import administrationService from '@/services/administrationService';

interface HierarchyItem {
  code: string;
  name: string;
  description?: string;
  puno: number;
  pucode: string;
  machine_number?: string;
}

interface HierarchyData {
  plants: Record<string, {
    code: string;
    name: string;
    description?: string;
    puno: number;
    pucode: string;
    areas: Record<string, {
      code: string;
      name: string;
      description?: string;
      puno: number;
      pucode: string;
      lines: Record<string, {
        code: string;
        name: string;
        description?: string;
        puno: number;
        pucode: string;
        machines: Record<string, HierarchyItem>;
      }>;
      machines?: Record<string, HierarchyItem>; // Machines directly under area (when line is NULL)
    }>;
  }>;
}

interface HierarchyViewResponse {
  flat: Array<{
    id: number;
    puno: number;
    pucode: string;
    plant: string;
    area: string;
    line: string;
    machine: string;
    number?: string;
    digit_count: number;
    hierarchy_level: string;
    full_path: string;
    puname: string;
    pudescription?: string;
    created_at: string;
    updated_at: string;
  }>;
  hierarchy: HierarchyData;
  summary: {
    totalItems: number;
    plants: number;
    totalAreas: number;
    totalLines: number;
    totalMachines: number;
  };
}

const HierarchyViewPage: React.FC = () => {
  const [hierarchyData, setHierarchyData] = useState<HierarchyViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadHierarchyData();
  }, []);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      const data = await administrationService.hierarchy.getHierarchyView();
      setHierarchyData(data);
   
      // Start with everything collapsed by default
      setExpandedItems(new Set());
    } catch (error) {
      console.error('Error loading hierarchy data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hierarchy data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Function to check if a plant matches the search term
  const plantMatchesSearch = (plant: any): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Check plant level
    if ((plant.name?.toLowerCase().includes(term) ?? false) || 
        (plant.code?.toLowerCase().includes(term) ?? false)) {
      return true;
    }
    
    // Check if any area matches
    return Object.values(plant.areas).some((area: any) => areaMatchesSearch(area, term));
  };

  // Function to check if an area matches the search term
  const areaMatchesSearch = (area: any, term: string): boolean => {
    // Check area level
    if ((area.name?.toLowerCase().includes(term) ?? false) || 
        (area.code?.toLowerCase().includes(term) ?? false)) {
      return true;
    }
    
    // Check if any line matches
    const lineMatches = Object.values(area.lines).some((line: any) => lineMatchesSearch(line, term));
    
    // Check if any area-level machine matches
    const areaMachineMatches = area.machines ? 
      Object.values(area.machines).some((machine: any) => 
        (machine.name?.toLowerCase().includes(term) ?? false) ||
        (machine.code?.toLowerCase().includes(term) ?? false)
      ) : false;
    
    return lineMatches || areaMachineMatches;
  };

  // Function to check if a line matches the search term
  const lineMatchesSearch = (line: any, term: string): boolean => {
    // Check line level
    if ((line.name?.toLowerCase().includes(term) ?? false) || 
        (line.code?.toLowerCase().includes(term) ?? false)) {
      return true;
    }
    
    // Check if any machine matches
    return Object.values(line.machines).some((machine: any) => 
      (machine.name?.toLowerCase().includes(term) ?? false) ||
      (machine.code?.toLowerCase().includes(term) ?? false)
    );
  };

  // Get filtered plants that match the search
  const filteredPlants = hierarchyData?.hierarchy.plants ? 
    Object.entries(hierarchyData.hierarchy.plants).filter(([, plant]) => plantMatchesSearch(plant)) : [];

  const PlantCard: React.FC<{ plantCode: string; plant: any }> = ({ plantCode, plant }) => {
    const isExpanded = expandedItems.has(`plant-${plantCode}`);
    // Filter areas based on search term
    const filteredAreas = Object.entries(plant.areas).filter(([, area]) => 
      !searchTerm || areaMatchesSearch(area, searchTerm.toLowerCase())
    );

    return (
      <Card className="mb-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(`plant-${plantCode}`)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{plant.name}</CardTitle>
                      <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
                        {plant.pucode}
                      </span>
                    </div>
                    {searchTerm && (
                      <p className="text-xs text-blue-600 font-medium">
                        🔍 {filteredAreas.length} areas
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{filteredAreas.length}</Badge>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pl-4 py-2">
              {filteredAreas.map(([areaCode, area]) => (
                <AreaCard key={areaCode} areaCode={areaCode} area={area} plantCode={plantCode} />
              ))}
              {searchTerm && filteredAreas.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No areas match your search</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const AreaCard: React.FC<{ areaCode: string; area: any; plantCode: string }> = ({ areaCode, area, plantCode }) => {
    const isExpanded = expandedItems.has(`area-${plantCode}-${areaCode}`);
    // Filter lines based on search term
    const filteredLines = Object.entries(area.lines).filter(([, line]) => 
      !searchTerm || lineMatchesSearch(line, searchTerm.toLowerCase())
    );
    
    // Filter area-level machines based on search term
    const filteredAreaMachines = area.machines ? 
      Object.entries(area.machines).filter(([, machine]: [string, HierarchyItem]) => 
        !searchTerm || 
        (machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (machine.code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      ) : [];

    const totalItems = filteredLines.length + filteredAreaMachines.length;

    return (
      <Card className="mb-2 ml-3">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(`area-${plantCode}-${areaCode}`)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-green-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{area.name}</div>
                      <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
                        {area.pucode}
                      </span>
                    </div>
        
                    {searchTerm && (
                      <p className="text-xs text-blue-600 font-medium">
                        🔍 {totalItems} items ({filteredLines.length}L, {filteredAreaMachines.length}M)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{totalItems}</Badge>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pl-4 py-2">
              {/* Area-level machines (machines without lines) */}
              {filteredAreaMachines.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Wrench className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-medium text-muted-foreground">Direct</span>
                    <Badge variant="secondary" className="text-xs px-1 py-0">{filteredAreaMachines.length}</Badge>
                  </div>
                  {filteredAreaMachines.map(([machineCode, machine]) => (
                    <MachineCard key={`area-machine-${machineCode}`} machineCode={machineCode} machine={machine} />
                  ))}
                </div>
              )}
              
              {/* Lines */}
              {filteredLines.map(([lineCode, line]) => (
                <LineCard key={lineCode} lineCode={lineCode} line={line} areaCode={areaCode} plantCode={plantCode} />
              ))}
              
              {searchTerm && totalItems === 0 && (
                <p className="text-sm text-muted-foreground italic">No items match your search</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const LineCard: React.FC<{ lineCode: string; line: any; areaCode: string; plantCode: string }> = ({ lineCode, line, areaCode, plantCode }) => {
    const isExpanded = expandedItems.has(`line-${plantCode}-${areaCode}-${lineCode}`);
    // Filter machines based on search term
    const filteredMachines = Object.entries(line.machines).filter(([, machine]: [string, HierarchyItem]) => 
      !searchTerm || 
      (machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (machine.code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    return (
      <Card className="mb-1 ml-3">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(`line-${plantCode}-${areaCode}-${lineCode}`)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cog className="h-3 w-3 text-orange-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{line.name}</div>
                      <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
                        {line.pucode}
                      </span>
                    </div>
                    {searchTerm && (
                      <p className="text-xs text-blue-600 font-medium">
                        🔍 {filteredMachines.length} machines
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{filteredMachines.length}</Badge>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pl-4 py-1">
              {filteredMachines.map(([machineCode, machine]) => (
                <MachineCard key={machineCode} machineCode={machineCode} machine={machine} />
              ))}
              {searchTerm && filteredMachines.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No machines match your search</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const MachineCard: React.FC<{ machineCode: string; machine: any }> = ({ machineCode, machine }) => (
    <Card className="mb-1 ml-3">
      <CardHeader className="py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-3 w-3 text-red-600" />
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">{machine.name}</div>
              <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
                {machine.pucode}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">M</Badge>
        </div>
      </CardHeader>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-200" />
          <Skeleton className="h-4 w-150" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hierarchy View</h1>
            <p className="text-muted-foreground">
              Plant → Area → Line → Machine hierarchy from PUExtension data
            </p>
          </div>
          <Button onClick={loadHierarchyData} variant="outline">
            Refresh Data
          </Button>
        </div>

        {/* Summary Stats */}
        {hierarchyData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{hierarchyData.summary.plants}</div>
                    <p className="text-sm text-muted-foreground">Plants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{hierarchyData.summary.totalAreas}</div>
                    <p className="text-sm text-muted-foreground">Areas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Cog className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{hierarchyData.summary.totalLines}</div>
                    <p className="text-sm text-muted-foreground">Lines</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{hierarchyData.summary.totalMachines}</div>
                    <p className="text-sm text-muted-foreground">Machines</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search plants, areas, lines, or machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Hierarchy Tree */}
      <ScrollArea className="h-[69vh]">
        <div className="space-y-4">
          {hierarchyData ? (
            <>
              {filteredPlants.map(([plantCode, plant]) => (
                <PlantCard key={plantCode} plantCode={plantCode} plant={plant} />
              ))}
              {searchTerm && filteredPlants.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-6xl">🔍</div>
                      <div>
                        <h3 className="text-lg font-semibold">No results found</h3>
                        <p className="text-muted-foreground">
                          No plants, areas, lines, or machines match "{searchTerm}"
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setSearchTerm('')}>
                        Clear Search
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!searchTerm && filteredPlants.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No hierarchy data available</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No hierarchy data available</p>
                <Button onClick={loadHierarchyData} className="mt-4">
                  Load Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HierarchyViewPage;
