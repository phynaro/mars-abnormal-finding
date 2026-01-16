import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PendingTicket as APIPendingTicket } from "@/services/ticketService";
import {
  getTicketPriorityClass,
  getTicketSeverityClass,
  getTicketStatusClass,
  getTicketStatusClassModern,
  getCriticalLevelClass,
  getCriticalLevelClassModern,
  getCriticalLevelIconClass,
  getCriticalLevelText,
} from "@/utils/ticketBadgeStyles";
import {
  ArrowUp,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Lock,
  Star,
  Ticket,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { formatUITime } from "@/utils/timezone";

type PendingTicketsSectionProps = {
  tickets: APIPendingTicket[];
  loading: boolean;
  error: string | null;
  onTicketClick: (ticketId: number) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
};

type RelationshipConfig = {
  icon: React.ReactNode;
  title: string;
  color: string;
  bgColor: string;
  priority: number;
  columns: Array<{ key: string; label: string }>;
};


const getRelationshipConfig = (
  relationship: string,
  t: (key: string) => string,
): RelationshipConfig => {
  const configs: Record<string, RelationshipConfig> = {
    escalate_approver: {
      icon: <ArrowUp className="h-5 w-5" />,
      title: t("homepage.escalatedTickets"),
      color: "text-orange-600",
      bgColor: "bg-orange-50 border-orange-200",
      priority: 1,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "escalated_by", label: "Escalated By" },
        { key: "escalated_at", label: "Escalated At" },
      ],
    },
    accept_approver: {
      icon: <CheckCircle className="h-5 w-5" />,
      title: t("homepage.ticketsToAccept"),
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      priority: 7,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
       // { key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "reporter_name", label: "Created By" },
        { key: "created_at", label: "Created At" },
      ],
    },
    close_approver: {
      icon: <Lock className="h-5 w-5" />,
      title: t("homepage.ticketsToClose"),
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200",
      priority: 3,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "reviewed_by", label: "Reviewed By" },
        { key: "reviewed_at", label: "Reviewed At" },
      ],
    },
    review_approver: {
      icon: <Star className="h-5 w-5" />,
      title: t("homepage.ticketsToReview"),
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
      priority: 4,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "severity_level", label: "Severity" },
        { key: "pu_name", label: "PU Name" },
        { key: "finished_by", label: "Finished By" },
        { key: "finished_at", label: "Finished At" },
      ],
    },
    reject_approver: {
      icon: <X className="h-5 w-5" />,
      title: t("homepage.ticketsToReviewRejected"),
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
      priority: 5,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "rejected_by", label: "Rejected By" },
        { key: "rejected_at", label: "Rejected At" },
      ],
    },
    planner: {
      icon: <Calendar className="h-5 w-5" />,
      title: t("homepage.ticketsToPlan"),
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 border-indigo-200",
      priority: 6,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "reporter_name", label: "Created By" },
        { key: "created_at", label: "Created At" },
        { key: "accepted_by", label: "Accepted By" },
        { key: "accepted_at", label: "Accepted At" },
      ],
    },
    assignee: {
      icon: <UserCheck className="h-5 w-5" />,
      title: t("homepage.myAssignedTickets"),
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
      priority: 2,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "scheduled_start", label: "Scheduled Start" },
        { key: "scheduled_complete", label: "Scheduled Finish" },
      ],
    },
    requester: {
      icon: <User className="h-5 w-5" />,
      title: t("homepage.myCreatedTickets"),
      color: "text-gray-600",
      bgColor: "bg-gray-50 border-gray-200",
      priority: 8,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "assignee_name", label: "Assigned To" },
        { key: "scheduled_start", label: "Scheduled Start" },
        { key: "scheduled_complete", label: "Scheduled Complete" },
      ],
    },
    viewer: {
      icon: <Eye className="h-5 w-5" />,
      title: t("homepage.otherTickets"),
      color: "text-gray-500",
      bgColor: "bg-gray-50 border-gray-200",
      priority: 9,
      columns: [
        { key: "ticket_number", label: "Ticket #" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        //{ key: "priority", label: "Priority" },
        //{ key: "severity_level", label: "Severity" },
        { key: "critical", label: "Critical" },
        { key: "pu_name", label: "PU Name" },
        { key: "reporter_name", label: "Created By" },
        { key: "created_at", label: "Created At" },
        { key: "assignee_name", label: "Assigned To" },
      ],
    },
  };

  return configs[relationship] ?? configs.viewer;
};

