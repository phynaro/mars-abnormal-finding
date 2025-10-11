import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Square } from 'lucide-react';
import { type Area, type Line, type Plant } from '@/services/administrationService';

interface HierarchySelectorProps {
  plants: Plant[];
  areas: Area[];
  lines: Line[];
  filteredAreas: Area[];
  filteredLines: Line[];
  selectedHierarchies: Array<{
    plant_code: string;
    area_code?: string;
    line_code?: string;
    machine_code?: string;
  }>;
  isPlantSelected: (plantCode: string) => boolean;
  isAreaSelected: (plantCode: string, areaCode: string) => boolean;
  isLineSelected: (plantCode: string, areaCode: string, lineCode: string) => boolean;
  onPlantSelection: (plantCode: string, checked: boolean) => void;
  onAreaSelection: (areaCode: string, plantCode: string, checked: boolean) => void;
  onLineSelection: (lineCode: string, plantCode: string, areaCode: string, checked: boolean) => void;
  onSelectAllPlants: () => void;
  onClearAllPlants: () => void;
  onSelectAllAreas: () => void;
  onClearAllAreas: () => void;
  onSelectAllLines: () => void;
  onClearAllLines: () => void;
}

const HierarchySelector: React.FC<HierarchySelectorProps> = ({
  plants,
  areas,
  filteredAreas,
  filteredLines,
  selectedHierarchies,
  isPlantSelected,
  isAreaSelected,
  isLineSelected,
  onPlantSelection,
  onAreaSelection,
  onLineSelection,
  onSelectAllPlants,
  onClearAllPlants,
  onSelectAllAreas,
  onClearAllAreas,
  onSelectAllLines,
  onClearAllLines
}) => {
  return (
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
                  onClick={onSelectAllPlants}
                  className="text-xs px-2 py-1"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearAllPlants}
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
                      onPlantSelection(plant.code, checked as boolean)
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
                  onClick={onSelectAllAreas}
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
                  onClick={onClearAllAreas}
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
                  if (!plant) return null;
                  return (
                    <div key={area.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area.id}`}
                        checked={isAreaSelected(plant.code, area.code)}
                        onCheckedChange={(checked) => 
                          onAreaSelection(area.code, plant.code, checked as boolean)
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
                  onClick={onSelectAllLines}
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
                  onClick={onClearAllLines}
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
                  if (!area || !plant) return null;
                  return (
                    <div key={line.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`line-${line.id}`}
                        checked={isLineSelected(plant.code, area.code, line.code)}
                        onCheckedChange={(checked) => 
                          onLineSelection(line.code, plant.code, area.code, checked as boolean)
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
      
      {selectedHierarchies.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            Selected: {selectedHierarchies.length} location(s) - {selectedHierarchies.map(h => {
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
  );
};

export default HierarchySelector;

