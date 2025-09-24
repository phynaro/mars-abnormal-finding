import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Removed outer Card wrapper for direct placement
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  User,
  AlertTriangle,
} from "lucide-react";
import { ticketService } from "@/services/ticketService";
import type { Ticket, TicketFilters } from "@/services/ticketService";
import { useToast } from "@/hooks/useToast";
// Removed ViewTicketModal per requirement
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatTimelineTime } from "@/utils/timezone";
import {
  getTicketPriorityClass,
  getTicketSeverityClass,
  getTicketStatusClass,
} from "@/utils/ticketBadgeStyles";

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const { toast } = useToast();

  // Modal states
  // Removed view modal state

  // Filters
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 10,
    status: "",
    priority: "",
    severity_level: "",
    search: "",
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTickets(filters);
      setTickets(response.data.tickets);
      setTotalPages(response.data.pagination.pages);
      setTotalTickets(response.data.pagination.total);
      setCurrentPage(response.data.pagination.page);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm("Are you sure you want to delete this ticket?")) {
      return;
    }

    try {
      await ticketService.deleteTicket(ticketId);
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
        variant: "default",
      });
      fetchTickets();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete ticket",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatTimelineTime(dateString);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="w-4 h-4" />;
      case "assigned":
        return <User className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <AlertTriangle className="w-4 h-4" />;
      case "closed":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Options Bar (filters, export) */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Tickets ({totalTickets})
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title="Filters">
                <Filter className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Filters</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 dark:text-gray-100">
              <DialogHeader>
                <DialogTitle>Filter Tickets</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Search tickets..."
                      value={filters.search || ""}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status || ""}
                    onValueChange={(v) => handleFilterChange("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="rejected_pending_l3_review">
                        Rejected (L3 Review)
                      </SelectItem>
                      <SelectItem value="rejected_final">
                        Rejected (Final)
                      </SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="reopened_in_progress">
                        Reopened
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={filters.priority || ""}
                    onValueChange={(v) => handleFilterChange("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={filters.severity_level || ""}
                    onValueChange={(v) =>
                      handleFilterChange("severity_level", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">All Severities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Export (coming soon)"
          >
            Export
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tickets found
          </div>
        ) : (
          <>
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
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        Created by:{" "}
                        {ticket.reporter_name || `User ${ticket.reported_by}`}
                      </span>
                    </div>
                    {ticket.assigned_to && (
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4" />
                        <span>
                          Assigned to:{" "}
                          {ticket.assignee_name || `User ${ticket.assigned_to}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                    <span>Created {formatDate(ticket.created_at)}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeleteTicket(ticket.id)}
                      >
                        Delete
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
                    <th className="px-4 py-2">Ticket #</th>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Priority</th>
                    <th className="px-4 py-2">Severity</th>
                    <th className="px-4 py-2">Created By</th>
                    <th className="px-4 py-2">Assigned To</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-t cursor-pointer hover:bg-accent"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      <td className="px-4 py-2 whitespace-nowrap font-medium">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <div className="font-medium">{ticket.title}</div>
                          <div className="text-muted-foreground truncate max-w-xs">
                            {ticket.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={getTicketStatusClass(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">
                            {ticket.status.replace("_", " ").toUpperCase()}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={getTicketPriorityClass(ticket.priority)}
                        >
                          {ticket.priority?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={getTicketSeverityClass(
                            ticket.severity_level,
                          )}
                        >
                          {ticket.severity_level?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {ticket.reporter_name ||
                              `User ${ticket.reported_by}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {ticket.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {ticket.assignee_name ||
                                `User ${ticket.assigned_to}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-4 py-2">
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            title="Delete"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * (filters.limit || 10) + 1} to{" "}
                  {Math.min(currentPage * (filters.limit || 10), totalTickets)}{" "}
                  of {totalTickets} tickets
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {/* Removed EditTicketModal */}
    </div>
  );
};
