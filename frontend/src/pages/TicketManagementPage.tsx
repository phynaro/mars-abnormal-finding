import React from 'react';
import { TicketList } from '@/components/ticket-management/TicketList';
import { PageHeader } from '@/components/common/PageHeader';

const TicketManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Ticket Management"
        description="Report and manage abnormal findings in machines, areas, and equipment"
      />
      <TicketList />
    </div>
  );
};

export default TicketManagementPage;
