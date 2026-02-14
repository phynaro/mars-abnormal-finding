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
    <div className="container mx-auto px-4 py-0 md:py-6">
      <PageHeader
        className="hidden md:block"
        title={t('ticketManagement.title')}
        rightContent={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
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
