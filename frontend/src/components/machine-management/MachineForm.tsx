import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Machine } from '@/services/machineService';

interface MachineFormProps {
  machine?: Machine;
  onSave: (machineData: Partial<Machine>) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const MachineForm: React.FC<MachineFormProps> = ({
  machine,
  onSave,
  onCancel,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<Machine>>({
    MachineName: '',
    MachineCode: '',
    MachineType: '',
    Manufacturer: '',
    Model: '',
    SerialNumber: '',
    Location: '',
    Department: '',
    Status: 'Active',
    Capacity: '',
    PowerRating: '',
    OperatingHours: 0,
    Criticality: 'Medium',
    AssetTag: '',
    PurchasePrice: 0,
    CurrentValue: 0,
    Notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (machine) {
      setFormData({
        MachineName: machine.MachineName,
        MachineCode: machine.MachineCode,
        MachineType: machine.MachineType,
        Manufacturer: machine.Manufacturer || '',
        Model: machine.Model || '',
        SerialNumber: machine.SerialNumber || '',
        Location: machine.Location || '',
        Department: machine.Department || '',
        InstallationDate: machine.InstallationDate || '',
        LastMaintenanceDate: machine.LastMaintenanceDate || '',
        NextMaintenanceDate: machine.NextMaintenanceDate || '',
        Status: machine.Status,
        Capacity: machine.Capacity || '',
        PowerRating: machine.PowerRating || '',
        OperatingHours: machine.OperatingHours || 0,
        Criticality: machine.Criticality,
        AssetTag: machine.AssetTag || '',
        PurchasePrice: machine.PurchasePrice || 0,
        CurrentValue: machine.CurrentValue || 0,
        WarrantyExpiryDate: machine.WarrantyExpiryDate || '',
        Notes: machine.Notes || ''
      });
    }
  }, [machine]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.MachineName?.trim()) {
      newErrors.MachineName = 'Machine name is required';
    }
    if (!formData.MachineCode?.trim()) {
      newErrors.MachineCode = 'Machine code is required';
    }
    if (!formData.MachineType?.trim()) {
      newErrors.MachineType = 'Machine type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save machine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Machine, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{mode === 'create' ? 'Add New Machine' : 'Edit Machine'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="MachineName">Machine Name *</Label>
              <Input
                id="MachineName"
                value={formData.MachineName}
                onChange={(e) => handleInputChange('MachineName', e.target.value)}
                placeholder="Enter machine name"
                className={errors.MachineName ? 'border-red-500' : ''}
              />
              {errors.MachineName && <p className="text-sm text-red-500">{errors.MachineName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="MachineCode">Machine Code *</Label>
              <Input
                id="MachineCode"
                value={formData.MachineCode}
                onChange={(e) => handleInputChange('MachineCode', e.target.value)}
                placeholder="Enter machine code"
                className={errors.MachineCode ? 'border-red-500' : ''}
              />
              {errors.MachineCode && <p className="text-sm text-red-500">{errors.MachineCode}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="MachineType">Machine Type *</Label>
              <Select value={formData.MachineType} onValueChange={(value) => handleInputChange('MachineType', value)}>
                <SelectTrigger className={errors.MachineType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select machine type" />
                </SelectTrigger>
                <SelectContent>
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
              {errors.MachineType && <p className="text-sm text-red-500">{errors.MachineType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="Department">Department</Label>
              <Select value={formData.Department || ''} onValueChange={(value) => handleInputChange('Department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Assembly">Assembly</SelectItem>
                  <SelectItem value="Logistics">Logistics</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Facilities">Facilities</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Manufacturer">Manufacturer</Label>
              <Input
                id="Manufacturer"
                value={formData.Manufacturer}
                onChange={(e) => handleInputChange('Manufacturer', e.target.value)}
                placeholder="Enter manufacturer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Model">Model</Label>
              <Input
                id="Model"
                value={formData.Model}
                onChange={(e) => handleInputChange('Model', e.target.value)}
                placeholder="Enter model"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="SerialNumber">Serial Number</Label>
              <Input
                id="SerialNumber"
                value={formData.SerialNumber}
                onChange={(e) => handleInputChange('SerialNumber', e.target.value)}
                placeholder="Enter serial number"
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Location">Location</Label>
              <Input
                id="Location"
                value={formData.Location}
                onChange={(e) => handleInputChange('Location', e.target.value)}
                placeholder="Enter location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Status">Status</Label>
              <Select value={formData.Status} onValueChange={(value) => handleInputChange('Status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="Criticality">Criticality</Label>
              <Select value={formData.Criticality} onValueChange={(value) => handleInputChange('Criticality', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Capacity">Capacity</Label>
              <Input
                id="Capacity"
                value={formData.Capacity}
                onChange={(e) => handleInputChange('Capacity', e.target.value)}
                placeholder="Enter capacity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="PowerRating">Power Rating</Label>
              <Input
                id="PowerRating"
                value={formData.PowerRating}
                onChange={(e) => handleInputChange('PowerRating', e.target.value)}
                placeholder="Enter power rating"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="OperatingHours">Operating Hours</Label>
              <Input
                id="OperatingHours"
                type="number"
                value={formData.OperatingHours}
                onChange={(e) => handleInputChange('OperatingHours', parseInt(e.target.value) || 0)}
                placeholder="Enter operating hours"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="InstallationDate">Installation Date</Label>
              <Input
                id="InstallationDate"
                type="date"
                value={formatDateForInput(formData.InstallationDate)}
                onChange={(e) => handleInputChange('InstallationDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="LastMaintenanceDate">Last Maintenance Date</Label>
              <Input
                id="LastMaintenanceDate"
                type="date"
                value={formatDateForInput(formData.LastMaintenanceDate)}
                onChange={(e) => handleInputChange('LastMaintenanceDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="NextMaintenanceDate">Next Maintenance Date</Label>
              <Input
                id="NextMaintenanceDate"
                type="date"
                value={formatDateForInput(formData.NextMaintenanceDate)}
                onChange={(e) => handleInputChange('NextMaintenanceDate', e.target.value)}
              />
            </div>
          </div>

          {/* Financial & Asset */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="AssetTag">Asset Tag</Label>
              <Input
                id="AssetTag"
                value={formData.AssetTag}
                onChange={(e) => handleInputChange('AssetTag', e.target.value)}
                placeholder="Enter asset tag"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="PurchasePrice">Purchase Price</Label>
              <Input
                id="PurchasePrice"
                type="number"
                step="0.01"
                value={formData.PurchasePrice}
                onChange={(e) => handleInputChange('PurchasePrice', parseFloat(e.target.value) || 0)}
                placeholder="Enter purchase price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="CurrentValue">Current Value</Label>
              <Input
                id="CurrentValue"
                type="number"
                step="0.01"
                value={formData.CurrentValue}
                onChange={(e) => handleInputChange('CurrentValue', parseFloat(e.target.value) || 0)}
                placeholder="Enter current value"
              />
            </div>
          </div>

          {/* Warranty & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="WarrantyExpiryDate">Warranty Expiry Date</Label>
              <Input
                id="WarrantyExpiryDate"
                type="date"
                value={formatDateForInput(formData.WarrantyExpiryDate)}
                onChange={(e) => handleInputChange('WarrantyExpiryDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Notes">Notes</Label>
              <Textarea
                id="Notes"
                value={formData.Notes}
                onChange={(e) => handleInputChange('Notes', e.target.value)}
                placeholder="Enter additional notes"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {mode === 'create' ? 'Create Machine' : 'Update Machine'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MachineForm;
