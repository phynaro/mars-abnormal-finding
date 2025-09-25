import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Award,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  Settings,
  Target,
  Ticket,
  TrendingUp,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  Filter,
} from "lucide-react";
import {
  ticketService,
  type PendingTicket as APIPendingTicket,
} from "@/services/ticketService";
import personalTargetService from "@/services/personalTargetService";
import { Badge } from "@/components/ui/badge";
import PersonalKPISetupModal from "@/components/personal/PersonalKPISetupModal";
import PersonalFilterModal from "@/components/personal/PersonalFilterModal";
import {
  getTicketPriorityClass,
  getTicketSeverityClass,
  getTicketStatusClass,
} from "@/utils/ticketBadgeStyles";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface PersonalKPI {
  ticketsCreatedByMonth: Array<{
    month: string;
    tickets: number;
    target: number;
  }>;
  downtimeAvoidance: {
    thisPeriod: number;
    thisYear: number;
    ranking: number;
  };
  costAvoidance: {
    thisPeriod: number;
    thisYear: number;
    ranking: number;
  };
  ticketStats: {
    openCount: number;
    closedCount: number;
    ranking: number;
  };
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}


const mockPersonalKPI: PersonalKPI = {
  ticketsCreatedByMonth: [
    { month: "Jan", tickets: 12, target: 15 },
    { month: "Feb", tickets: 18, target: 15 },
    { month: "Mar", tickets: 14, target: 15 },
    { month: "Apr", tickets: 22, target: 15 },
    { month: "May", tickets: 16, target: 15 },
    { month: "Jun", tickets: 19, target: 15 },
    { month: "Jul", tickets: 25, target: 15 },
    { month: "Aug", tickets: 21, target: 15 },
    { month: "Sep", tickets: 17, target: 15 },
    { month: "Oct", tickets: 23, target: 15 },
    { month: "Nov", tickets: 20, target: 15 },
    { month: "Dec", tickets: 18, target: 15 },
  ],
  downtimeAvoidance: {
    thisPeriod: 45.5,
    thisYear: 487.2,
    ranking: 3,
  },
  costAvoidance: {
    thisPeriod: 12500,
    thisYear: 145000,
    ranking: 2,
  },
  ticketStats: {
    openCount: 8,
    closedCount: 12,
    ranking: 5,
  },
};

