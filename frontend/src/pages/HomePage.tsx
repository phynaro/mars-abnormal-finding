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
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp as TrendingUpIcon,
  User,
  Users,
} from "lucide-react";
import {
  ticketService,
  type PendingTicket as APIPendingTicket,
} from "@/services/ticketService";

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

interface BadgeConfig {
  label: string;
  className: string;
}

const BADGE_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold";
const DEFAULT_BADGE_CLASS =
  "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200";

const STATUS_BADGES: Record<APIPendingTicket["status"], BadgeConfig> = {
  open: {
    label: "Open",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-200",
  },
  in_progress: {
    label: "In Progress",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/40 dark:text-blue-200",
  },
  pending_approval: {
    label: "Pending Approval",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-900/40 dark:text-yellow-200",
  },
  pending_assignment: {
    label: "Pending Assignment",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-900/40 dark:text-purple-200",
  },
};

const PRIORITY_BADGES: Record<APIPendingTicket["priority"], BadgeConfig> = {
  urgent: {
    label: "Urgent",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-900/40 dark:text-red-200",
  },
  high: {
    label: "High",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-900/40 dark:text-orange-200",
  },
  medium: {
    label: "Medium",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-900/40 dark:text-yellow-200",
  },
  low: {
    label: "Low",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
};

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

const createBadge = (label: string, className: string) => (
  <span className={`${BADGE_BASE_CLASS} ${className}`}>{label}</span>
);

const StatusBadge: React.FC<{ status: APIPendingTicket["status"] }> = ({
  status,
}) => {
  const config = STATUS_BADGES[status] ?? {
    label: status,
    className: DEFAULT_BADGE_CLASS,
  };
  return createBadge(config.label, config.className);
};

const PriorityBadge: React.FC<{ priority: APIPendingTicket["priority"] }> = ({
  priority,
}) => {
  const config = PRIORITY_BADGES[priority] ?? {
    label: priority,
    className: DEFAULT_BADGE_CLASS,
  };
  return createBadge(config.label, config.className);
};

const QuickActionsSection: React.FC<{ actions: QuickAction[] }> = ({
  actions,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <TrendingUp className="h-5 w-5" />
        <span>Quick Actions</span>
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

const PendingTicketsSection: React.FC<{
  tickets: APIPendingTicket[];
  loading: boolean;
  error: string | null;
  onTicketClick: (ticketId: number) => void;
}> = ({ tickets, loading, error, onTicketClick }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Ticket className="h-5 w-5" />
        <span>Pending Tickets</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p>Loading pending tickets...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-destructive dark:text-red-300">
          <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Error loading tickets</p>
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
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-3">
                        <PriorityBadge priority={ticket.priority} />
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
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
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
                        ? "You created this ticket"
                        : ticket.user_relationship === "approver"
                          ? "Requires your approval"
                          : "View only"}
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
          <p>No pending tickets</p>
          <p className="text-sm">All your tickets are up to date!</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const PersonalKPISection: React.FC<{ personalKPI: PersonalKPI }> = ({
  personalKPI,
}) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Tickets Created This Year</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={personalKPI.ticketsCreatedByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tickets" fill="#3b82f6" name="Tickets Created" />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#ef4444"
              strokeWidth={2}
              name="Target"
              dot={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">
                  Downtime Avoidance
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatHours(personalKPI.downtimeAvoidance.thisPeriod)}
              </div>
              <div className="text-sm text-gray-500">
                This Period • #{personalKPI.downtimeAvoidance.ranking} Ranking
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatHours(personalKPI.downtimeAvoidance.thisYear)} This Year
              </div>
            </div>
            <Award className="h-8 w-8 text-blue-100" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">
                  Cost Avoidance
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(personalKPI.costAvoidance.thisPeriod)}
              </div>
              <div className="text-sm text-gray-500">
                This Period • #{personalKPI.costAvoidance.ranking} Ranking
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatCurrency(personalKPI.costAvoidance.thisYear)} This Year
              </div>
            </div>
            <TrendingUpIcon className="h-8 w-8 text-green-100" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Ticket className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">
                  Ticket Performance
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {personalKPI.ticketStats.closedCount}/
                {personalKPI.ticketStats.openCount}
              </div>
              <div className="text-sm text-gray-500">
                Closed/Open • #{personalKPI.ticketStats.ranking} Ranking
              </div>
              <div className="text-xs text-gray-400 mt-1">By Create Count</div>
            </div>
            <Target className="h-8 w-8 text-orange-100" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [personalKPI] = useState<PersonalKPI>(mockPersonalKPI);
  const [pendingTickets, setPendingTickets] = useState<APIPendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending tickets on component mount
  useEffect(() => {
    const fetchPendingTickets = async () => {
      try {
        setLoading(true);
        const response = await ticketService.getUserPendingTickets();
        if (response.success) {
          setPendingTickets(response.data);
        } else {
          setError("Failed to fetch pending tickets");
        }
      } catch (err) {
        console.error("Error fetching pending tickets:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch pending tickets",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPendingTickets();
  }, []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: "Create Ticket",
        description: "Report a new issue or request",
        icon: <Ticket className="h-6 w-6" />,
        onClick: () => navigate("/tickets/create"),
        color: "bg-blue-500 hover:bg-blue-600",
      },
      {
        title: "View Tickets",
        description: "Check your ticket status",
        icon: <FileText className="h-6 w-6" />,
        onClick: () => navigate("/tickets"),
        color: "bg-green-500 hover:bg-green-600",
      },
    ],
    [navigate],
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="avatar" /> : null}
            <AvatarFallback className="text-lg">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName} {user?.lastName}!
            </h1>
            <p className="text-gray-600 mt-1">{subtitle}</p>
          </div>
        </div>
        {/* <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/profile")}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Profile</span>
          </Button>
        </div> */}
      </div>

      <Tabs defaultValue="quick-actions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="quick-actions"
            className="flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Quick Actions</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Personal</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <TabsContent value="personal" className="space-y-6">
          <PersonalKPISection personalKPI={personalKPI} />
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Team performance metrics coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomePage;
