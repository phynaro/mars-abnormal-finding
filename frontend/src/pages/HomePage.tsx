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
  BarChart3,
  DollarSign,
  Settings,
  Ticket,
  TrendingUp,
  TrendingDown,
  User,
  AlertTriangle,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  ArrowUp,
  Clock,
  Lock,
  Star,
  X,
  Calendar,
  UserCheck,
  Eye,
} from "lucide-react";
import {
  ticketService,
  type PendingTicket as APIPendingTicket,
} from "@/services/ticketService";
import personalTargetService from "@/services/personalTargetService";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PersonalKPISetupModal from "@/components/personal/PersonalKPISetupModal";
import PersonalFilterModal from "@/components/personal/PersonalFilterModal";
import {
  getTicketPriorityClass,
  getTicketSeverityClass,
  getTicketStatusClass,
} from "@/utils/ticketBadgeStyles";
import { getApiBaseUrl, getAvatarUrl } from "@/utils/url";

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

// Helper function to get relationship configuration
const getRelationshipConfig = (relationship: string) => {
  const configs = {
    'escalate_approver': {
      icon: <ArrowUp className="h-5 w-5" />,
      title: 'Escalated Tickets',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      priority: 1,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'escalated_by', label: 'Escalated By' },
        { key: 'escalated_at', label: 'Escalated At' }
      ]
    },
    'accept_approver': {
      icon: <CheckCircle className="h-5 w-5" />,
      title: 'Tickets to Accept',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      priority: 2,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'reporter_name', label: 'Created By' },
        { key: 'created_at', label: 'Created At' }
      ]
    },
    'close_approver': {
      icon: <Lock className="h-5 w-5" />,
      title: 'Tickets to Close',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      priority: 3,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'reviewed_by', label: 'Reviewed By' },
        { key: 'reviewed_at', label: 'Reviewed At' }
      ]
    },
    'review_approver': {
      icon: <Star className="h-5 w-5" />,
      title: 'Tickets to Review',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      priority: 4,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'finished_by', label: 'Finished By' },
        { key: 'finished_at', label: 'Finished At' }
      ]
    },
    'reject_approver': {
      icon: <X className="h-5 w-5" />,
      title: 'Tickets to Review (Rejected)',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      priority: 5,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'rejected_by', label: 'Rejected By' },
        { key: 'rejected_at', label: 'Rejected At' }
      ]
    },
    'planner': {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Tickets to Plan',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      priority: 6,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'reporter_name', label: 'Created By' },
        { key: 'created_at', label: 'Created At' },
        { key: 'accepted_by', label: 'Accepted By' },
        { key: 'accepted_at', label: 'Accepted At' }
      ]
    },
    'assignee': {
      icon: <UserCheck className="h-5 w-5" />,
      title: 'My Assigned Tickets',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      priority: 7,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'scheduled_start', label: 'Scheduled Start' },
        { key: 'scheduled_complete', label: 'Scheduled Finish' }
      ]
    },
    'requester': {
      icon: <User className="h-5 w-5" />,
      title: 'My Created Tickets',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200',
      priority: 8,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'assignee_name', label: 'Assigned To' },
        { key: 'scheduled_start', label: 'Scheduled Start' },
        { key: 'scheduled_complete', label: 'Scheduled Complete' }
      ]
    },
    'viewer': {
      icon: <Eye className="h-5 w-5" />,
      title: 'Other Tickets',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 border-gray-200',
      priority: 9,
      columns: [
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'severity_level', label: 'Severity' },
        { key: 'pu_name', label: 'PU Name' },
        { key: 'reporter_name', label: 'Created By' },
        { key: 'created_at', label: 'Created At' },
        { key: 'assignee_name', label: 'Assigned To' }
      ]
    }
  };
  
  return configs[relationship as keyof typeof configs] || configs.viewer;
};

