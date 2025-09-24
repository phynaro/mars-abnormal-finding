import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ToastStack from '@/components/ui/toast-stack';
import { useToast } from '@/hooks/useToast';
import administrationService, {
  type Line,
  type Plant,
  type Area,
} from '@/services/administrationService';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const LineManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [lines, setLines] = useState<Line[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const { toast, toasts, removeToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    plant_id: '',
    area_id: '',
    name: '',
    description: '',
    code: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linesData, lookupData] = await Promise.all([
        administrationService.line.getAll(),
        administrationService.lookup.getLookupData(),
      ]);
      setLines(linesData);
      setPlants(lookupData.plants);
      setAreas(lookupData.areas);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedLine(null);
    setFormData({
      plant_id: '',
      area_id: '',
      name: '',
      description: '',
      code: '',
      is_active: true,
    });
    setViewMode('create');
  };

  const handleEdit = (line: Line) => {
    setSelectedLine(line);
    setFormData({
      plant_id: line.plant_id.toString(),
      area_id: line.area_id.toString(),
      name: line.name,
      description: line.description || '',
      code: line.code,
      is_active: line.is_active,
    });
    setViewMode('edit');
  };

  const handleView = (line: Line) => {
    setSelectedLine(line);
    setViewMode('view');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plant_id || !formData.area_id) {
      toast({
        title: 'Error',
        description: 'Please select both plant and area',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        plant_id: parseInt(formData.plant_id),
        area_id: parseInt(formData.area_id),
      };

      if (viewMode === 'create') {
        await administrationService.line.create(submitData);
        toast({
          title: 'Success',
          description: 'Line created successfully',
          variant: 'default',
        });
      } else if (viewMode === 'edit' && selectedLine) {
        await administrationService.line.update(selectedLine.id, submitData);
        toast({
          title: 'Success',
          description: 'Line updated successfully',
          variant: 'default',
        });
      }

      await loadData();
      setViewMode('list');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save line',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (line: Line) => {
    if (!confirm(`Are you sure you want to delete line "${line.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await administrationService.line.delete(line.id);
      toast({
        title: 'Success',
        description: 'Line deleted successfully',
        variant: 'default',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete line',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLines = lines.filter((line) => {
    const matchesSearch =
      line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant =
      filterPlant === 'all' || line.plant_id.toString() === filterPlant;
    const matchesArea =
      filterArea === 'all' || line.area_id.toString() === filterArea;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && line.is_active) ||
      (filterActive === 'inactive' && !line.is_active);
    return matchesSearch && matchesPlant && matchesArea && matchesActive;
  });

  const filteredAreas = areas.filter(
    (area) =>
      !formData.plant_id || area.plant_id.toString() === formData.plant_id,
  );

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === 'create' ? 'Create New Line' : 'Edit Line'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="plant_id">Plant *</Label>
                    <Select
                      value={formData.plant_id}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          plant_id: value,
                          area_id: '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((plant) => (
                          <SelectItem
                            key={plant.id}
                            value={plant.id.toString()}
                          >
                            {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="area_id">Area *</Label>
                    <Select
                      value={formData.area_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, area_id: value })
                      }
                      disabled={!formData.plant_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an area" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAreas.map((area) => (
                          <SelectItem key={area.id} value={area.id.toString()}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="is_active">Status</Label>
                    <Select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          is_active: value === 'active',
                        })
                      }
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
                    <Button type="submit" disabled={loading}>
                      {loading
                        ? 'Saving...'
                        : viewMode === 'create'
                          ? 'Create'
                          : 'Update'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewMode('list')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  if (viewMode === 'view' && selectedLine) {
    const plant = plants.find((p) => p.id === selectedLine.plant_id);
    const area = areas.find((a) => a.id === selectedLine.area_id);

    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Line Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Name
                  </Label>
                  <p className="text-lg">{selectedLine.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Code
                  </Label>
                  <p className="text-lg">{selectedLine.code}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Plant
                  </Label>
                  <p className="text-lg">{plant?.name || 'Unknown'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Area
                  </Label>
                  <p className="text-lg">{area?.name || 'Unknown'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Description
                  </Label>
                  <p className="text-lg">
                    {selectedLine.description || 'No description'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <Badge
                    variant={selectedLine.is_active ? 'default' : 'secondary'}
                  >
                    {selectedLine.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Created
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedLine.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedLine.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleEdit(selectedLine)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setViewMode('list')}>
                    Back to List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Line Management</h1>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Line
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search lines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterPlant} onValueChange={setFilterPlant}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Plants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id.toString()}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                  {filteredLines.map((line) => {
                    const plant = plants.find((p) => p.id === line.plant_id);
                    const area = areas.find((a) => a.id === line.area_id);
                    return (
                      <div
                        key={line.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{line.name}</h3>
                            <Badge
                              variant={line.is_active ? 'default' : 'secondary'}
                            >
                              {line.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Code: {line.code}
                          </p>
                          <p className="text-sm text-gray-500">
                            Plant: {plant?.name || 'Unknown'} → Area:{' '}
                            {area?.name || 'Unknown'}
                          </p>
                          {line.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {line.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(line)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(line)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(line)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredLines.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No lines found
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Code</th>
                        <th className="text-left p-3 font-medium">Plant</th>
                        <th className="text-left p-3 font-medium">Area</th>
                        <th className="text-left p-3 font-medium">
                          Description
                        </th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLines.map((line) => {
                        const plant = plants.find(
                          (p) => p.id === line.plant_id,
                        );
                        const area = areas.find((a) => a.id === line.area_id);
                        return (
                          <tr
                            key={line.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <div className="font-medium">{line.name}</div>
                            </td>
                            <td className="p-3">
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {line.code}
                              </code>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                {plant?.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                {area?.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600 max-w-xs truncate">
                                {line.description || 'No description'}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  line.is_active ? 'default' : 'secondary'
                                }
                              >
                                {line.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-500">
                                {new Date(line.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(line)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(line)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(line)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLines.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center py-8 text-gray-500"
                          >
                            No lines found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </>
  );
};

export default LineManagementPage;
