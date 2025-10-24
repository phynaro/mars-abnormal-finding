import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Area, type Line, type Plant, type Person, type TicketApproval } from '@/services/administrationService';
import HierarchySelector from './HierarchySelector';
import CopyPermissionsDialog from './CopyPermissionsDialog';

interface ApprovalFormViewProps {
  viewMode: 'create' | 'edit';
  loading: boolean;
  formData: {
    personno: number;
    approval_level: number;
    is_active: boolean;
    hierarchies: Array<{
      plant_code: string;
      area_code?: string;
      line_code?: string;
      machine_code?: string;
    }>;
  };
  persons: Person[];
  plants: Plant[];
  areas: Area[];
  lines: Line[];
  filteredAreas: Area[];
  filteredLines: Line[];
  existingApprovalLevels: number[];
  personSearch: string;
  showPersonSearch: boolean;
  showCopyDialog: boolean;
  copyFromPersonno: number | null;
  copyFromApprovalLevel: number | null;
  approvals: TicketApproval[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onPersonSearchChange: (search: string) => void;
  onPersonSearchFocus: () => void;
  onPersonSelect: (person: Person) => void;
  onApprovalLevelChange: (level: number) => void;
  onStatusChange: (isActive: boolean) => void;
  onShowCopyDialog: (show: boolean) => void;
  setCopyFromPersonno: (personno: number | null) => void;
  setCopyFromApprovalLevel: (level: number | null) => void;
  onCopyPermissions: () => void;
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

const ApprovalFormView: React.FC<ApprovalFormViewProps> = ({
  viewMode,
  loading,
  formData,
  persons,
  plants,
  areas,
  lines,
  filteredAreas,
  filteredLines,
  existingApprovalLevels,
  personSearch,
  showPersonSearch,
  showCopyDialog,
  copyFromPersonno,
  copyFromApprovalLevel,
  approvals,
  onSubmit,
  onCancel,
  onPersonSearchChange,
  onPersonSearchFocus,
  onPersonSelect,
  onApprovalLevelChange,
  onStatusChange,
  onShowCopyDialog,
  setCopyFromPersonno,
  setCopyFromApprovalLevel,
  onCopyPermissions,
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
  const isApprovalLevelDisabled = (level: number) => {
    return viewMode === 'create' && existingApprovalLevels.includes(level);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-8xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'create' ? 'Create New Ticket Approval' : 'Edit Ticket Approval'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Person Selection */}
              <div>
                <Label htmlFor="personno">Person *</Label>
                <div className="relative person-search-container">
                  <Input
                    id="personno"
                    value={personSearch}
                    onChange={(e) => onPersonSearchChange(e.target.value)}
                    onFocus={onPersonSearchFocus}
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
                          onClick={() => onPersonSelect(person)}
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
                  onValueChange={(value) => onApprovalLevelChange(parseInt(value))}
                  disabled={viewMode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approval level" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem 
                      value="1" 
                      disabled={isApprovalLevelDisabled(1)}
                    >
                      Level 1 {isApprovalLevelDisabled(1) && '(Already exists)'}
                    </SelectItem> */}
                    <SelectItem 
                      value="2" 
                      disabled={isApprovalLevelDisabled(2)}
                    >
                      Level 2 (Assignee) {isApprovalLevelDisabled(2) && '(Already exists)'}
                    </SelectItem>
                    <SelectItem 
                      value="3" 
                      disabled={isApprovalLevelDisabled(3)}
                    >
                      Level 3 (Planner) {isApprovalLevelDisabled(3) && '(Already exists)'}
                    </SelectItem>
                    <SelectItem 
                      value="4" 
                      disabled={isApprovalLevelDisabled(4)}
                    >
                      Level 4 (Line Manager) {isApprovalLevelDisabled(4) && '(Already exists)'}
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
                      onClick={() => onShowCopyDialog(true)}
                      className="text-xs"
                    >
                      Copy from existing user
                    </Button>
                  </div>
                )}
              </div>

              {/* Hierarchical Selection */}
              <HierarchySelector
                plants={plants}
                areas={areas}
                lines={lines}
                filteredAreas={filteredAreas}
                filteredLines={filteredLines}
                selectedHierarchies={formData.hierarchies}
                isPlantSelected={isPlantSelected}
                isAreaSelected={isAreaSelected}
                isLineSelected={isLineSelected}
                onPlantSelection={onPlantSelection}
                onAreaSelection={onAreaSelection}
                onLineSelection={onLineSelection}
                onSelectAllPlants={onSelectAllPlants}
                onClearAllPlants={onClearAllPlants}
                onSelectAllAreas={onSelectAllAreas}
                onClearAllAreas={onClearAllAreas}
                onSelectAllLines={onSelectAllLines}
                onClearAllLines={onClearAllLines}
              />

              {/* Status */}
              <div>
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => onStatusChange(value === 'active')}
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
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Copy Permissions Dialog */}
      <CopyPermissionsDialog
        show={showCopyDialog}
        onClose={() => {
          onShowCopyDialog(false);
          setCopyFromPersonno(null);
          setCopyFromApprovalLevel(null);
        }}
        onCopy={onCopyPermissions}
        approvals={approvals}
        currentPersonno={formData.personno}
        loading={loading}
        copyFromPersonno={copyFromPersonno}
        copyFromApprovalLevel={copyFromApprovalLevel}
        setCopyFromPersonno={setCopyFromPersonno}
        setCopyFromApprovalLevel={setCopyFromApprovalLevel}
      />
    </div>
  );
};

export default ApprovalFormView;

