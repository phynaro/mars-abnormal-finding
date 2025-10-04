import React from "react";
import { Link } from "react-router-dom";
import { TicketList } from "@/components/ticket-management/TicketList";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const TicketManagementPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title={t('ticketManagement.title')}
        //description="Report and manage abnormal findings in machines, areas, and equipment"
        rightContent={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button asChild className="md:hidden w-full" variant="destructive">
              <Link to="/tickets/create/wizard">{t('ticketManagement.createTicket')}</Link>
            </Button>
            <Button asChild className="hidden md:inline-flex" variant="destructive">
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
