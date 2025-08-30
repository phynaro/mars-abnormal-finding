import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, Clock, Settings, TrendingUp, Wrench } from 'lucide-react';
import { machineService } from '@/services/machineService';
import type { MachineStats, Machine } from '@/services/machineService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const MachineDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [maintenanceDue, setMaintenanceDue] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, machinesData] = await Promise.all([
          machineService.getMachineStats(),
          machineService.getAllMachines(1, 50, { status: 'Active' })
        ]);
        
        setStats(statsData);
        
        // Filter machines that need maintenance soon (next 30 days)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const maintenanceNeeded = machinesData.data.filter(machine => {
          if (!machine.NextMaintenanceDate) return false;
          const nextMaintenance = new Date(machine.NextMaintenanceDate);
          return nextMaintenance <= thirtyDaysFromNow;
        });
        
        setMaintenanceDue(maintenanceNeeded);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;
  if (!stats) return <div className="text-center p-4">No data available</div>;

  const getStatusColor = (daysUntilMaintenance: number) => {
    if (daysUntilMaintenance <= 7) return 'destructive';
    if (daysUntilMaintenance <= 14) return 'secondary';
    return 'outline';
  };

  const getDaysUntilMaintenance = (dateString: string) => {
    const nextMaintenance = new Date(dateString);
    const now = new Date();
    const diffTime = nextMaintenance.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Machine Dashboard"
        description="Overview of machine status and maintenance schedule"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMachines}</div>
            <p className="text-xs text-muted-foreground">
              All machines in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeMachines}</div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Machines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalMachines}</div>
            <p className="text-xs text-muted-foreground">
              High priority equipment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.maintenanceDueSoon}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Upcoming Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceDue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No maintenance scheduled in the next 30 days
            </div>
          ) : (
            <div className="space-y-4">
              {maintenanceDue.map((machine) => {
                const daysUntil = getDaysUntilMaintenance(machine.NextMaintenanceDate!);
                return (
                  <div
                    key={machine.MachineID}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{machine.MachineName}</h4>
                        <Badge variant="outline">{machine.MachineCode}</Badge>
                        <Badge variant="outline">{machine.Department}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {machine.Location} • {machine.MachineType}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusColor(daysUntil) as any}>
                        {daysUntil === 0 ? 'Due Today' : 
                         daysUntil === 1 ? 'Due Tomorrow' : 
                         `Due in ${daysUntil} days`}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Schedule
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/machines/list')}>
              View All Machines
            </Button>
            <Button variant="outline" onClick={() => navigate('/machines')}>
              Add New Machine
            </Button>
            <Button variant="outline">
              Generate Report
            </Button>
            <Button variant="outline">
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineDashboardPage;
