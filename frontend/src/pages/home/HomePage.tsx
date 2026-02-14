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

  // Personal closure rate data state (L2+ users only)
  const [personalClosureRateData, setPersonalClosureRateData] = useState<Array<{ period: string; rate: number; target: number }>>([]);
  const [personalClosureRateLoading, setPersonalClosureRateLoading] = useState<boolean>(false);
  const [personalClosureRateError, setPersonalClosureRateError] = useState<string | null>(null);

  // Personal KPI data state
  const [personalKPIData, setPersonalKPIData] = useState<any>(null);
  const [personalKPILoading, setPersonalKPILoading] = useState<boolean>(false);
  const [personalKPIError, setPersonalKPIError] = useState<string | null>(null);

  // KPI Setup Modal state
  const [kpiSetupModalOpen, setKpiSetupModalOpen] = useState<boolean>(false);
  const [kpiSetupModalType, setKpiSetupModalType] = useState<'report' | 'closure'>('report');

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
        const response = await ticketService.getUserPendingTickets();
        if (response.success) {
          setPendingTickets(response.data.tickets);
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
  }, [isAuthenticated, user]);

  // Fetch personal ticket data when filters change
  useEffect(() => {
    fetchPersonalTicketData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  // Fetch personal closure rate data when filters change (L2+ users only)
  useEffect(() => {
    fetchPersonalClosureRateData();
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

  // Handle KPI setup modal
  const handleKpiSetupClick = (type: 'report' | 'closure') => {
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

  // Fetch personal closure rate data (L2+ users only)
  const fetchPersonalClosureRateData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalClosureRateLoading(false);
      return;
    }

    try {
      setPersonalClosureRateLoading(true);
      setPersonalClosureRateError(null);

      const dateRange = getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);

      const params = {
        year: yearFromDateRange,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const [closureResponse, targetResponse] = await Promise.all([
        ticketService.getUserClosureRatePerPeriod(params),
        personalTargetService.getPersonalTargets({
          personno: user.id,
          year: yearFromDateRange,
          type: 'closure'
        })
      ]);

      if (closureResponse.success) {
        const targets = targetResponse.success ? targetResponse.data : [];
        const targetMap: { [period: string]: number } = {};
        targets.forEach((target: { period: string; target_value: number }) => {
          targetMap[target.period] = target.target_value;
        });

        const dataWithTargets = closureResponse.data.map((item: { period: string; rate: number }) => ({
          period: item.period,
          rate: item.rate,
          target: targetMap[item.period] ?? 0
        }));
        setPersonalClosureRateData(dataWithTargets);
      } else {
        setPersonalClosureRateError(t('homepage.failedToFetchPersonalClosureRateData'));
      }
    } catch (err) {
      console.error('Error fetching personal closure rate data:', err);
      setPersonalClosureRateError(
        err instanceof Error
          ? err.message
          : t('homepage.failedToFetchPersonalClosureRateData')
      );
    } finally {
      setPersonalClosureRateLoading(false);
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
            personalClosureRateData={personalClosureRateData}
            personalClosureRateLoading={personalClosureRateLoading}
            personalClosureRateError={personalClosureRateError}
            personalKPIData={personalKPIData}
            personalKPILoading={personalKPILoading}
            personalKPIError={personalKPIError}
            onKpiSetupClick={handleKpiSetupClick}
            dateRange={getDateRangeForFilter(personalTimeFilter, personalSelectedYear, personalSelectedPeriod)}
            userId={user?.id}
          />
        </TabsContent>

      </Tabs>

      {/* KPI Setup Modal */}
      <PersonalKPISetupModal
        open={kpiSetupModalOpen}
        onOpenChange={setKpiSetupModalOpen}
        targetType={kpiSetupModalType}
        onTargetsUpdated={() => {
          fetchPersonalTicketData();
          fetchPersonalClosureRateData();
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