// Helper function to render mobile card content with labels
const renderMobileCardContent = (ticket: APIPendingTicket, fieldKey: string) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  switch (fieldKey) {
    case 'accepted_at':
      return ticket.accepted_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Accepted: {formatDate(ticket.accepted_at)}</span>
        </div>
      ) : null;
    
    case 'accepted_by':
      return ticket.accepted_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Accepted by: {ticket.accepted_by_name}</span>
        </div>
      ) : null;
    
    case 'escalated_at':
      return ticket.escalated_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Escalated: {formatDateTime(ticket.escalated_at)}</span>
        </div>
      ) : null;
    
    case 'escalated_by':
      return ticket.escalated_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Escalated by: {ticket.escalated_by_name}</span>
        </div>
      ) : null;
    
    case 'reviewed_at':
      return ticket.reviewed_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Reviewed: {formatDateTime(ticket.reviewed_at)}</span>
        </div>
      ) : null;
    
    case 'reviewed_by':
      return ticket.reviewed_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Reviewed by: {ticket.reviewed_by_name}</span>
        </div>
      ) : null;
    
    case 'finished_at':
      return ticket.finished_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Finished: {formatDateTime(ticket.finished_at)}</span>
        </div>
      ) : null;
    
    case 'finished_by':
      return ticket.finished_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Finished by: {ticket.finished_by_name}</span>
        </div>
      ) : null;
    
    case 'rejected_at':
      return ticket.rejected_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Rejected: {formatDateTime(ticket.rejected_at)}</span>
        </div>
      ) : null;
    
    case 'rejected_by':
      return ticket.rejected_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Rejected by: {ticket.rejected_by_name}</span>
        </div>
      ) : null;
    
    case 'scheduled_start':
      return ticket.schedule_start ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Scheduled start: {formatDateTime(ticket.schedule_start)}</span>
        </div>
      ) : null;
    
    case 'scheduled_complete':
      return ticket.schedule_finish ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Scheduled finish: {formatDateTime(ticket.schedule_finish)}</span>
        </div>
      ) : null;
    
    case 'reporter_name':
      return ticket.reporter_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Created by: {ticket.reporter_name}</span>
        </div>
      ) : null;
    
    case 'created_at':
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Created: {formatDate(ticket.created_at)}</span>
        </div>
      );
    
    case 'assignee_name':
      return ticket.assignee_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>Assigned to: {ticket.assignee_name}</span>
        </div>
      ) : null;
    
    default:
      return null;
  }
};

// Helper function to render cell content based on field type
const renderCellContent = (ticket: APIPendingTicket, fieldKey: string) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  switch (fieldKey) {
    case 'ticket_number':
      return <span className="font-medium">{ticket.ticket_number}</span>;
    
    case 'title':
      return (
        <div>
          <div className="font-medium">{ticket.title}</div>
          <div className="text-muted-foreground truncate max-w-xs text-xs">
            {ticket.description}
          </div>
        </div>
      );
    
    case 'status':
      return (
        <Badge className={getTicketStatusClass(ticket.status)}>
          {ticket.status.replace("_", " ").toUpperCase()}
        </Badge>
      );
    
    case 'priority':
      return (
        <Badge className={getTicketPriorityClass(ticket.priority)}>
          {ticket.priority?.toUpperCase()}
        </Badge>
      );
    
    case 'severity_level':
      return (
        <Badge className={getTicketSeverityClass(ticket.severity_level)}>
          {ticket.severity_level?.toUpperCase()}
        </Badge>
      );
    
    case 'pu_name':
      return <span className="text-sm">{ticket.pu_name || ticket.pucode || 'N/A'}</span>;
    
    case 'reporter_name':
      return (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.reporter_name || 'Unknown User'}</span>
        </div>
      );
    
    case 'assignee_name':
      return ticket.assignee_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.assignee_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      );
    
    case 'created_at':
      return <span className="text-muted-foreground">{formatDate(ticket.created_at)}</span>;
    
    case 'accepted_at':
      return ticket.accepted_at ? (
        <span className="text-muted-foreground">{formatDate(ticket.accepted_at)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'accepted_by':
      return ticket.accepted_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.accepted_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'escalated_at':
      return ticket.escalated_at ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.escalated_at)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'escalated_by':
      return ticket.escalated_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.escalated_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'reviewed_at':
      return ticket.reviewed_at ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.reviewed_at)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'reviewed_by':
      return ticket.reviewed_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.reviewed_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'finished_at':
      return ticket.finished_at ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.finished_at)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'finished_by':
      return ticket.finished_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.finished_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'rejected_at':
      return ticket.rejected_at ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.rejected_at)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'rejected_by':
      return ticket.rejected_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.rejected_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'scheduled_start':
      return ticket.schedule_start ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.schedule_start)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    case 'scheduled_complete':
      return ticket.schedule_finish ? (
        <span className="text-muted-foreground">{formatDateTime(ticket.schedule_finish)}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    
    default:
      return <span className="text-muted-foreground">-</span>;
  }
};