function getUploadsBase(apiBaseUrl: string) {
  const withApiRemoved = apiBaseUrl.endsWith("/api")
    ? apiBaseUrl.slice(0, -4)
    : apiBaseUrl;
  return withApiRemoved.replace(/\/$/, "");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHours(hours: number) {
  return `${hours.toFixed(1)}h`;
}


const QuickActionsSection: React.FC<{ actions: QuickAction[] }> = ({
  actions,
}) => {
  const { t } = useLanguage();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>{t('homepage.quickActions')}</span>
        </CardTitle>
      </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant="outline"
            className={`w-full h-auto p-4 flex items-center space-x-3 ${action.color} text-white border-0`}
            onClick={action.onClick}
          >
            {action.icon}
            <div className="text-left">
              <div className="font-medium">{action.title}</div>
              <div className="text-xs opacity-90">{action.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </CardContent>
  </Card>
  );
};

const PendingTicketsSection: React.FC<{
  tickets: APIPendingTicket[];
  loading: boolean;
  error: string | null;
  onTicketClick: (ticketId: number) => void;
}> = ({ tickets, loading, error, onTicketClick }) => {
  const { t } = useLanguage();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Ticket className="h-5 w-5" />
          <span>{t('homepage.pendingTickets')}</span>
        </CardTitle>
      </CardHeader>
    <CardContent>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-brand"></div>
          <p>{t('homepage.loadingPendingTickets')}</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-destructive dark:text-red-300">
          <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>{t('homepage.errorLoadingTickets')}</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-4">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-foreground">
                <thead className="border-b border-border/70 bg-muted/40">
                  <tr>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Ticket
                    </th>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Priority
                    </th>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Area
                    </th>
                    <th className="py-2 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
                      onClick={() => onTicketClick(ticket.id)}
                    >
                      <td className="py-3 font-semibold text-foreground">
                        {ticket.ticket_number}
                      </td>
                      <td className="py-3 max-w-xs truncate text-foreground">
                        {ticket.title}
                      </td>
                      <td className="py-3">
                        <Badge className={getTicketStatusClass(ticket.status)}>
                          {ticket.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={getTicketPriorityClass(ticket.priority)}>
                          {ticket.priority?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {ticket.area_name || "N/A"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 border border-border/70 rounded-lg bg-card hover:bg-muted/60 dark:hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onTicketClick(ticket.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-foreground">
                    {ticket.ticket_number}
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getTicketStatusClass(ticket.status)}>
                      {ticket.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge className={getTicketPriorityClass(ticket.priority)}>
                      {ticket.priority?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-foreground mb-2">
                  {ticket.title}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Area: {ticket.area_name || "N/A"}</div>
                  <div>
                    Created: {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                  {ticket.user_relationship && (
                    <div className="font-medium text-primary">
                      {ticket.user_relationship === "creator"
                        ? t('homepage.youCreatedThisTicket')
                        : ticket.user_relationship === "approver"
                          ? t('homepage.requiresYourApproval')
                          : t('homepage.viewOnly')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>{t('homepage.noPendingTickets')}</p>
          <p className="text-sm">{t('homepage.allTicketsUpToDate')}</p>
        </div>
      )}
    </CardContent>
  </Card>
  );
};

// Personal Completed Ticket Count Chart Component (L2+ users only)
// Personal Completed Ticket Chart Component
const PersonalCompletedTicketChart: React.FC<{
  data: Array<{ period: string; tickets: number; target: number }>;
  loading: boolean;
  error: string | null;
  onKpiSetupClick: () => void;
  selectedYear: number;
}> = ({ data, loading, error, onKpiSetupClick, selectedYear }) => {
  const { t } = useLanguage();
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const period = data.period;
      
      // Calculate date range for this period using the selected year
      const getPeriodDateRange = (period: string, year: number) => {
        const newYearDay = new Date(year, 0, 1);
        const firstSunday = new Date(newYearDay);
        const dayOfWeek = newYearDay.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
        firstSunday.setDate(newYearDay.getDate() - daysToSubtract);
        
        const periodNumber = parseInt(period.replace('P', ''));
        const periodStartDate = new Date(firstSunday);
        periodStartDate.setDate(firstSunday.getDate() + (periodNumber - 1) * 28);
        
        const periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodStartDate.getDate() + 27);
        
        return {
          startDate: periodStartDate.toLocaleDateString(),
          endDate: periodEndDate.toLocaleDateString()
        };
      };
      
      const dateRange = getPeriodDateRange(period, selectedYear);
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{`${period}`}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {`${dateRange.startDate} - ${dateRange.endDate}`}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-success font-medium">Completed Tickets:</span> {data.tickets}
            </p>
            <p className="text-sm">
              <span className="text-destructive font-medium">Target:</span> {data.target}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{t('homepage.myCompleteCasesPerPeriod')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onKpiSetupClick}
            className="flex items-center space-x-1"
          >
            <Settings className="h-4 w-4" />
            <span>{t('homepage.setupKPI')}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-red-600">
            <div className="text-center">
              <p className="font-medium">{t('homepage.errorLoadingChartData')}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="tickets" fill="hsl(var(--accent))" name={t('homepage.completedTickets')} />
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name={t('homepage.target')}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('homepage.noCompletedTicketData')}</p>
              <p className="text-sm">{t('homepage.completeSomeTickets')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Personal Ticket Count Chart Component
const PersonalTicketCountChart: React.FC<{
  data: Array<{ period: string; tickets: number; target: number }>;
  loading: boolean;
  error: string | null;
  onKpiSetupClick: () => void;
  selectedYear: number;
}> = ({ data, loading, error, onKpiSetupClick, selectedYear }) => {
  const { t } = useLanguage();
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const period = data.period;
      
      // Calculate date range for this period using the selected year
      const getPeriodDateRange = (period: string, year: number) => {
        const newYearDay = new Date(year, 0, 1);
        const firstSunday = new Date(newYearDay);
        const dayOfWeek = newYearDay.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
        firstSunday.setDate(newYearDay.getDate() - daysToSubtract);
        
        const periodNumber = parseInt(period.replace('P', ''));
        const periodStartDate = new Date(firstSunday);
        periodStartDate.setDate(firstSunday.getDate() + (periodNumber - 1) * 28);
        
        const periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodStartDate.getDate() + 27);
        
        return {
          startDate: periodStartDate.toLocaleDateString(),
          endDate: periodEndDate.toLocaleDateString()
        };
      };
      
      const dateRange = getPeriodDateRange(period, selectedYear);
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{`${period}`}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {`${dateRange.startDate} - ${dateRange.endDate}`}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-brand font-medium">My Tickets:</span> {data.tickets}
            </p>
            <p className="text-sm">
              <span className="text-destructive font-medium">Target:</span> {data.target}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{t('homepage.myReportCasePerPeriod')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onKpiSetupClick}
            className="flex items-center space-x-1"
          >
            <Settings className="h-4 w-4" />
            <span>{t('homepage.setupKPI')}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-red-600">
            <div className="text-center">
              <p className="font-medium">{t('homepage.errorLoadingChartData')}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="tickets" fill="hsl(var(--primary))" name={t('homepage.myTickets')} />
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name={t('homepage.target')}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('homepage.noTicketDataAvailable')}</p>
              <p className="text-sm">{t('homepage.startCreatingTickets')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Personal KPI Tiles Component (Role-based)
const PersonalKPITiles: React.FC<{
  kpiData: any;
  loading: boolean;
  error: string | null;
}> = ({ kpiData, loading, error }) => {
  const { t } = useLanguage();
  // Utility function for dynamic currency formatting (same as AbnormalReportDashboardV2Page)
  const formatCurrencyDynamic = (amount: number): { display: string; tooltip: string } => {
    const tooltip = `฿${amount.toLocaleString('en-US')} THB`;
    
    if (amount >= 1000000) {
      return {
        display: `฿${(amount / 1000000).toFixed(1)}M`,
        tooltip
      };
    } else if (amount >= 1000) {
      return {
        display: `฿${(amount / 1000).toFixed(1)}K`,
        tooltip
      };
    } else {
      return {
        display: `฿${amount.toFixed(0)}`,
        tooltip
      };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton for reporter metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-brand" />
            {t('homepage.asReporter')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Loading skeleton for action person metrics (if L2+) */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-success" />
            {t('homepage.asActionPerson')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-red-600">
            <p className="font-medium">{t('homepage.errorLoadingKPIData')}</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpiData) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <p>{t('homepage.noKPIDataAvailable')}</p>
            <p className="text-sm">{t('homepage.loadingPersonalMetrics')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userRole, reporterMetrics, actionPersonMetrics, summary } = kpiData;

  // Reporter KPI tiles (for all users)
  const reporterTiles = [
    {
      title: t('homepage.myReportsCreated'),
      value: reporterMetrics.totalReportsThisPeriod,
      change: summary.reporterComparisonMetrics.reportGrowthRate.percentage,
      changeDescription: summary.reporterComparisonMetrics.reportGrowthRate.description,
      changeType: summary.reporterComparisonMetrics.reportGrowthRate.type,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-brand'
    },
    {
      title: t('homepage.downtimeAvoidedByMyReports'),
      value: `${reporterMetrics.downtimeAvoidedByReportsThisPeriod.toFixed(1)} hrs`,
      change: summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth.percentage,
      changeDescription: summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth.description,
      changeType: summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth.type,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-accent'
    },
    {
      title: t('homepage.costAvoidedByMyReports'),
      value: formatCurrencyDynamic(reporterMetrics.costAvoidedByReportsThisPeriod).display,
      tooltip: formatCurrencyDynamic(reporterMetrics.costAvoidedByReportsThisPeriod).tooltip,
      change: summary.reporterComparisonMetrics.costAvoidedByReportsGrowth.percentage,
      changeDescription: summary.reporterComparisonMetrics.costAvoidedByReportsGrowth.description,
      changeType: summary.reporterComparisonMetrics.costAvoidedByReportsGrowth.type,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-info'
    }
  ];

  // Action Person KPI tiles (for L2+ users only)
  const actionPersonTiles = actionPersonMetrics ? [
    {
      title: t('homepage.casesIFixed'),
      value: actionPersonMetrics.totalCasesFixedThisPeriod,
      change: summary.actionPersonComparisonMetrics.casesFixedGrowthRate.percentage,
      changeDescription: summary.actionPersonComparisonMetrics.casesFixedGrowthRate.description,
      changeType: summary.actionPersonComparisonMetrics.casesFixedGrowthRate.type,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success'
    },
    {
      title: t('homepage.downtimeIFixed'),
      value: `${actionPersonMetrics.downtimeAvoidedByFixesThisPeriod.toFixed(1)} hrs`,
      change: summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth.percentage,
      changeDescription: summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth.description,
      changeType: summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth.type,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-accent'
    },
    {
      title: t('homepage.costIFixed'),
      value: formatCurrencyDynamic(actionPersonMetrics.costAvoidedByFixesThisPeriod).display,
      tooltip: formatCurrencyDynamic(actionPersonMetrics.costAvoidedByFixesThisPeriod).tooltip,
      change: summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth.percentage,
      changeDescription: summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth.description,
      changeType: summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth.type,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-info'
    }
  ] : [];

  const renderKpiTile = (kpi: any, index: number) => (
    <Card key={index}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
            {kpi.tooltip ? (
              <p className="text-2xl font-bold cursor-help" title={kpi.tooltip}>{kpi.value}</p>
            ) : (
              <p className="text-2xl font-bold">{kpi.value}</p>
            )}
            {kpi.change !== undefined && (
              <div className="flex items-center mt-1">
                {kpi.changeType === 'increase' ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : kpi.changeType === 'decrease' ? (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <div className="h-3 w-3 bg-muted rounded-full mr-1" />
                )}
                <span className={`text-xs ${
                  kpi.changeType === 'increase' ? 'text-green-500' :
                  kpi.changeType === 'decrease' ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {kpi.changeType === 'no_change' ? t('homepage.noChange') :
                   `${Math.abs(kpi.change).toFixed(1)}%`}
                </span>
              </div>
            )}
            {kpi.changeDescription && (
              <div className="text-xs text-muted-foreground mt-1">
                {kpi.changeDescription}
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
            {kpi.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Reporter Metrics Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-brand" />
          {t('homepage.asReporter')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reporterTiles.map((kpi, index) => renderKpiTile(kpi, index))}
        </div>
      </div>

      {/* Action Person Metrics Section (L2+ only) */}
      {userRole === 'L2+' && actionPersonTiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-success" />
            {t('homepage.asActionPerson')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionPersonTiles.map((kpi, index) => renderKpiTile(kpi, index))}
          </div>
        </div>
      )}
    </div>
  );
};

const PersonalKPISection: React.FC<{ 
  personalKPI: PersonalKPI;
  timeFilter: string;
  selectedYear: number;
  selectedPeriod: number;
  personalTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalTicketLoading: boolean;
  personalTicketError: string | null;
  personalCompletedTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalCompletedTicketLoading: boolean;
  personalCompletedTicketError: string | null;
  personalKPIData: any;
  personalKPILoading: boolean;
  personalKPIError: string | null;
  onKpiSetupClick: (type: 'report' | 'fix') => void;
}> = ({
  personalKPI,
  timeFilter,
  selectedYear,
  selectedPeriod,
  personalTicketData,
  personalTicketLoading,
  personalTicketError,
  personalCompletedTicketData,
  personalCompletedTicketLoading,
  personalCompletedTicketError,
  personalKPIData,
  personalKPILoading,
  personalKPIError,
  onKpiSetupClick,
}) => (
  <div className="space-y-4">
    {/* Personal KPI Tiles */}
    <PersonalKPITiles 
      kpiData={personalKPIData}
      loading={personalKPILoading}
      error={personalKPIError}
    />
    
    {/* Personal Ticket Count Chart */}
    <PersonalTicketCountChart 
      data={personalTicketData}
      loading={personalTicketLoading}
      error={personalTicketError}
      onKpiSetupClick={() => onKpiSetupClick('report')}
      selectedYear={selectedYear}
    />
    
    {/* Personal Completed Ticket Count Chart (L2+ users only) */}
    <PersonalCompletedTicketChart 
      data={personalCompletedTicketData}
      loading={personalCompletedTicketLoading}
      error={personalCompletedTicketError}
      onKpiSetupClick={() => onKpiSetupClick('fix')}
      selectedYear={selectedYear}
    />
    
    {/* Legacy chart - keeping for now */}
    
    
  </div>
);

const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [personalKPI] = useState<PersonalKPI>(mockPersonalKPI);
  const [pendingTickets, setPendingTickets] = useState<APIPendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Personal tab time range filter state
  const [personalTimeFilter, setPersonalTimeFilter] = useState<string>('this-period');
  const [personalSelectedYear, setPersonalSelectedYear] = useState<number>(new Date().getFullYear());
  const [personalSelectedPeriod, setPersonalSelectedPeriod] = useState<number>(1);

  // Personal ticket data state
  const [personalTicketData, setPersonalTicketData] = useState<Array<{ period: string; tickets: number; target: number }>>([]);
  const [personalTicketLoading, setPersonalTicketLoading] = useState<boolean>(false);
  const [personalTicketError, setPersonalTicketError] = useState<string | null>(null);

  // Personal completed ticket data state (L2+ users only)
  const [personalCompletedTicketData, setPersonalCompletedTicketData] = useState<Array<{ period: string; tickets: number; target: number }>>([]);
  const [personalCompletedTicketLoading, setPersonalCompletedTicketLoading] = useState<boolean>(false);
  const [personalCompletedTicketError, setPersonalCompletedTicketError] = useState<string | null>(null);

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
        const response = await ticketService.getUserPendingTickets();
        if (response.success) {
          setPendingTickets(response.data);
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

  // Fetch personal completed ticket data when filters change (L2+ users only)
  useEffect(() => {
    fetchPersonalCompletedTicketData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  // Fetch personal KPI data when filters change
  useEffect(() => {
    fetchPersonalKPIData();
  }, [personalTimeFilter, personalSelectedYear, personalSelectedPeriod, isAuthenticated, user]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: t('homepage.createTicket'),
        description: t('homepage.reportNewIssue'),
        icon: <Ticket className="h-6 w-6" />,
        onClick: () => {
          // Check if screen is mobile size (less than md breakpoint)
          const isMobile = window.innerWidth < 768; // md breakpoint is 768px
          if (isMobile) {
            navigate("/tickets/create/wizard");
          } else {
            navigate("/tickets/create");
          }
        },
        color: "bg-red-600 hover:bg-red-400",
      },
      {
        title: t('homepage.viewTickets'),
        description: t('homepage.checkTicketStatus'),
        icon: <FileText className="h-6 w-6" />,
        onClick: () => navigate("/tickets"),
        color: "bg-gray-600 hover:bg-gray-500",
      },
    ],
    [navigate, t],
  );

  const subtitleSource = user as unknown as
    | { title?: string; departmentName?: string }
    | undefined;
  const userTitle = subtitleSource?.title;
  const departmentName = subtitleSource?.departmentName ?? "Department";
  const subtitle = userTitle
    ? `${userTitle} • ${departmentName}`
    : departmentName;
  const uploadsBase = useMemo(() => getUploadsBase(API_BASE_URL), []);
  const avatarSrc = user?.avatarUrl
    ? `${uploadsBase}${user.avatarUrl}`
    : undefined;
  const avatarInitials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  const handleTicketClick = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`);
  };

  // Handle KPI setup modal
  const handleKpiSetupClick = (type: 'report' | 'fix') => {
    setKpiSetupModalType(type);
    setKpiSetupModalOpen(true);
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

      const dateRange = getPersonalDateRange(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
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

        // Add real target data or fallback to mock targets
        const dataWithTargets = ticketResponse.data.map(item => ({
          ...item,
          target: targetMap[item.period] || 15 // Fallback to mock target if no real target
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

  // Fetch personal completed ticket data (L2+ users only)
  const fetchPersonalCompletedTicketData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalCompletedTicketLoading(false);
      return;
    }

    try {
      setPersonalCompletedTicketLoading(true);
      setPersonalCompletedTicketError(null);

      const dateRange = getPersonalDateRange(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      const params = {
        year: yearFromDateRange,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      // Fetch both completed ticket data and personal targets
      const [ticketResponse, targetResponse] = await Promise.all([
        ticketService.getUserCompletedTicketCountPerPeriod(params),
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

        // Add real target data or fallback to mock targets
        const dataWithTargets = ticketResponse.data.map(item => ({
          ...item,
          target: targetMap[item.period] || 15 // Fallback to mock target if no real target
        }));
        setPersonalCompletedTicketData(dataWithTargets);
      } else {
        setPersonalCompletedTicketError(t('homepage.failedToFetchPersonalCompletedTicketData'));
      }
    } catch (err) {
      console.error('Error fetching personal completed ticket data:', err);
      setPersonalCompletedTicketError(
        err instanceof Error
          ? err.message
          : t('homepage.failedToFetchPersonalCompletedTicketData')
      );
    } finally {
      setPersonalCompletedTicketLoading(false);
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

      const dateRange = getPersonalDateRange(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
      
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

  // Utility function to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Utility function to calculate period for a specific date (based on backend logic)
  const calculatePeriodForDate = (date: Date, year: number) => {
    const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const firstSunday = new Date(firstDayOfYear);
    
    // Adjust to first Sunday
    const dayOfWeek = firstDayOfYear.getDay();
    const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
    
    // Calculate period number (1-based)
    const daysSinceFirstSunday = Math.floor((date.getTime() - firstSunday.getTime()) / (1000 * 60 * 60 * 24));
    const periodNumber = Math.floor(daysSinceFirstSunday / 28) + 1;
    
    return {
      period: periodNumber,
      firstSunday
    };
  };

  // Utility function to get date range based on time filter (similar to AbnormalReportDashboardV2Page)
  const getPersonalDateRange = (timeFilter: string, year?: number, period?: number) => {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    
    switch (timeFilter) {
      case 'this-year':
        // For this-year, we need to find the first Sunday of the week containing New Year's Day
        const newYearDay = new Date(currentYear, 0, 1); // January 1st
        const firstSundayOfYear = new Date(newYearDay);
        const dayOfWeek = newYearDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek; // Go back to Sunday
        firstSundayOfYear.setDate(newYearDay.getDate() - daysToSubtract);
        
        // Calculate the end date (13 periods * 28 days = 364 days)
        const yearEndDate = new Date(firstSundayOfYear);
        yearEndDate.setDate(firstSundayOfYear.getDate() + 363); // 364 days - 1 (inclusive)
        
        return {
          startDate: formatLocalDate(firstSundayOfYear),
          endDate: formatLocalDate(yearEndDate),
          compare_startDate: `${currentYear - 1}-01-01`,
          compare_endDate: `${currentYear - 1}-12-31`
        };
      case 'last-year':
        return {
          startDate: `${currentYear - 1}-01-01`,
          endDate: `${currentYear - 1}-12-31`,
          compare_startDate: `${currentYear - 2}-01-01`,
          compare_endDate: `${currentYear - 2}-12-31`
        };
      case 'this-period':
        // Calculate current 28-day period based on first Sunday of the year
        const currentPeriodInfo = calculatePeriodForDate(now, currentYear);
        const currentPeriod = currentPeriodInfo.period;
        
        // Calculate current period start and end dates
        const currentPeriodStartDate = new Date(currentPeriodInfo.firstSunday);
        currentPeriodStartDate.setDate(currentPeriodInfo.firstSunday.getDate() + (currentPeriod - 1) * 28);
        
        const currentPeriodEndDate = new Date(currentPeriodStartDate);
        currentPeriodEndDate.setDate(currentPeriodStartDate.getDate() + 27); // 28 days - 1
        
        // Calculate previous period for comparison
        const currentPrevPeriodStartDate = new Date(currentPeriodStartDate);
        currentPrevPeriodStartDate.setDate(currentPeriodStartDate.getDate() - 28);
        
        const currentPrevPeriodEndDate = new Date(currentPrevPeriodStartDate);
        currentPrevPeriodEndDate.setDate(currentPrevPeriodStartDate.getDate() + 27);
        
        return {
          startDate: formatLocalDate(currentPeriodStartDate),
          endDate: formatLocalDate(currentPeriodEndDate),
          compare_startDate: formatLocalDate(currentPrevPeriodStartDate),
          compare_endDate: formatLocalDate(currentPrevPeriodEndDate)
        };
      case 'select-period':
        // Correct period calculation: 28-day periods starting from first Sunday of the week containing New Year's Day
        const newYearDayForPeriod = new Date(currentYear, 0, 1); // January 1st
        const firstSundayForPeriod = new Date(newYearDayForPeriod);
        const dayOfWeekForPeriod = newYearDayForPeriod.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtractForPeriod = dayOfWeekForPeriod === 0 ? 0 : dayOfWeekForPeriod; // Go back to Sunday
        firstSundayForPeriod.setDate(newYearDayForPeriod.getDate() - daysToSubtractForPeriod);
        
        // Calculate the specific period start date
        const periodStartDate = new Date(firstSundayForPeriod);
        periodStartDate.setDate(firstSundayForPeriod.getDate() + (period! - 1) * 28);
        
        // Calculate the period end date (28 days later)
        const periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodStartDate.getDate() + 27); // 28 days - 1
        
        // Calculate previous period for comparison
        const prevPeriodStartDate = new Date(periodStartDate);
        prevPeriodStartDate.setDate(periodStartDate.getDate() - 28);
        
        const prevPeriodEndDate = new Date(prevPeriodStartDate);
        prevPeriodEndDate.setDate(prevPeriodStartDate.getDate() + 27);
        
        return {
          startDate: formatLocalDate(periodStartDate),
          endDate: formatLocalDate(periodEndDate),
          compare_startDate: formatLocalDate(prevPeriodStartDate),
          compare_endDate: formatLocalDate(prevPeriodEndDate)
        };
      default:
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
          compare_startDate: `${currentYear - 1}-01-01`,
          compare_endDate: `${currentYear - 1}-12-31`
        };
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="avatar" /> : null}
            <AvatarFallback className="text-sm">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {t('homepage.welcome')}, {user?.firstName} {user?.lastName}!
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="quick-actions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="quick-actions"
            className="flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t('homepage.quickActions')}</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{t('homepage.personal')}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{t('homepage.team')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <QuickActionsSection actions={quickActions} />
            </div>
            <div className="lg:col-span-2">
              <PendingTicketsSection
                tickets={pendingTickets}
                loading={loading}
                error={error}
                onTicketClick={handleTicketClick}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
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
                      const dateRange = getPersonalDateRange(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
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
            personalKPI={personalKPI}
            timeFilter={personalTimeFilter}
            selectedYear={personalSelectedYear}
            selectedPeriod={personalSelectedPeriod}
            personalTicketData={personalTicketData}
            personalTicketLoading={personalTicketLoading}
            personalTicketError={personalTicketError}
            personalCompletedTicketData={personalCompletedTicketData}
            personalCompletedTicketLoading={personalCompletedTicketLoading}
            personalCompletedTicketError={personalCompletedTicketError}
            personalKPIData={personalKPIData}
            personalKPILoading={personalKPILoading}
            personalKPIError={personalKPIError}
            onKpiSetupClick={handleKpiSetupClick}
          />
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>{t('homepage.teamPerformance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                {t('homepage.teamPerformanceComingSoon')}
              </p>
            </CardContent>
          </Card>
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
          fetchPersonalCompletedTicketData();
        }}
      />

      {/* Personal Filter Modal */}
      <PersonalFilterModal
        open={personalFilterModalOpen}
        onOpenChange={setPersonalFilterModalOpen}
        timeFilter={personalTimeFilter}
        setTimeFilter={setPersonalTimeFilter}
        selectedYear={personalSelectedYear}
        setSelectedYear={setPersonalSelectedYear}
        selectedPeriod={personalSelectedPeriod}
        setSelectedPeriod={setPersonalSelectedPeriod}
      />
    </div>
  );
};

export default HomePage;
