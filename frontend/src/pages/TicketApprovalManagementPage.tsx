import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import administrationService, { type TicketApproval, type Area, type Person } from '@/services/administrationService';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const TicketApprovalManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [approvals, setApprovals] = useState<TicketApproval[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<TicketApproval | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [personSearch, setPersonSearch] = useState('');
  const [showPersonSearch, setShowPersonSearch] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personno: '',
    area_id: '',
    approval_level: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  // Close person search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.person-search-container')) {
        setShowPersonSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsData, lookupData] = await Promise.all([
        administrationService.ticketApproval.getAll(),
        administrationService.lookup.getLookupData()
      ]);
      setApprovals(approvalsData);
      setAreas(lookupData.areas);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedApproval(null);
    setFormData({
      personno: '',
      area_id: '',
      approval_level: '',
      is_active: true
    });
    setPersonSearch('');
    setViewMode('create');
  };

  const handleEdit = (approval: TicketApproval) => {
    setSelectedApproval(approval);
    setFormData({
      personno: approval.personno.toString(),
      area_id: approval.area_id.toString(),
      approval_level: approval.approval_level.toString(),
      is_active: approval.is_active
    });
    // Set person search display
    if (approval.person_name) {
      setPersonSearch(`${approval.person_name} (${approval.personcode || approval.personno})`);
    } else {
      setPersonSearch(`Person #${approval.personno}`);
    }
    setViewMode('edit');
  };

  const handleView = (approval: TicketApproval) => {
    setSelectedApproval(approval);
    setViewMode('view');
  };

  const searchPersons = async (search: string) => {
    if (search.length < 2) {
      setPersons([]);
      return;
    }
    try {
      const results = await administrationService.person.searchPersons(search, 10);
      setPersons(results);
    } catch (error) {
      console.error('Error searching persons:', error);
    }
  };

  const handlePersonSearch = (search: string) => {
    setPersonSearch(search);
    searchPersons(search);
  };

  const selectPerson = (person: Person) => {
    setFormData(prev => ({ ...prev, personno: person.PERSONNO.toString() }));
    setPersonSearch(`${person.PERSON_NAME} (${person.PERSONCODE})`);
    setShowPersonSearch(false);
    setPersons([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.personno || !formData.area_id || !formData.approval_level) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const submitData = {
        personno: parseInt(formData.personno),
        area_id: parseInt(formData.area_id),
        approval_level: parseInt(formData.approval_level),
        is_active: formData.is_active
      };
      
      if (viewMode === 'create') {
        await administrationService.ticketApproval.create(submitData);
        toast({
          title: 'Success',
          description: 'Ticket approval created successfully'
        });
      } else if (viewMode === 'edit' && selectedApproval) {
        await administrationService.ticketApproval.update(selectedApproval.id, submitData);
        toast({
          title: 'Success',
          description: 'Ticket approval updated successfully'
        });
      }
      
      await loadData();
      setViewMode('list');
      setPersonSearch('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ticket approval',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (approval: TicketApproval) => {
    if (!confirm(`Are you sure you want to delete this approval for person ${approval.personno}?`)) {
      return;
    }

    // Use setTimeout to prevent blocking the UI thread
    setTimeout(async () => {
      try {
        setLoading(true);
        await administrationService.ticketApproval.delete(approval.id);
        toast({
          title: 'Success',
          description: 'Ticket approval deleted successfully'
        });
        await loadData();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete ticket approval',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.personno.toString().includes(searchTerm) ||
                         approval.area_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || approval.area_id.toString() === filterArea;
    const matchesActive = filterActive === 'all' || 
                         (filterActive === 'active' && approval.is_active) ||
                         (filterActive === 'inactive' && !approval.is_active);
    return matchesSearch && matchesArea && matchesActive;
  });

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === 'create' ? 'Create New Ticket Approval' : 'Edit Ticket Approval'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="personno">Person *</Label>
                  <div className="relative person-search-container">
                    <Input
                      id="personno"
                      value={personSearch}
                      onChange={(e) => {
                        handlePersonSearch(e.target.value);
                        setShowPersonSearch(true);
                      }}
                      onFocus={() => setShowPersonSearch(true)}
                      placeholder="Search for person..."
                      required
                    />
                    {showPersonSearch && persons.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {persons.map((person) => (
                          <div
                            key={person.PERSONNO}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectPerson(person)}
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

                <div>
                  <Label htmlFor="area_id">Area *</Label>
                  <Select
                    value={formData.area_id}
                    onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id.toString()}>
                          {area.plant_name} → {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="approval_level">Approval Level *</Label>
                  <Select
                    value={formData.approval_level}
                    onValueChange={(value) => setFormData({ ...formData, approval_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approval level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
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
                    {loading ? 'Saving...' : (viewMode === 'create' ? 'Create' : 'Update')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setViewMode('list')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === 'view' && selectedApproval) {
    const area = areas.find(a => a.id === selectedApproval.area_id);
    
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Approval Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Person</Label>
                <p className="text-lg">
                  {selectedApproval.person_name || `Person #${selectedApproval.personno}`}
                </p>
                {selectedApproval.person_name && (
                  <p className="text-sm text-gray-500">#{selectedApproval.personno}</p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Area</Label>
                <p className="text-lg">{area?.plant_name} → {area?.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Approval Level</Label>
                <p className="text-lg">Level {selectedApproval.approval_level}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <Badge variant={selectedApproval.is_active ? 'default' : 'secondary'}>
                  {selectedApproval.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Created</Label>
                <p className="text-lg">{new Date(selectedApproval.created_at).toLocaleDateString()}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                <p className="text-lg">{new Date(selectedApproval.updated_at).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleEdit(selectedApproval)}>
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
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ticket Approval Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Approval
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by person number or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                {filteredApprovals.map((approval) => {
                  const area = areas.find(a => a.id === approval.area_id);
                  return (
                    <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">
                            {approval.person_name || `Person #${approval.personno}`}
                          </h3>
                          <Badge variant={approval.is_active ? 'default' : 'secondary'}>
                            {approval.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            Level {approval.approval_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Area: {area?.plant_name} → {area?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(approval)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(approval)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(approval)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredApprovals.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No ticket approvals found
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Person #</th>
                      <th className="text-left p-3 font-medium">Approval Level</th>
                      <th className="text-left p-3 font-medium">Plant</th>
                      <th className="text-left p-3 font-medium">Area</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovals.map((approval) => {
                      const area = areas.find(a => a.id === approval.area_id);
                      return (
                        <tr key={approval.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">
                              {approval.person_name || `#${approval.personno}`}
                            </div>
                            {approval.person_name && (
                              <div className="text-sm text-gray-500">#{approval.personno}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">Level {approval.approval_level}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{area?.plant_name || 'Unknown'}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{area?.name || 'Unknown'}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant={approval.is_active ? 'default' : 'secondary'}>
                              {approval.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-500">
                              {new Date(approval.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleView(approval)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(approval)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(approval)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredApprovals.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No ticket approvals found
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
  );
};

export default TicketApprovalManagementPage;
