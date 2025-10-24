import React from "react";
import { Link } from "react-router-dom";
import { TicketList } from "@/components/ticket-management/TicketList";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus } from "lucide-react";

const TicketManagementPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title={t('ticketManagement.title')}
        //description="Report and manage abnormal findings in machines, areas, and equipment"
        rightContent={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Hide Create Ticket button on mobile - using floating Plus button in BottomNavigation instead */}
            <Button className="hidden md:inline-flex bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              <Link to="/tickets/create">{t('ticketManagement.createTicket')}</Link>
            </Button>
          </div>
        }
      />
      <TicketList />
    </div>
  );
};

export default TicketManagementPage;
