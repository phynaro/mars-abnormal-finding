import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { type TicketApproval, getApprovalLevelName } from '@/services/administrationService';

interface ApprovalListViewProps {
  approvals: TicketApproval[];
  loading: boolean;
  searchTerm: string;
  filterActive: string;
  onSearchChange: (search: string) => void;
  onFilterChange: (filter: string) => void;
  onCreate: () => void;
  onEdit: (approval: TicketApproval) => void;
  onDelete: (approval: TicketApproval) => void;
}

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

const ApprovalListView: React.FC<ApprovalListViewProps> = ({
  approvals,
  loading,
  searchTerm,
  filterActive,
  onSearchChange,
  onFilterChange,
  onCreate,
  onEdit,
  onDelete
}) => {
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.personno.toString().includes(searchTerm) ||
                         approval.person_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActive === 'all' || 
                         (filterActive === 'active' && approval.is_active) ||
                         (filterActive === 'inactive' && !approval.is_active);
    return matchesSearch && matchesActive;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ticket Approval Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can approve tickets across plants, areas, lines, and machines.
          </p>
        </div>
        <Button onClick={onCreate} disabled={loading}>
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
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by person or ID"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="active-filter" className="text-sm text-muted-foreground">
                Status
              </Label>
              <Select value={filterActive} onValueChange={onFilterChange}>
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
                          onClick={() => onEdit(approval)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(approval)}
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
};

export default ApprovalListView;

