import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  X,
  Table,
  LayoutGrid,
} from "lucide-react";
import { ticketService } from "@/services/ticketService";
import type { Ticket, TicketFilters } from "@/services/ticketService";
import { hierarchyService, type PUCritical } from "@/services/hierarchyService";
import authService from "@/services/authService";
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
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { formatTimelineTime } from "@/utils/timezone";
import { getFileUrl } from "@/utils/url";
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface HierarchyOption {
  code: string;
  name: string;
  plant?: string;
}

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [plants, setPlants] = useState<HierarchyOption[]>([]);
  const [areas, setAreas] = useState<HierarchyOption[]>([]);
  const [users, setUsers] = useState<Array<{id: number; name: string; email?: string}>>([]);
  const [criticalLevels, setCriticalLevels] = useState<PUCritical[]>([]);
  const [criticalLevelsLoading, setCriticalLevelsLoading] = useState(false);
  const { toast } = useToast();

  // View mode state - default to 'card', persist in localStorage
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    const saved = localStorage.getItem('ticketListViewMode');
    return (saved === 'card' || saved === 'table') ? saved : 'card';
  });

  // Helper function to check if user is L3/Admin (permission level 3 or higher)
  const isL3User = () => {
    return (user?.permissionLevel || 0) >= 3;
  };

  // Modal states
  // Removed view modal state

  // Initialize filters from URL parameters
  const initializeFiltersFromURL = (): TicketFilters => {
    const urlFilters: TicketFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      status: searchParams.get('status') || "",
      pucriticalno: searchParams.get('pucriticalno') ? parseInt(searchParams.get('pucriticalno')!) : undefined,
      search: searchParams.get('search') || "",
      plant: searchParams.get('plant') || undefined,
      area: searchParams.get('area') || undefined,
      created_by: searchParams.get('created_by') ? parseInt(searchParams.get('created_by')!) : undefined,
      assigned_to: searchParams.get('assigned_to') ? parseInt(searchParams.get('assigned_to')!) : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      puno: searchParams.get('puno') || undefined,
      delay: searchParams.get('delay') === 'true' ? true : undefined,
      team: (searchParams.get('team') as 'operator' | 'reliability') || undefined,
    };
    return urlFilters;
  };

  // Filters
  const [filters, setFilters] = useState<TicketFilters>(initializeFiltersFromURL());

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTickets(filters);
      console.log(response);
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

  const fetchPlants = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hierarchy/distinct/plants`, {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setPlants(result.data);
       
      }
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    }
  };

  const fetchAreas = async (plantCode: string) => {
    try {
      const url = `${API_BASE_URL}/hierarchy/puextension/plants/${encodeURIComponent(plantCode)}/areas`;
      const response = await fetch(url, {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setAreas(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/all-basic`, {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCriticalLevels = async () => {
    try {
      setCriticalLevelsLoading(true);
      const response = await hierarchyService.getPUCriticalLevels();
      if (response.success) {
        setCriticalLevels(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch critical levels:', error);
      setCriticalLevels([]);
    } finally {
      setCriticalLevelsLoading(false);
    }
  };

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlFilters = initializeFiltersFromURL();
    setFilters(urlFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle URL parameter changes (e.g., when navigating from Area Dashboard)
  useEffect(() => {
    const urlFilters = initializeFiltersFromURL();
    // Check if URL params differ from current filters (excluding page which changes frequently)
    const currentFiltersForComparison = { ...filters };
    const urlFiltersForComparison = { ...urlFilters };
    delete currentFiltersForComparison.page;
    delete urlFiltersForComparison.page;
    
    const filtersChanged = JSON.stringify(urlFiltersForComparison) !== JSON.stringify(currentFiltersForComparison);
    if (filtersChanged) {
      setFilters(urlFilters);
    }
  }, [searchParams.toString()]); // Only when search params string changes

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  useEffect(() => {
    fetchPlants();
    // Don't fetch areas on mount - wait for plant selection
    fetchUsers();
    fetchCriticalLevels();
  }, []);

  // Refetch areas when plant filter changes
  useEffect(() => {
    if (filters.plant) {
      fetchAreas(filters.plant);
    } else {
      // Clear areas when no plant is selected
      setAreas([]);
    }
  }, [filters.plant]);

  // Sync filters to URL parameters
  const syncFiltersToURL = (newFilters: TicketFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'delay' && typeof value === 'boolean') {
          if (value) {
            params.set(key, 'true');
          }
        } else {
          params.set(key, value.toString());
        }
      }
    });
    
    setSearchParams(params, { replace: true });
  };

  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    let updatedFilters: TicketFilters;
    
    // When plant changes, reset area filter
    if (key === 'plant') {
      updatedFilters = { ...filters, [key]: value, area: undefined, page: 1 };
    } else {
      updatedFilters = { ...filters, [key]: value, page: 1 };
    }
    
    setFilters(updatedFilters);
    syncFiltersToURL(updatedFilters);
  };

  const clearFilter = (key: keyof TicketFilters) => {
    const updatedFilters = { 
      ...filters, 
      [key]: key === 'page' || key === 'limit' ? filters[key] : undefined, 
      page: 1 
    };
    setFilters(updatedFilters);
    syncFiltersToURL(updatedFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: TicketFilters = {
      page: 1,
      limit: 12,
      status: "",
      pucriticalno: undefined,
      search: "",
      plant: undefined,
      area: undefined,
      created_by: undefined,
      assigned_to: undefined,
      startDate: undefined,
      endDate: undefined,
      puno: undefined,
      delay: undefined,
      team: undefined,
    };
    setFilters(clearedFilters);
    syncFiltersToURL(clearedFilters);
  };

  const hasActiveFilters = () => {
    return !!(filters.status || filters.pucriticalno || filters.search || filters.plant || filters.area || filters.created_by || filters.assigned_to || filters.startDate || filters.endDate || filters.puno || filters.delay || filters.team);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('ticketListViewMode', mode);
  };

  const handleViewTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`, { state: { from: '/tickets' } });
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
      'PU Name',
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
      ticket.pu_name || ticket.pucode || 'N/A',
      ticket.reporter_name || `User ${ticket.created_by}`,
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
    const plantStr = filters.plant ? `_${filters.plant}` : '';
    const areaStr = filters.area ? `_${filters.area}` : '';
    link.setAttribute('download', `tickets_${dateStr}${filterStr}${plantStr}${areaStr}.csv`);
    
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
    <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
      {/* Image skeleton */}
      <Skeleton className="w-full aspect-[3/2]" />
      <div className="p-4 flex-1 flex flex-col">
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
            <DialogContent className="max-w-3xl max-h-[90vh] dark:text-gray-100 flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{t('ticket.filterByStatus')}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Search */}
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
                  {/* 2. Created By */}
                  <div className="space-y-2">
                    <Label htmlFor="created_by">{t('ticket.createdBy')}</Label>
                    <SearchableCombobox
                      options={[
                        { value: "all", label: t('ticket.allUsers') },
                        ...users.map((user) => ({
                          value: user.id.toString(),
                          label: user.name,
                        })),
                      ]}
                      value={filters.created_by ? filters.created_by.toString() : "all"}
                      onValueChange={(v) =>
                        handleFilterChange("created_by", v === "all" ? undefined : parseInt(v))
                      }
                      placeholder={t('ticket.allUsers')}
                      searchPlaceholder={t('ticket.searchUsers')}
                    />
                  </div>
                  {/* 3. Assigned To */}
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">{t('ticket.assignedTo')}</Label>
                    <SearchableCombobox
                      options={[
                        { value: "all", label: t('ticket.allUsers') },
                        ...users.map((user) => ({
                          value: user.id.toString(),
                          label: user.name,
                        })),
                      ]}
                      value={filters.assigned_to ? filters.assigned_to.toString() : "all"}
                      onValueChange={(v) =>
                        handleFilterChange("assigned_to", v === "all" ? undefined : parseInt(v))
                      }
                      placeholder={t('ticket.allUsers')}
                      searchPlaceholder={t('ticket.searchUsers')}
                    />
                  </div>
                  {/* 4. Plant */}
                  <div className="space-y-2">
                    <Label htmlFor="plant">Plant</Label>
                    <Select
                      value={filters.plant || "all"}
                      onValueChange={(v) =>
                        handleFilterChange("plant", v === "all" ? undefined : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Plants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plants</SelectItem>
                        {plants.map((plant) => (
                          <SelectItem key={plant.code} value={plant.code}>
                            {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 5. Area */}
                  <div className="space-y-2">
                    <Label htmlFor="area">{t('ticket.area')}</Label>
                    <Select
                      value={filters.area || "all"}
                      onValueChange={(v) =>
                        handleFilterChange("area", v === "all" ? undefined : v)
                      }
                      disabled={!filters.plant}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !filters.plant 
                            ? 'Select plant first' 
                            : t('ticket.allAreas')
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('ticket.allAreas')}</SelectItem>
                        {areas.map((area) => (
                          <SelectItem key={area.code} value={area.code}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 6. Status */}
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
                        <SelectItem value="reviewed">{t('ticket.reviewed')}</SelectItem>
                        <SelectItem value="closed">{t('ticket.closed')}</SelectItem>
                        <SelectItem value="rejected_pending_l3_review">
                          {t('ticket.rejectedPendingL3Review')}
                        </SelectItem>
                        <SelectItem value="rejected_final">
                          {t('ticket.rejectedFinal')}
                        </SelectItem>
                        <SelectItem value="finished">{t('ticket.finished')}</SelectItem>
                        <SelectItem value="escalated">{t('ticket.escalated')}</SelectItem>
                        <SelectItem value="reopened_in_progress">
                          {t('ticket.reopenedInProgress')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 7. Critical Level */}
                  <div className="space-y-2">
                    <Label htmlFor="critical">{t('ticket.criticalLevel')}</Label>
                    <Select
                      value={filters.pucriticalno ? filters.pucriticalno.toString() : "all"}
                      onValueChange={(v) =>
                        handleFilterChange("pucriticalno", v === "all" ? undefined : parseInt(v))
                      }
                      disabled={criticalLevelsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={criticalLevelsLoading ? t('common.loading') : t('ticket.allCriticalLevels')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('ticket.allCriticalLevels')}</SelectItem>
                        {criticalLevels.map((level) => (
                          <SelectItem key={level.PUCRITICALNO} value={level.PUCRITICALNO.toString()}>
                            {level.PUCRITICALNAME}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* View Toggle Buttons - Desktop Only */}
          <div className="hidden lg:flex rounded border overflow-hidden">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              className="rounded-none flex items-center gap-1"
              onClick={() => handleViewModeChange('card')}
              title="Card view"
              size="sm"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className="rounded-none flex items-center gap-1"
              onClick={() => handleViewModeChange('table')}
              title="Table view"
              size="sm"
            >
              <Table className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>
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

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground">
            Active Filters:
          </span>
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("status")}
              />
            </Badge>
          )}
          {filters.pucriticalno && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.criticalLevel')}: {getCriticalLevelText(filters.pucriticalno, t)}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("pucriticalno")}
              />
            </Badge>
          )}
          {filters.plant && (
            <Badge variant="secondary" className="gap-1">
              Plant: {filters.plant}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("plant")}
              />
            </Badge>
          )}
          {filters.area && (
            <Badge variant="secondary" className="gap-1">
              Area: {filters.area}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("area")}
              />
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("search")}
              />
            </Badge>
          )}
          {filters.created_by && (
            <Badge variant="secondary" className="gap-1">
              Created By: {users.find(u => u.id === filters.created_by)?.name || `User ${filters.created_by}`}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("created_by")}
              />
            </Badge>
          )}
          {filters.assigned_to && (
            <Badge variant="secondary" className="gap-1">
              Assigned To: {users.find(u => u.id === filters.assigned_to)?.name || `User ${filters.assigned_to}`}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("assigned_to")}
              />
            </Badge>
          )}
          {filters.startDate && filters.endDate && (
            <Badge variant="secondary" className="gap-1">
              Date Range: {new Date(filters.startDate).toLocaleDateString()} - {new Date(filters.endDate).toLocaleDateString()}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  clearFilter("startDate");
                  clearFilter("endDate");
                }}
              />
            </Badge>
          )}
          {filters.puno && (
            <Badge variant="secondary" className="gap-1">
              PU IDs: {filters.puno.split(',').length > 1 ? `${filters.puno.split(',').length} PUs` : filters.puno}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("puno")}
              />
            </Badge>
          )}
          {filters.delay && (
            <Badge variant="secondary" className="gap-1">
              Delayed Tickets
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("delay")}
              />
            </Badge>
          )}
          {filters.team && (
            <Badge variant="secondary" className="gap-1">
              Team: {filters.team.charAt(0).toUpperCase() + filters.team.slice(1)}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("team")}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Tickets List */}
      <div>
        {loading ? (
          <>
            {/* Mobile Skeleton Cards - Always show on mobile */}
            <div className="block lg:hidden space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <MobileCardSkeleton key={index} />
              ))}
            </div>
            {/* Desktop Loading - Card view skeleton */}
            {viewMode === 'card' && (
              <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <MobileCardSkeleton key={index} />
                ))}
              </div>
            )}
            {/* Desktop Loading - Table view spinner */}
            {viewMode === 'table' && (
              <div className="hidden lg:flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('ticket.noTicketsFound')}
          </div>
        ) : (
          <>
            {/* Mobile Cards - Always show on mobile */}
            <div className="block lg:hidden space-y-4">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="border rounded-lg bg-card cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30 overflow-hidden flex flex-col"
                  onClick={() => handleViewTicket(ticket)}
                >
                  {/* Preview Image - 3:2 aspect ratio */}
                  {ticket.first_image_url ? (
                    <img 
                      src={getFileUrl(ticket.first_image_url)} 
                      alt={ticket.title}
                      className="w-full aspect-[3/2] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[3/2] bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No image</span>
                    </div>
                  )}
                  
                  <div className="p-4 flex-1 flex flex-col">
                    {/* div1: TicketNumber on left, CriticalLevel and Status badges on right */}
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        #{ticket.ticket_number}
                      </span>
                      <div className="flex gap-2 items-center flex-shrink-0">
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
                    <div className="text-lg font-semibold mb-2 line-clamp-2">
                      {ticket.title}
                    </div>

                    {/* div3: Description */}
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                      {ticket.description}
                    </div>

                    {/* div4: PU Name */}
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        {ticket.pu_name || ticket.pucode || 'N/A'}
                      </Badge>
                    </div>

                    {/* div5: Others */}
                    <div className="text-sm text-muted-foreground space-y-1 mt-auto">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {t('ticket.createdBy')}:{" "}
                          {ticket.reporter_name || `User ${ticket.created_by}`}
                        </span>
                      </div>
                      {ticket.assigned_to && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {t('ticket.assignedTo')}:{" "}
                            {ticket.assignee_name || `User ${ticket.assigned_to}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{t('ticket.created')} {formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Card View */}
            {viewMode === 'card' && (
              <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {tickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="border rounded-lg bg-card cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30 overflow-hidden flex flex-col"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    {/* Preview Image - 3:2 aspect ratio */}
                    {ticket.first_image_url ? (
                      <img 
                        src={getFileUrl(ticket.first_image_url)} 
                        alt={ticket.title}
                        className="w-full aspect-[3/2] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/2] bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">No image</span>
                      </div>
                    )}
                    
                    <div className="p-4 flex-1 flex flex-col">
                      {/* div1: TicketNumber on left, CriticalLevel and Status badges on right */}
                      <div className="flex justify-between items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground font-medium">
                          #{ticket.ticket_number}
                        </span>
                        <div className="flex gap-2 items-center flex-shrink-0">
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
                      <div className="text-lg font-semibold mb-2 line-clamp-2">
                        {ticket.title}
                      </div>

                      {/* div3: Description */}
                      <div className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                        {ticket.description}
                      </div>

                      {/* div4: PU Name */}
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          {ticket.pu_name || ticket.pucode || 'N/A'}
                        </Badge>
                      </div>

                      {/* div5: Others */}
                      <div className="text-sm text-muted-foreground space-y-1 mt-auto">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {t('ticket.createdBy')}:{" "}
                            {ticket.reporter_name || `User ${ticket.created_by}`}
                          </span>
                        </div>
                        {ticket.assigned_to && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {t('ticket.assignedTo')}:{" "}
                              {ticket.assignee_name || `User ${ticket.assigned_to}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{t('ticket.created')} {formatDate(ticket.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop Table View */}
            {viewMode === 'table' && (
              <div className="hidden lg:block overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2">{t('ticket.ticketNumber')}</th>
                    <th className="px-4 py-2">{t('ticket.title')}</th>
                    <th className="px-4 py-2">{t('ticket.status')}</th>
                    <th className="px-4 py-2">{t('ticket.critical')}</th>
                    {/* <th className="px-4 py-2">{t('ticket.priority')}</th>
                    <th className="px-4 py-2">{t('ticket.severity')}</th> */}
                    <th className="px-4 py-2">PU Name</th>
                    <th className="px-4 py-2">{t('ticket.createdBy')}</th>
                    <th className="px-4 py-2">{t('ticket.assignedTo')}</th>
                    <th className="px-4 py-2">{t('ticket.created')}</th>
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
                        <div className={getTicketStatusClassModern(ticket.status)}>
                          <span>{ticket.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`whitespace-nowrap ${getCriticalLevelClassModern(ticket.pucriticalno)}`}>
                            <div className={getCriticalLevelIconClass(ticket.pucriticalno)}></div>
                            <span>{getCriticalLevelText(ticket.pucriticalno, t)}</span>
                          </div>
         
                        </div>
                      </td>
                      {/* <td className="px-4 py-2">
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
                      </td> */}
                      <td className="px-4 py-2">
                        <span className="text-sm">
                          {ticket.pu_name || ticket.pucode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {ticket.reporter_name ||
                              `User ${ticket.created_by}`}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground">
                  {t('ticket.showing')} {(currentPage - 1) * (filters.limit || 12) + 1} {t('ticket.to')}{" "}
                  {Math.min(currentPage * (filters.limit || 12), totalTickets)}{" "}
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
