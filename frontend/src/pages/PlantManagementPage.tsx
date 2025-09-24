import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  type Plant,
} from '@/services/administrationService';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const PlantManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const { toast, toasts, removeToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    is_active: true,
  });

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      setLoading(true);
      const data = await administrationService.plant.getAll();
      setPlants(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedPlant(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      is_active: true,
    });
    setViewMode('create');
  };

  const handleEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setFormData({
      name: plant.name,
      description: plant.description || '',
      code: plant.code,
      is_active: plant.is_active,
    });
    setViewMode('edit');
  };

  const handleView = (plant: Plant) => {
    setSelectedPlant(plant);
    setViewMode('view');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (viewMode === 'create') {
        await administrationService.plant.create(formData);
        toast({
          title: 'Success',
          description: 'Plant created successfully',
        });
      } else if (viewMode === 'edit' && selectedPlant) {
        await administrationService.plant.update(selectedPlant.id, formData);
        toast({
          title: 'Success',
          description: 'Plant updated successfully',
        });
      }

      await loadPlants();
      setViewMode('list');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save plant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plant: Plant) => {
    if (!confirm(`Are you sure you want to delete plant "${plant.name}"?`)) {
      return;
    }

    // Use setTimeout to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        setLoading(true);
        await administrationService.plant.delete(plant.id);
        toast({
          title: 'Success',
          description: 'Plant deleted successfully',
        });
        await loadPlants();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete plant',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  const filteredPlants = plants.filter((plant) => {
    const matchesSearch =
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && plant.is_active) ||
      (filterActive === 'inactive' && !plant.is_active);
    return matchesSearch && matchesFilter;
  });

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === 'create' ? 'Create New Plant' : 'Edit Plant'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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

  if (viewMode === 'view' && selectedPlant) {
    return (
      <>
        <div className="container mx-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Plant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Name
                  </Label>
                  <p className="text-lg">{selectedPlant.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Code
                  </Label>
                  <p className="text-lg">{selectedPlant.code}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Description
                  </Label>
                  <p className="text-lg">
                    {selectedPlant.description || 'No description'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <Badge
                    variant={selectedPlant.is_active ? 'default' : 'secondary'}
                  >
                    {selectedPlant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Created
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedPlant.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </Label>
                  <p className="text-lg">
                    {new Date(selectedPlant.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleEdit(selectedPlant)}>
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
          <h1 className="text-3xl font-bold">Plant Management</h1>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Plant
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search plants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
                  {filteredPlants.map((plant) => (
                    <div
                      key={plant.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{plant.name}</h3>
                          <Badge
                            variant={plant.is_active ? 'default' : 'secondary'}
                          >
                            {plant.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Code: {plant.code}
                        </p>
                        {plant.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {plant.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(plant)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(plant)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plant)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredPlants.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No plants found
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
                        <th className="text-left p-3 font-medium">
                          Description
                        </th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlants.map((plant) => (
                        <tr
                          key={plant.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="font-medium">{plant.name}</div>
                          </td>
                          <td className="p-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {plant.code}
                            </code>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {plant.description || 'No description'}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                plant.is_active ? 'default' : 'secondary'
                              }
                            >
                              {plant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-500">
                              {new Date(plant.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(plant)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(plant)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(plant)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPlants.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            No plants found
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

export default PlantManagementPage;