const renderMobileCardContent = (
  ticket: APIPendingTicket,
  fieldKey: string,
  t: (key: string) => string,
) => {

  switch (fieldKey) {
    case "accepted_at":
      return ticket.accepted_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.accepted")}: {formatUITime(ticket.accepted_at)}
          </span>
        </div>
      ) : null;
    case "accepted_by":
      return ticket.accepted_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.acceptedBy")}: {ticket.accepted_by_name}
          </span>
        </div>
      ) : null;
    case "escalated_at":
      return ticket.escalated_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.escalated")}: {formatUITime(ticket.escalated_at)}
          </span>
        </div>
      ) : null;
    case "escalated_by":
      return ticket.escalated_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.escalatedBy")}: {ticket.escalated_by_name}
          </span>
        </div>
      ) : null;
    case "reviewed_at":
      return ticket.reviewed_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.reviewed")}: {formatUITime(ticket.reviewed_at)}
          </span>
        </div>
      ) : null;
    case "reviewed_by":
      return ticket.reviewed_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.reviewedBy")}: {ticket.reviewed_by_name}
          </span>
        </div>
      ) : null;
    case "finished_at":
      return ticket.finished_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.finished")}: {formatUITime(ticket.finished_at)}
          </span>
        </div>
      ) : null;
    case "finished_by":
      return ticket.finished_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.finishedBy")}: {ticket.finished_by_name}
          </span>
        </div>
      ) : null;
    case "rejected_at":
      return ticket.rejected_at ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.rejected")}: {formatUITime(ticket.rejected_at)}
          </span>
        </div>
      ) : null;
    case "rejected_by":
      return ticket.rejected_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.rejectedBy")}: {ticket.rejected_by_name}
          </span>
        </div>
      ) : null;
    case "scheduled_start":
      return ticket.schedule_start ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.scheduledStart")}:{" "}
            {formatUITime(ticket.schedule_start)}
          </span>
        </div>
      ) : null;
    case "scheduled_complete":
      return ticket.schedule_finish ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.scheduledFinish")}:{" "}
            {formatUITime(ticket.schedule_finish)}
          </span>
        </div>
      ) : null;
      case "reporter_name":
        return ticket.reporter_name ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>
              {t("homepage.createdBy")}: {ticket.reporter_name}
            </span>
          </div>
        ) : null;
    case "created_at":
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.created")}: {formatUITime(ticket.created_at)}
          </span>
        </div>
      );
    case "assignee_name":
      return ticket.assignee_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("homepage.assignedTo")}: {ticket.assignee_name}
          </span>
        </div>
      ) : null;
    default:
      return null;
  }
};