const PendingTicketsSection: React.FC<{
  tickets: APIPendingTicket[];
  loading: boolean;
  error: string | null;
  onTicketClick: (ticketId: number) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}> = ({ tickets, loading, error, onTicketClick, pagination, onPageChange }) => {
  const { t } = useLanguage();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Group tickets by user relationship
  const groupedTickets = tickets.reduce((groups, ticket) => {
    const relationship = ticket.user_relationship || 'viewer';
    if (!groups[relationship]) {
      groups[relationship] = [];
    }
    groups[relationship].push(ticket);
    return groups;
  }, {} as Record<string, APIPendingTicket[]>);

  // Sort relationship types by priority
  const relationshipTypes = Object.keys(groupedTickets).sort((a, b) => {
    const configA = getRelationshipConfig(a);
    const configB = getRelationshipConfig(b);
    return configA.priority - configB.priority;
  });

  // Component to render a single ticket table for a relationship type
  const renderTicketTable = (relationship: string, tickets: APIPendingTicket[]) => {
    const config = getRelationshipConfig(relationship);
    
    return (
      <div key={relationship} className="mb-6">
        {/* Table Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={config.color}>
            {config.icon}
          </div>
          <h3 className={`text-lg font-semibold ${config.color}`}>
            {config.title} ({tickets.length})
          </h3>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">
                    #{ticket.ticket_number}
                  </div>
                  <div className="text-lg font-semibold">
                    {ticket.title}
                  </div>
                </div>
                <Badge className={getTicketStatusClass(ticket.status)}>
                  {ticket.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {ticket.description}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={getTicketPriorityClass(ticket.priority)}>
                  {ticket.priority?.toUpperCase()}
                </Badge>
                <Badge
                  className={getTicketSeverityClass(ticket.severity_level)}
                >
                  {ticket.severity_level?.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {ticket.pu_name || ticket.pucode || 'N/A'}
                </Badge>
              </div>
              
              {/* Dynamic mobile card content based on relationship type */}
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                {config.columns.slice(6).map((column) => {
                  const content = renderMobileCardContent(ticket, column.key);
                  if (!content) return null;
                  
                  return (
                    <div key={column.key}>
                      {content}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                <span>{t('ticket.created')} {formatDate(ticket.created_at)}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTicketClick(ticket.id)}
                  >
                    {t('ticket.view')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key} className="px-4 py-2">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-t cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
                  onClick={() => onTicketClick(ticket.id)}
                >
                  {config.columns.map((column) => (
                    <td key={column.key} className="px-4 py-2">
                      {renderCellContent(ticket, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const MobileCardSkeleton = () => (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-3/4 mb-2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <div className="flex flex-wrap gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
  
  return (
    <div>
      <div>
        {loading ? (
          <>
            {/* Mobile Skeleton Cards */}
            <div className="block lg:hidden space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <MobileCardSkeleton key={index} />
              ))}
            </div>
            {/* Desktop Spinner */}
            <div className="hidden lg:flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </>
        ) : error ? (
          <div className="py-8 text-center text-destructive dark:text-red-300">
            <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>{t('homepage.errorLoadingTickets')}</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : tickets.length > 0 ? (
          <>
            {/* Render grouped ticket tables */}
            {relationshipTypes.map(relationship => 
              renderTicketTable(relationship, groupedTickets[relationship])
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground">
                  {t('ticket.showing')} {(pagination.page - 1) * pagination.limit + 1} {t('ticket.to')}{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                  {t('ticket.of')} {pagination.total} {t('nav.tickets').toLowerCase()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>{t('homepage.noPendingTickets')}</p>
            <p className="text-sm">{t('homepage.allTicketsUpToDate')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Personal Finished Ticket Count Chart Component (L2+ users only)
// Personal Finished Ticket Chart Component
const PersonalFinishedTicketChart: React.FC<{
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
              <span className="text-success font-medium">Finished Tickets:</span> {data.tickets}
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
            <span>{t('homepage.myFinishCasesPerPeriod')}</span>
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
              <Bar dataKey="tickets" fill="hsl(var(--accent))" name={t('homepage.FinishedTickets')} />
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
              <p>{t('homepage.noFinishedTicketData')}</p>
              <p className="text-sm">{t('homepage.finishSomeTickets')}</p>
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
  personalFinishedTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalFinishedTicketLoading: boolean;
  personalFinishedTicketError: string | null;
  personalKPIData: any;
  personalKPILoading: boolean;
  personalKPIError: string | null;
  onKpiSetupClick: (type: 'report' | 'fix') => void;
  user: any;
}> = ({
  personalKPI,
  timeFilter,
  selectedYear,
  selectedPeriod,
  personalTicketData,
  personalTicketLoading,
  personalTicketError,
  personalFinishedTicketData,
  personalFinishedTicketLoading,
  personalFinishedTicketError,
  personalKPIData,
  personalKPILoading,
  personalKPIError,
  onKpiSetupClick,
  user,
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
    
    {/* Personal Finished Ticket Count Chart (L2+ users only) */}
    {user?.permissionLevel && user.permissionLevel >= 2 && (
      <PersonalFinishedTicketChart 
        data={personalFinishedTicketData}
        loading={personalFinishedTicketLoading}
        error={personalFinishedTicketError}
        onKpiSetupClick={() => onKpiSetupClick('fix')}
        selectedYear={selectedYear}
      />
    )}
    
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
  const [pendingTicketsPagination, setPendingTicketsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Personal tab time range filter state
  const [personalTimeFilter, setPersonalTimeFilter] = useState<string>('this-period');
  const [personalSelectedYear, setPersonalSelectedYear] = useState<number>(new Date().getFullYear());
  const [personalSelectedPeriod, setPersonalSelectedPeriod] = useState<number>(1);

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

  // Fetch personal Finished ticket data (L2+ users only)
  const fetchPersonalFinishedTicketData = async () => {
    if (!isAuthenticated || !user) {
      setPersonalFinishedTicketLoading(false);
      return;
    }

    try {
      setPersonalFinishedTicketLoading(true);
      setPersonalFinishedTicketError(null);

      const dateRange = getPersonalDateRange(personalTimeFilter, personalSelectedYear, personalSelectedPeriod);
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

        // Add real target data or fallback to mock targets
        const dataWithTargets = ticketResponse.data.map(item => ({
          ...item,
          target: targetMap[item.period] || 15 // Fallback to mock target if no real target
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
            personalFinishedTicketData={personalFinishedTicketData}
            personalFinishedTicketLoading={personalFinishedTicketLoading}
            personalFinishedTicketError={personalFinishedTicketError}
            personalKPIData={personalKPIData}
            personalKPILoading={personalKPILoading}
            personalKPIError={personalKPIError}
            onKpiSetupClick={handleKpiSetupClick}
            user={user}
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
