import React from 'react';
import { ArrowLeft, Edit, Trash2, Calendar, MapPin, Settings, Activity, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Machine } from '@/services/machineService';

interface MachineViewProps {
  machine: Machine;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MachineView: React.FC<MachineViewProps> = ({
  machine,
  onEdit,
  onDelete,
  onClose
}) => {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            {machine.MachineName}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{machine.MachineCode}</Badge>
            {getStatusBadge(machine.Status)}
            {getCriticalityBadge(machine.Criticality)}
            <Badge variant="outline">{machine.MachineType}</Badge>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Manufacturer:</span>
                  <span>{machine.Manufacturer || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Model:</span>
                  <span>{machine.Model || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Serial Number:</span>
                  <span>{machine.SerialNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Asset Tag:</span>
                  <span>{machine.AssetTag || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Location & Department
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span>{machine.Location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Department:</span>
                  <span>{machine.Department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Operating Hours:</span>
                  <span>{machine.OperatingHours.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Capacity</Label>
                  <p>{machine.Capacity || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Power Rating</Label>
                  <p>{machine.PowerRating || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Operating Hours</Label>
                  <p>{machine.OperatingHours.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Installation Date</Label>
                  <p>{formatDate(machine.InstallationDate)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Maintenance</Label>
                  <p>{formatDate(machine.LastMaintenanceDate)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Next Maintenance</Label>
                  <p>{formatDate(machine.NextMaintenanceDate)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Warranty Expiry</Label>
                  <p>{formatDate(machine.WarrantyExpiryDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Purchase Price</Label>
                  <p className="text-lg font-semibold">{formatCurrency(machine.PurchasePrice)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Value</Label>
                  <p className="text-lg font-semibold">{formatCurrency(machine.CurrentValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {machine.Notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{machine.Notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Audit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><span className="font-medium">Created by:</span> {machine.CreatedBy || 'System'}</p>
                  <p><span className="font-medium">Created:</span> {formatDate(machine.CreatedDate)}</p>
                </div>
                {machine.ModifiedBy && (
                  <div>
                    <p><span className="font-medium">Modified by:</span> {machine.ModifiedBy}</p>
                    <p><span className="font-medium">Modified:</span> {formatDate(machine.ModifiedDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple Label component since it's not imported
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={className}>{children}</label>
);

export default MachineView;
