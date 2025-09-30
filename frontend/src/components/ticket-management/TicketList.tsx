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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  Download,
} from "lucide-react";
import { ticketService } from "@/services/ticketService";
import type { Ticket, TicketFilters } from "@/services/ticketService";
import { dashboardService } from "@/services/dashboardService";
import type { AreaData } from "@/services/dashboardService";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const { toast } = useToast();

  // Helper function to check if user is L3/Admin (permission level 3 or higher)
  const isL3User = () => {
    return (user?.permissionLevel || 0) >= 3;
  };

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
    area_id: undefined,
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
        title: t('common.error'),
        description:
          error instanceof Error ? error.message : t('ticket.failedToFetchTickets'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await dashboardService.getAllAreas();
      setAreas(response.data);
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  useEffect(() => {
    fetchAreas();
  }, []);

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
    if (!confirm(t('ticket.deleteConfirm'))) {
      return;
    }

    try {
      await ticketService.deleteTicket(ticketId);
      toast({
        title: t('common.success'),
        description: t('ticket.ticketDeletedSuccess'),
        variant: "default",
      });
      fetchTickets();
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error ? error.message : t('ticket.failedToDeleteTicket'),
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatTimelineTime(dateString);
  };

  const handleExportTickets = () => {
    if (tickets.length === 0) {
      toast({
        title: t('common.warning'),
        description: t('ticket.noTicketsToExport'),
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvHeaders = [
      t('ticket.ticketNumber'),
      t('ticket.title'),
      t('ticket.description'),
      t('ticket.status'),
      t('ticket.priority'),
      t('ticket.severity'),
      t('ticket.area'),
      t('ticket.createdBy'),
      t('ticket.assignedTo'),
      t('ticket.created'),
    ];

    const csvData = tickets.map(ticket => [
      ticket.ticket_number,
      ticket.title,
      ticket.description?.replace(/\n/g, ' ') || '', // Replace newlines with spaces
      ticket.status.replace('_', ' ').toUpperCase(),
      ticket.priority?.toUpperCase() || '',
      ticket.severity_level?.toUpperCase() || '',
      ticket.plant_name ? `${ticket.plant_name} - ${ticket.area_name}` : ticket.area_name || '',
      ticket.reporter_name || `User ${ticket.reported_by}`,
      ticket.assignee_name || `User ${ticket.assigned_to}` || t('ticket.unassigned'),
      formatDate(ticket.created_at),
    ]);

    // Convert to CSV string
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date and filters
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filterStr = filters.status ? `_${filters.status}` : '';
    const areaStr = filters.area_id ? `_area${filters.area_id}` : '';
    link.setAttribute('download', `tickets_${dateStr}${filterStr}${areaStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('common.success'),
      description: t('ticket.exportSuccess'),
      variant: "default",
    });
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
    <div className="space-y-6 py-6">
      {/* Options Bar (filters, export) */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('nav.tickets')} ({totalTickets})
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title={t('ticket.filterByStatus')}>
                <Filter className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">{t('homepage.filters')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl dark:text-gray-100">
              <DialogHeader>
                <DialogTitle>{t('ticket.filterByStatus')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">{t('common.search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder={t('ticket.searchTickets')}
                      value={filters.search || ""}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('ticket.status')}</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ticket.allStatuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('ticket.allStatuses')}</SelectItem>
                      <SelectItem value="open">{t('ticket.open')}</SelectItem>
                      <SelectItem value="assigned">{t('ticket.assigned')}</SelectItem>
                      <SelectItem value="in_progress">{t('ticket.inProgress')}</SelectItem>
                      <SelectItem value="resolved">{t('ticket.resolved')}</SelectItem>
                      <SelectItem value="closed">{t('ticket.closed')}</SelectItem>
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
                  <Label htmlFor="priority">{t('ticket.priority')}</Label>
                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(v) => handleFilterChange("priority", v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ticket.allPriorities')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('ticket.allPriorities')}</SelectItem>
                      <SelectItem value="low">{t('ticket.low')}</SelectItem>
                      <SelectItem value="normal">{t('ticket.normal')}</SelectItem>
                      <SelectItem value="high">{t('ticket.high')}</SelectItem>
                      <SelectItem value="urgent">{t('ticket.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">{t('ticket.severity')}</Label>
                  <Select
                    value={filters.severity_level || "all"}
                    onValueChange={(v) =>
                      handleFilterChange("severity_level", v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ticket.allSeverities')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('ticket.allSeverities')}</SelectItem>
                      <SelectItem value="low">{t('ticket.low')}</SelectItem>
                      <SelectItem value="medium">{t('ticket.medium')}</SelectItem>
                      <SelectItem value="high">{t('ticket.high')}</SelectItem>
                      <SelectItem value="critical">{t('ticket.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">{t('ticket.area')}</Label>
                  <Select
                    value={filters.area_id?.toString() || "all"}
                    onValueChange={(v) =>
                      handleFilterChange("area_id", v === "all" ? undefined : parseInt(v))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ticket.allAreas')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('ticket.allAreas')}</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id.toString()}>
                          {area.plant_name ? `${area.plant_name} - ${area.name}` : area.name} ({area.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTickets}
            title={t('ticket.exportTickets')}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('ticket.export')}
          </Button>
        </div>
      </div>

      {/* Tickets List */}
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
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('ticket.noTicketsFound')}
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
                    <Badge variant="outline" className="text-xs">
                      {ticket.plant_name ? `${ticket.plant_name} - ${ticket.area_name}` : ticket.area_name}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        {t('ticket.createdBy')}:{" "}
                        {ticket.reporter_name || `User ${ticket.reported_by}`}
                      </span>
                    </div>
                    {ticket.assigned_to && (
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4" />
                        <span>
                          {t('ticket.assignedTo')}:{" "}
                          {ticket.assignee_name || `User ${ticket.assigned_to}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{t('ticket.created')} {formatDate(ticket.created_at)}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        {t('ticket.view')}
                      </Button>
                      {isL3User() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteTicket(ticket.id)}
                        >
                          {t('common.delete')}
                        </Button>
                      )}
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
                    <th className="px-4 py-2">{t('ticket.ticketNumber')}</th>
                    <th className="px-4 py-2">{t('ticket.title')}</th>
                    <th className="px-4 py-2">{t('ticket.status')}</th>
                    <th className="px-4 py-2">{t('ticket.priority')}</th>
                    <th className="px-4 py-2">{t('ticket.severity')}</th>
                    <th className="px-4 py-2">{t('ticket.area')}</th>
                    <th className="px-4 py-2">{t('ticket.createdBy')}</th>
                    <th className="px-4 py-2">{t('ticket.assignedTo')}</th>
                    <th className="px-4 py-2">{t('ticket.created')}</th>
                    {isL3User() && <th className="px-4 py-2">{t('ticket.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-t cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
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
                          {ticket.status.replace("_", " ").toUpperCase()}
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
                        <span className="text-sm">
                          {ticket.plant_name ? `${ticket.plant_name} - ${ticket.area_name}` : ticket.area_name}
                        </span>
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
                            {t('ticket.unassigned')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </td>
                      {isL3User() && (
                        <td className="px-4 py-2">
                          <div
                            className="flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              title={t('common.delete')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground">
                  {t('ticket.showing')} {(currentPage - 1) * (filters.limit || 10) + 1} {t('ticket.to')}{" "}
                  {Math.min(currentPage * (filters.limit || 10), totalTickets)}{" "}
                  {t('ticket.of')} {totalTickets} {t('nav.tickets').toLowerCase()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t('common.next')}
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
