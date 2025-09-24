import React from "react";
import { Link } from "react-router-dom";
import { TicketList } from "@/components/ticket-management/TicketList";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

const TicketManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Ticket Management"
        description="Report and manage abnormal findings in machines, areas, and equipment"
        rightContent={
          <div className="flex items-center gap-2">
            <Button asChild className="md:hidden">
              <Link to="/tickets/create/wizard">Create Ticket</Link>
            </Button>
            <Button asChild className="hidden md:inline-flex">
              <Link to="/tickets/create">Create Ticket</Link>
            </Button>
          </div>
        }
      />
      <TicketList />
    </div>
  );
};

export default TicketManagementPage;