const renderCellContent = (ticket: APIPendingTicket, fieldKey: string, t: (key: string) => string) => {

  switch (fieldKey) {
    case "ticket_number":
      return <span className="font-medium">{ticket.ticket_number}</span>;
    case "title":
      return (
        <div>
          <div className="font-medium">{ticket.title}</div>
          <div className="text-muted-foreground truncate max-w-xs text-xs">
            {ticket.description}
          </div>
        </div>
      );
    case "status":
      return (
        <div className={getTicketStatusClassModern(ticket.status)}>
          <span>{ticket.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
        </div>
      );
    case "priority":
      return (
        <Badge className={getTicketPriorityClass(ticket.priority)}>
          {ticket.priority?.toUpperCase()}
        </Badge>
      );
    case "severity_level":
      return (
        <Badge className={getTicketSeverityClass(ticket.severity_level)}>
          {ticket.severity_level?.toUpperCase()}
        </Badge>
      );
    case "critical":
      return (
        <div className={getCriticalLevelClassModern(ticket.pucriticalno)}>
          <div className={getCriticalLevelIconClass(ticket.pucriticalno)}></div>
          <span>{getCriticalLevelText(ticket.pucriticalno,t)}</span>
        </div>
      );
    case "pu_name":
      return (
        <span className="text-sm">
          {ticket.pu_name || ticket.pucode || "N/A"}
        </span>
      );
    case "reporter_name":
      return (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.reporter_name || "Unknown User"}</span>
        </div>
      );
    case "assignee_name":
      return ticket.assignee_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.assignee_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      );
    case "created_at":
      return (
        <span className="text-muted-foreground">
          {formatUITime(ticket.created_at)}
        </span>
      );
    case "accepted_at":
      return ticket.accepted_at ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.accepted_at)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "accepted_by":
      return ticket.accepted_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.accepted_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "escalated_at":
      return ticket.escalated_at ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.escalated_at)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "escalated_by":
      return ticket.escalated_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.escalated_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "reviewed_at":
      return ticket.reviewed_at ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.reviewed_at)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "reviewed_by":
      return ticket.reviewed_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.reviewed_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "finished_at":
      return ticket.finished_at ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.finished_at)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "finished_by":
      return ticket.finished_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.finished_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "rejected_at":
      return ticket.rejected_at ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.rejected_at)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "rejected_by":
      return ticket.rejected_by_name ? (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{ticket.rejected_by_name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "scheduled_start":
      return ticket.schedule_start ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.schedule_start)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "scheduled_complete":
      return ticket.schedule_finish ? (
        <span className="text-muted-foreground">
          {formatUITime(ticket.schedule_finish)}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    default:
      return <span className="text-muted-foreground">-</span>;
  }
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

const PendingTicketsSection: React.FC<PendingTicketsSectionProps> = ({
  tickets,
  loading,
  error,
  onTicketClick,
  pagination,
  onPageChange,
}) => {
  const { t } = useLanguage();

  const groupedTickets = tickets.reduce(
    (groups, ticket) => {
      const relationship = ticket.user_relationship || "viewer";
      if (!groups[relationship]) {
        groups[relationship] = [];
      }
      groups[relationship].push(ticket);
      return groups;
    },
    {} as Record<string, APIPendingTicket[]>,
  );

  const relationshipTypes = Object.keys(groupedTickets).sort((a, b) => {
    const configA = getRelationshipConfig(a, t);
    const configB = getRelationshipConfig(b, t);
    return configA.priority - configB.priority;
  });

  const renderTicketTable = (
    relationship: string,
    relationshipTickets: APIPendingTicket[],
  ) => {
    const config = getRelationshipConfig(relationship, t);

    return (
      <div key={relationship} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className={config.color}>{config.icon}</div>
          <h3 className={`text-lg font-semibold ${config.color}`}>
            {config.title} ({relationshipTickets.length})
          </h3>
        </div>

        <div className="block lg:hidden space-y-4">
          {relationshipTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="border rounded-lg p-4 bg-card cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
              onClick={() => onTicketClick(ticket.id)}
            >
              {/* div1: TicketNumber on left, CriticalLevel and Status badges on right */}
              <div className="flex justify-between items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground font-medium">
                  #{ticket.ticket_number}
                </span>
                <div className="flex gap-2 items-center">
                  <div className={getCriticalLevelClassModern(ticket.pucriticalno)}>
                    <div className={getCriticalLevelIconClass(ticket.pucriticalno)}></div>
                    <span>{getCriticalLevelText(ticket.pucriticalno, t)}</span>
                  </div>
                  <div className={getTicketStatusClassModern(ticket.status)}>
                    <span>{ticket.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                </div>
              </div>

              {/* div2: Title */}
              <div className="text-lg font-semibold mb-2">
                {ticket.title}
              </div>

              {/* div3: Description */}
              <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {ticket.description}
              </div>

              {/* div4: PU Name */}
              <div className="mb-3">
                <Badge variant="outline" className="text-xs">
                  {ticket.pu_name || ticket.pucode || "N/A"}
                </Badge>
              </div>

              {/* div5: Others */}
              <div className="text-sm text-muted-foreground space-y-1">
                {config.columns.slice(5).map((column) => {
                  const content = renderMobileCardContent(
                    ticket,
                    column.key,
                    t,
                  );
                  if (!content) return null;
                  return <div key={column.key}>{content}</div>;
                })}
              </div>

              {/* <div className="mt-4 text-xs text-muted-foreground">
                <span>
                  {t("ticket.created")}{" "}
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div> */}
            </div>
          ))}
        </div>

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
              {relationshipTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-t cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
                  onClick={() => onTicketClick(ticket.id)}
                >
                  {config.columns.map((column) => (
                    <td key={column.key} className="px-4 py-2">
                      {renderCellContent(ticket, column.key, t)}
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

  if (loading) {
    return (
      <>
        <div className="block lg:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <MobileCardSkeleton key={index} />
          ))}
        </div>
        <div className="hidden lg:flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive dark:text-red-300">
        <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>{t("homepage.errorLoadingTickets")}</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Ticket className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>{t("homepage.noPendingTickets")}</p>
        <p className="text-sm">{t("homepage.allTicketsUpToDate")}</p>
      </div>
    );
  }

  return (
    <>
      {relationshipTypes.map((relationship) =>
        renderTicketTable(relationship, groupedTickets[relationship]),
      )}

      {pagination && onPageChange && pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-muted-foreground">
            {t("ticket.showing")}{" "}
            {(pagination.page - 1) * pagination.limit + 1} {t("ticket.to")}{" "}
            {Math.min(
              pagination.page * pagination.limit,
              pagination.total,
            )}{" "}
            {t("ticket.of")} {pagination.total} {t("nav.tickets").toLowerCase()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              {t("common.next")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingTicketsSection;
