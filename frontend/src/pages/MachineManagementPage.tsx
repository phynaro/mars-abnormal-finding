import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MachineList from '@/components/machine-management/MachineList';
import MachineForm from '@/components/machine-management/MachineForm';
import MachineView from '@/components/machine-management/MachineView';
import { machineService } from '@/services/machineService';
import type { Machine } from '@/services/machineService';
import { useToast } from '@/hooks/useToast';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const MachineManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  // Ensure breadcrumb reflects list when loading /machines route
  useEffect(() => {
    if (viewMode === 'list') {
      // Keep path on /machines/list so layout breadcrumb shows submenu label
      if (location.pathname !== '/machines/list') {
        navigate('/machines/list', { replace: true });
      } else if (location.state) {
        // clear any extra crumbs
        navigate('/machines/list', { replace: true, state: {} });
      }
    }
  }, [viewMode]);

  const handleCreateMachine = () => {
    setSelectedMachine(null);
    setViewMode('create');
  };

  const handleEditMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setViewMode('edit');
  };

  const handleViewMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setViewMode('view');
    // Update breadcrumb to show: Machine List > {MachineName}
    navigate('/machines/list', { state: { breadcrumbHideParent: true, breadcrumbExtra: machine.MachineName } });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedMachine(null);
    navigate('/machines/list', { state: {} });
  };

  const handleSaveMachine = async (machineData: Partial<Machine>) => {
    try {
      if (viewMode === 'create') {
        await machineService.createMachine(machineData);
        toast({
          title: 'Success',
          description: 'Machine created successfully',
          variant: 'default'
        });
      } else if (viewMode === 'edit' && selectedMachine) {
        await machineService.updateMachine(selectedMachine.MachineID, machineData);
        toast({
          title: 'Success',
          description: 'Machine updated successfully',
          variant: 'default'
        });
      }
      
      setRefreshTrigger(prev => prev + 1);
      handleBackToList();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save machine',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMachine = async () => {
    if (!selectedMachine) return;

    try {
      await machineService.deleteMachine(selectedMachine.MachineID);
      toast({
        title: 'Success',
        description: 'Machine deleted successfully',
        variant: 'default'
      });
      setRefreshTrigger(prev => prev + 1);
      handleBackToList();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete machine',
        variant: 'destructive'
      });
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <MachineForm
            mode="create"
            onSave={handleSaveMachine}
            onCancel={handleBackToList}
          />
        );
      
      case 'edit':
        return (
          <MachineForm
            machine={selectedMachine!}
            mode="edit"
            onSave={handleSaveMachine}
            onCancel={handleBackToList}
          />
        );
      
      case 'view':
        return (
          <MachineView
            machine={selectedMachine!}
            onEdit={() => setViewMode('edit')}
            onDelete={handleDeleteMachine}
            onClose={handleBackToList}
          />
        );
      
      default:
        return (
          <MachineList
            onViewMachine={handleViewMachine}
            onEditMachine={handleEditMachine}
            onCreateMachine={handleCreateMachine}
            key={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header removed; breadcrumb from Layout is used */}
      {renderContent()}
    </div>
  );
};

export default MachineManagementPage;
