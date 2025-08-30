import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { machineService } from '@/services/machineService';
import type { Machine, MachineFilters } from '@/services/machineService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface MachineListProps {
  onViewMachine: (machine: Machine) => void;
  onEditMachine: (machine: Machine) => void;
  onCreateMachine: () => void;
}

const MachineList: React.FC<MachineListProps> = ({
  onViewMachine,
  onEditMachine,
  onCreateMachine
}) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<MachineFilters>({});

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await machineService.getAllMachines(page, 10, filters);
      setMachines(response.data);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [page, filters]);

  const handleFilterChange = (key: keyof MachineFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Active': 'default',
      'Maintenance': 'secondary',
      'Inactive': 'destructive',
      'Retired': 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getCriticalityBadge = (criticality: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Low': 'outline',
      'Medium': 'default',
      'High': 'secondary',
      'Critical': 'destructive'
    };
    return <Badge variant={variants[criticality] || 'outline'}>{criticality}</Badge>;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Machine Management</h2>
        <Button onClick={onCreateMachine} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Machine
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search machines..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.department || ''} onValueChange={(value) => handleFilterChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Departments</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Assembly">Assembly</SelectItem>
                <SelectItem value="Logistics">Logistics</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Facilities">Facilities</SelectItem>
                <SelectItem value="Packaging">Packaging</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.machineType || ''} onValueChange={(value) => handleFilterChange('machineType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Machine Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Types</SelectItem>
                <SelectItem value="CNC Machine">CNC Machine</SelectItem>
                <SelectItem value="Conveyor System">Conveyor System</SelectItem>
                <SelectItem value="Press Machine">Press Machine</SelectItem>
                <SelectItem value="Compressor">Compressor</SelectItem>
                <SelectItem value="Laser Equipment">Laser Equipment</SelectItem>
                <SelectItem value="Material Handling">Material Handling</SelectItem>
                <SelectItem value="Robotic System">Robotic System</SelectItem>
                <SelectItem value="Cooling System">Cooling System</SelectItem>
                <SelectItem value="Packaging Equipment">Packaging Equipment</SelectItem>
                <SelectItem value="Power Generation">Power Generation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.criticality || ''} onValueChange={(value) => handleFilterChange('criticality', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Criticality</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Machine List */}
      <div className="grid gap-4">
        {machines.map((machine) => (
          <Card key={machine.MachineID} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{machine.MachineName}</h3>
                    <Badge variant="outline">{machine.MachineCode}</Badge>
                    {getStatusBadge(machine.Status)}
                    {getCriticalityBadge(machine.Criticality)}
                  </div>
                  <div className="text-sm muted-foreground space-y-1">
                    <p><span className="font-medium">Type:</span> {machine.MachineType}</p>
                    <p><span className="font-medium">Location:</span> {machine.Location || 'N/A'}</p>
                    <p><span className="font-medium">Department:</span> {machine.Department || 'N/A'}</p>
                    {machine.Manufacturer && <p><span className="font-medium">Manufacturer:</span> {machine.Manufacturer}</p>}
                    {machine.Model && <p><span className="font-medium">Model:</span> {machine.Model}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewMachine(machine)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditMachine(machine)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 py-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default MachineList;
