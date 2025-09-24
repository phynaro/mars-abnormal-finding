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
  type Area,
  type Plant,
} from '@/services/administrationService';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const AreaManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [areas, setAreas] = useState<Area[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const { toast, toasts, removeToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    plant_id: '',
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
      const [areasData, lookupData] = await Promise.all([
        administrationService.area.getAll(),
        administrationService.lookup.getLookupData(),
      ]);
      setAreas(areasData);
      setPlants(lookupData.plants);
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
    setSelectedArea(null);
    setFormData({
      plant_id: '',
      name: '',
      description: '',
      code: '',
      is_active: true,
    });
    setViewMode('create');
  };

  const handleEdit = (area: Area) => {
    setSelectedArea(area);
    setFormData({
      plant_id: area.plant_id.toString(),
      name: area.name,
      description: area.description || '',
      code: area.code,
      is_active: area.is_active,
    });
    setViewMode('edit');
  };

  const handleView = (area: Area) => {
    setSelectedArea(area);
    setViewMode('view');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plant_id) {
      toast({
        title: 'Error',
        description: 'Please select a plant',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        plant_id: parseInt(formData.plant_id),
      };

      if (viewMode === 'create') {
        await administrationService.area.create(submitData);
        toast({
          title: 'Success',
          description: 'Area created successfully',
        });
      } else if (viewMode === 'edit' && selectedArea) {
        await administrationService.area.update(selectedArea.id, submitData);
        toast({
          title: 'Success',
          description: 'Area updated successfully',
        });
      }

      await loadData();
      setViewMode('list');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save area',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (area: Area) => {
    if (!confirm(`Are you sure you want to delete area "${area.name}"?`)) {
      return;
    }

    // Use setTimeout to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        setLoading(true);
        await administrationService.area.delete(area.id);
        toast({
          title: 'Success',
          description: 'Area deleted successfully',
        });
        await loadData();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete area',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  const filteredAreas = areas.filter((area) => {
    const matchesSearch =
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant =
      filterPlant === 'all' || area.plant_id.toString() === filterPlant;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && area.is_active) ||
      (filterActive === 'inactive' && !area.is_active);
    return matchesSearch && matchesPlant && matchesActive;
  });

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === 'create' ? 'Create New Area' : 'Edit Area'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="plant_id">Plant *</Label>
                    <Select
                      value={formData.plant_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, plant_id: value })
                      }
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

  if (viewMode === 'view' && selectedArea) {
    const plant = plants.find((p) => p.id === selectedArea.plant_id);

    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Area Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Name
                  </Label>
                  <p className="text-lg">{selectedArea.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Code
                  </Label>
                  <p className="text-lg">{selectedArea.code}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Plant
                  </Label>
                  <p className="text-lg">{plant?.name || 'Unknown'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Description
                  </Label>
                  <p className="text-lg">
                    {selectedArea.description || 'No description'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <Badge
                    variant={selectedArea.is_active ? 'default' : 'secondary'}
                  >
                    {selectedArea.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Created
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedArea.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedArea.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleEdit(selectedArea)}>
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
          <h1 className="text-3xl font-bold">Area Management</h1>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Area
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search areas..."
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
                  {filteredAreas.map((area) => {
                    const plant = plants.find((p) => p.id === area.plant_id);
                    return (
                      <div
                        key={area.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{area.name}</h3>
                            <Badge
                              variant={area.is_active ? 'default' : 'secondary'}
                            >
                              {area.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Code: {area.code}
                          </p>
                          <p className="text-sm text-gray-500">
                            Plant: {plant?.name || 'Unknown'}
                          </p>
                          {area.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {area.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(area)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(area)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(area)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAreas.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No areas found
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
                        <th className="text-left p-3 font-medium">
                          Description
                        </th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAreas.map((area) => {
                        const plant = plants.find(
                          (p) => p.id === area.plant_id,
                        );
                        return (
                          <tr
                            key={area.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <div className="font-medium">{area.name}</div>
                            </td>
                            <td className="p-3">
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {area.code}
                              </code>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                {plant?.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-600 max-w-xs truncate">
                                {area.description || 'No description'}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  area.is_active ? 'default' : 'secondary'
                                }
                              >
                                {area.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-500">
                                {new Date(area.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(area)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(area)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(area)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAreas.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8 text-gray-500"
                          >
                            No areas found
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

export default AreaManagementPage;
