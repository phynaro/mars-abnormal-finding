import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';

const PreventiveMaintenancePage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Preventive Maintenance" description="Coming soon: PM scheduling and tracking" />
      <Card className="p-4 text-sm text-muted-foreground">This section is a placeholder for future implementation.</Card>
    </div>
  );
};

export default PreventiveMaintenancePage;

