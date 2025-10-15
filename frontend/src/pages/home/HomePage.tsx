import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CheckSquare, Filter, Plus } from "lucide-react";
import {
  ticketService,
  type PendingTicket as APIPendingTicket,
} from "@/services/ticketService";
import personalTargetService from "@/services/personalTargetService";
import PersonalKPISetupModal from "@/components/personal/PersonalKPISetupModal";
import PersonalFilterModal from "@/components/personal/PersonalFilterModal";
import { getAvatarUrl } from "@/utils/url";
import { formatLocalDate, calculatePeriodForDate, getDateRangeForFilter } from "@/utils/periodCalculations";
import PendingTicketsSection from "@/components/home/PendingTicketsSection";
import PersonalKPISection from "@/components/home/PersonalKPISection";

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pendingTickets, setPendingTickets] = useState<APIPendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTicketsPagination, setPendingTicketsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Personal tab time range filter state - Applied (currently active)
  const [personalTimeFilter, setPersonalTimeFilter] = useState<string>('this-period');
  const [personalSelectedYear, setPersonalSelectedYear] = useState<number>(new Date().getFullYear());
  const [personalSelectedPeriod, setPersonalSelectedPeriod] = useState<number>(1);

  // Personal tab time range filter state - Pending (changes not yet applied)
  const [pendingPersonalTimeFilter, setPendingPersonalTimeFilter] = useState<string>('this-period');
  const [pendingPersonalSelectedYear, setPendingPersonalSelectedYear] = useState<number>(new Date().getFullYear());
  const [pendingPersonalSelectedPeriod, setPendingPersonalSelectedPeriod] = useState<number>(1);

  // Personal ticket data state
  const [personalTicketData, setPersonalTicketData] = useState<Array<{ period: string; tickets: number; target: number }>>([]);
  const [personalTicketLoading, setPersonalTicketLoading] = useState<boolean>(false);
  const [personalTicketError, setPersonalTicketError] = useState<string | null>(null);

  // Personal Finished ticket data state (L2+ users only)
  const [personalFinishedTicketData, setPersonalFinishedTicketData] = useState<Array<{ period: string; tickets: number; target: number }>>([]);
  const [personalFinishedTicketLoading, setPersonalFinishedTicketLoading] = useState<boolean>(false);
  const [personalFinishedTicketError, setPersonalFinishedTicketError] = useState<string | null>(null);

  // Personal KPI data state
  const [personalKPIData, setPersonalKPIData] = useState<any>(null);
  const [personalKPILoading, setPersonalKPILoading] = useState<boolean>(false);
  const [personalKPIError, setPersonalKPIError] = useState<string | null>(null);

  // KPI Setup Modal state
  const [kpiSetupModalOpen, setKpiSetupModalOpen] = useState<boolean>(false);
  const [kpiSetupModalType, setKpiSetupModalType] = useState<'report' | 'fix'>('report');

  // Personal Filter Modal state
  const [personalFilterModalOpen, setPersonalFilterModalOpen] = useState<boolean>(false);

  // Fetch pending tickets on component mount
  useEffect(() => {
    const fetchPendingTickets = async () => {
      // Only fetch if user is authenticated
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await ticketService.getUserPendingTickets({
          page: pendingTicketsPagination.page,
          limit: pendingTicketsPagination.limit
        });
        if (response.success) {
          setPendingTickets(response.data.tickets);
          setPendingTicketsPagination(response.data.pagination);
          console.log('Pending tickets data:', response.data);
        } else {
          setError(t('homepage.failedToFetchPendingTickets'));
        }
      } catch (err) {
        console.error("Error fetching pending tickets:", err);
        setError(
          err instanceof Error
            ? err.message
            : t('homepage.failedToFetchPendingTickets'),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPendingTickets();
  }, [isAuthenticated, user, pendingTicketsPagination.page, pendingTicketsPagination.limit]);

  // Fetch personal ticket data when filters change
  useEffect(() => {
    fetchPersonalTicketData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  // Fetch personal Finished ticket data when filters change (L2+ users only)
  useEffect(() => {
    fetchPersonalFinishedTicketData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  // Fetch personal KPI data when filters change
  useEffect(() => {
    fetchPersonalKPIData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  // Initialize pending personal filters when modal opens
  useEffect(() => {
    if (personalFilterModalOpen) {
      resetPendingPersonalFilters();
    }
  }, [personalFilterModalOpen]);


  const subtitleSource = user as unknown as
    | { title?: string; departmentName?: string }
    | undefined;
  const userTitle = subtitleSource?.title;
  const departmentName = subtitleSource?.departmentName ?? "Department";
  const subtitle = userTitle
    ? `${userTitle} • ${departmentName}`
    : departmentName;
  const avatarSrc = getAvatarUrl(user?.avatarUrl);
  const avatarInitials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  const handleTicketClick = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`, { state: { from: '/home' } });
  };

  const handlePendingTicketsPageChange = (page: number) => {
    setPendingTicketsPagination(prev => ({ ...prev, page }));
  };

  // Handle KPI setup modal
  const handleKpiSetupClick = (type: 'report' | 'fix') => {
    setKpiSetupModalType(type);
    setKpiSetupModalOpen(true);
  };

  // Apply pending personal filters
  const applyPersonalFilters = () => {
    setPersonalTimeFilter(pendingPersonalTimeFilter);
    setPersonalSelectedYear(pendingPersonalSelectedYear);
    setPersonalSelectedPeriod(pendingPersonalSelectedPeriod);
    setPersonalFilterModalOpen(false);
  };

  // Reset pending personal filters to current applied filters
  const resetPendingPersonalFilters = () => {
    setPendingPersonalTimeFilter(personalTimeFilter);
    setPendingPersonalSelectedYear(personalSelectedYear);
    setPendingPersonalSelectedPeriod(personalSelectedPeriod);
  };

  // Check if there are pending personal filter changes
  const hasPendingPersonalChanges = () => {
    return (
      pendingPersonalTimeFilter !== personalTimeFilter ||
      pendingPersonalSelectedYear !== personalSelectedYear ||
      pendingPersonalSelectedPeriod !== personalSelectedPeriod
    );
  };

  // Fetch personal ticket data
  const fetchPersonalTicketData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalTicketLoading(false);
      return;
    }

    try {
      setPersonalTicketLoading(true);
      setPersonalTicketError(null);

      const dateRange = getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      const params = {
        year: yearFromDateRange,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      // Fetch both ticket data and personal targets
      const [ticketResponse, targetResponse] = await Promise.all([
        ticketService.getUserTicketCountPerPeriod(params),
        personalTargetService.getPersonalTargets({
          personno: user.id,
          year: yearFromDateRange,
          type: 'report'
        })
      ]);

      if (ticketResponse.success) {
        // Get targets for the current year
        const targets = targetResponse.success ? targetResponse.data : [];
        const targetMap: { [period: string]: number } = {};
        
        targets.forEach(target => {
          targetMap[target.period] = target.target_value;
        });

        // Add real target data
        const dataWithTargets = ticketResponse.data.map(item => ({
          ...item,
          target: targetMap[item.period] || 0 // No fallback target
        }));
        setPersonalTicketData(dataWithTargets);
      } else {
        setPersonalTicketError(t('homepage.failedToFetchPersonalTicketData'));
      }
    } catch (err) {
      console.error('Error fetching personal ticket data:', err);
      setPersonalTicketError(
        err instanceof Error
          ? err.message
          : t('homepage.failedToFetchPersonalTicketData')
      );
    } finally {
      setPersonalTicketLoading(false);
    }
  };

  // Fetch personal Finished ticket data (L2+ users only)
  const fetchPersonalFinishedTicketData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalFinishedTicketLoading(false);
      return;
    }

    try {
      setPersonalFinishedTicketLoading(true);
      setPersonalFinishedTicketError(null);

      const dateRange = getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      const params = {
        year: yearFromDateRange,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      // Fetch both Finished ticket data and personal targets
      const [ticketResponse, targetResponse] = await Promise.all([
        ticketService.getUserFinishedTicketCountPerPeriod(params),
        personalTargetService.getPersonalTargets({
          personno: user.id,
          year: yearFromDateRange,
          type: 'fix'
        })
      ]);

      if (ticketResponse.success) {
        // Get targets for the current year
        const targets = targetResponse.success ? targetResponse.data : [];
        const targetMap: { [period: string]: number } = {};
        
        targets.forEach(target => {
          targetMap[target.period] = target.target_value;
        });

        // Add real target data
        const dataWithTargets = ticketResponse.data.map(item => ({
          ...item,
          target: targetMap[item.period] || 0 // No fallback target
        }));
        setPersonalFinishedTicketData(dataWithTargets);
      } else {
        setPersonalFinishedTicketError(t('homepage.failedToFetchPersonalFinishedTicketData'));
      }
    } catch (err) {
      console.error('Error fetching personal Finished ticket data:', err);
      setPersonalFinishedTicketError(
        err instanceof Error
          ? err.message
          : t('homepage.failedToFetchPersonalFinishedTicketData')
      );
    } finally {
      setPersonalFinishedTicketLoading(false);
    }
  };

  // Fetch personal KPI data
  const fetchPersonalKPIData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalKPILoading(false);
      return;
    }

    try {
      setPersonalKPILoading(true);
      setPersonalKPIError(null);

      const dateRange = getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        compare_startDate: dateRange.compare_startDate,
        compare_endDate: dateRange.compare_endDate
      };

      const response = await ticketService.getPersonalKPIData(params);
      
      if (response.success) {
        setPersonalKPIData(response.data);
      } else {
        setPersonalKPIError(t('homepage.failedToFetchPersonalKPIData'));
      }
    } catch (err) {
      console.error('Error fetching personal KPI data:', err);
      setPersonalKPIError(
        err instanceof Error
          ? err.message
          : t('homepage.failedToFetchPersonalKPIData')
      );
    } finally {
      setPersonalKPILoading(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* <Avatar className="h-12 w-12">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="avatar" /> : null}
            <AvatarFallback className="text-sm">
              {avatarInitials}
            </AvatarFallback>
          </Avatar> */}
          <div>
            <h1 className="text-2xl font-bold">
              {t('homepage.welcome')}, {user?.firstName} {user?.lastName}!
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </div>
        {/* Create Ticket Button - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block">
          <Button
            onClick={() => navigate("/tickets/create")}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('homepage.createTicket')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="tasks"
            className="flex items-center space-x-2"
          >
            <CheckSquare className="h-4 w-4" />
            <span>{t('homepage.tasks')}</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>{t('homepage.performance')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <PendingTicketsSection
            tickets={pendingTickets}
            loading={loading}
            error={error}
            onTicketClick={handleTicketClick}
            pagination={pendingTicketsPagination}
            onPageChange={handlePendingTicketsPageChange}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Empty div to maintain layout balance */}
            </div>
            <div className="flex items-center gap-3">
              {/* Compact Date Range Display */}
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('homepage.range')}:</span>
                  <span className="text-foreground font-medium">
                    {(() => {
                      const dateRange = getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
                      return `${dateRange.startDate} - ${dateRange.endDate}`;
                    })()}
                  </span>
                  {(personalTimeFilter === 'this-period' || personalTimeFilter === 'select-period') && (
                    <span className="text-xs text-muted-foreground">
                      {personalTimeFilter === 'this-period' 
                        ? (() => {
                            const currentPeriodInfo = calculatePeriodForDate(new Date(), personalSelectedYear);
                            return `P${currentPeriodInfo.period}`;
                          })()
                        : `P${personalSelectedPeriod}`
                      }
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonalFilterModalOpen(true)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>{t('homepage.filters')}</span>
              </Button>
            </div>
          </div>
          <PersonalKPISection
            selectedYear={personalSelectedYear}
            personalTicketData={personalTicketData}
            personalTicketLoading={personalTicketLoading}
            personalTicketError={personalTicketError}
            personalFinishedTicketData={personalFinishedTicketData}
            personalFinishedTicketLoading={personalFinishedTicketLoading}
            personalFinishedTicketError={personalFinishedTicketError}
            personalKPIData={personalKPIData}
            personalKPILoading={personalKPILoading}
            personalKPIError={personalKPIError}
            onKpiSetupClick={handleKpiSetupClick}
          />
        </TabsContent>

      </Tabs>

      {/* KPI Setup Modal */}
      <PersonalKPISetupModal
        open={kpiSetupModalOpen}
        onOpenChange={setKpiSetupModalOpen}
        targetType={kpiSetupModalType}
        onTargetsUpdated={() => {
          // Refresh personal ticket data when targets are updated
          fetchPersonalTicketData();
          fetchPersonalFinishedTicketData();
        }}
      />

      {/* Personal Filter Modal */}
      <PersonalFilterModal
        open={personalFilterModalOpen}
        onOpenChange={setPersonalFilterModalOpen}
        timeFilter={pendingPersonalTimeFilter}
        setTimeFilter={setPendingPersonalTimeFilter}
        selectedYear={pendingPersonalSelectedYear}
        setSelectedYear={setPendingPersonalSelectedYear}
        selectedPeriod={pendingPersonalSelectedPeriod}
        setSelectedPeriod={setPendingPersonalSelectedPeriod}
        onApply={applyPersonalFilters}
        onReset={resetPendingPersonalFilters}
        hasPendingChanges={hasPendingPersonalChanges()}
      />
    </div>
  );
};

export default HomePage;
