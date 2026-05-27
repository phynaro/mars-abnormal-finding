import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
  ChevronDown,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ticketService } from "@/services/ticketService";
import type { Ticket, TicketFilters, TicketFilterUser } from "@/services/ticketService";
import { ticketClassService, type TicketClass } from "@/services/ticketClassService";
import { hierarchyService, type PUCritical } from "@/services/hierarchyService";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTimelineTime } from "@/utils/timezone";
import { getFileUrl } from "@/utils/url";
import { LazyCardImage } from "@/components/ui/lazy-card-image";
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
import { StarRatingDisplay } from "@/components/ui/star-rating";

/** Plant codes for the quick filter toggle group (most used). "All" = no plant filter. */
const QUICK_PLANT_OPTIONS = ['DP', 'DJ', 'SN', 'ST', 'PS', 'PP'] as const;
const STATUS_FILTER_OPTIONS = [
  { value: "open", labelKey: "ticket.open" },
  { value: "accepted", labelKey: "ticket.accepted" },
  { value: "planed", labelKey: "ticket.planed" },
  { value: "in_progress", labelKey: "ticket.inProgress" },
  { value: "reviewed", labelKey: "ticket.reviewed" },
  { value: "review_escalated", labelKey: "ticket.reviewEscalated" },
  { value: "closed", labelKey: "ticket.closed" },
  { value: "rejected_pending_l3_review", labelKey: "ticket.rejectedPendingL3Review" },
  { value: "rejected_final", labelKey: "ticket.rejectedFinal" },
  { value: "finished", labelKey: "ticket.finished" },
  { value: "escalated", labelKey: "ticket.escalated" },
  { value: "reopened_in_progress", labelKey: "ticket.reopenedInProgress" },
] as const;

interface HierarchyOption {
  code: string;
  name: string;
  plant?: string;
}

interface SearchableMultiSelectUserFilterProps {
  id: string;
  label: string;
  options: TicketFilterUser[];
  selectedValues: string[];
  triggerLabel: string;
  searchPlaceholder: string;
  loadingText: string;
  emptyText: string;
  loading: boolean;
  onChange: (nextValues: string[]) => void;
}

const SearchableMultiSelectUserFilter: React.FC<SearchableMultiSelectUserFilterProps> = ({
  id,
  label,
  options,
  selectedValues,
  triggerLabel,
  searchPlaceholder,
  loadingText,
  emptyText,
  loading,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) return true;
    return (
      option.name.toLowerCase().includes(normalizedQuery) ||
      option.email?.toLowerCase().includes(normalizedQuery)
    );
  });

  const toggleValue = (value: string) => {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onChange(nextValues);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative" ref={containerRef}>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() =>
            setOpen((prev) => {
              const nextOpen = !prev;
              if (!nextOpen) {
                setQuery("");
              }
              return nextOpen;
            })
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">{loadingText}</div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{emptyText}</div>
              ) : (
                filteredOptions.map((option) => {
                  const value = option.id.toString();
                  const checked = selectedValues.includes(value);
                  return (
                    <div
                      key={option.id}
                      role="option"
                      aria-selected={checked}
                      className="flex w-full cursor-pointer items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-hover hover:text-hover-foreground"
                      onClick={() => toggleValue(value)}
                    >
                      <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{option.name}</div>
                        {option.email && (
                          <div className="truncate text-xs text-muted-foreground">{option.email}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [plants, setPlants] = useState<HierarchyOption[]>([]);
  const [areas, setAreas] = useState<HierarchyOption[]>([]);
  const [createdByUsers, setCreatedByUsers] = useState<TicketFilterUser[]>([]);
  const [assignedToUsers, setAssignedToUsers] = useState<TicketFilterUser[]>([]);
  const [ticketUsersLoading, setTicketUsersLoading] = useState(false);
  const [criticalLevels, setCriticalLevels] = useState<PUCritical[]>([]);
  const [criticalLevelsLoading, setCriticalLevelsLoading] = useState(false);
  const [ticketClasses, setTicketClasses] = useState<TicketClass[]>([]);
  const [ticketClassesLoading, setTicketClassesLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<TicketFilters | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateError, setExportDateError] = useState<string | null>(null);
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
      limit: parseInt(searchParams.get('limit') || '20'),
      status: searchParams.get('status') || "",
      pucriticalno: (searchParams.get('pucriticalno') || undefined) as TicketFilters["pucriticalno"],
      ticketClass: (searchParams.get('ticketClass') || undefined) as TicketFilters["ticketClass"],
      search: searchParams.get('search') || "",
      plant: searchParams.get('plant') || undefined,
      area: searchParams.get('area') || undefined,
      created_by: (searchParams.get('created_by') || undefined) as TicketFilters["created_by"],
      assigned_to: (searchParams.get('assigned_to') || undefined) as TicketFilters["assigned_to"],
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      finishedStartDate: searchParams.get('finishedStartDate') || undefined,
      finishedEndDate: searchParams.get('finishedEndDate') || undefined,
      puno: searchParams.get('puno') || undefined,
      delay: searchParams.get('delay') === 'true' ? true : undefined,
      overdue: searchParams.get('overdue') === 'true' ? true : undefined,
      team: (searchParams.get('team') as 'operator' | 'reliability') || undefined,
    };
    return urlFilters;
  };

  // Filters
  const [filters, setFilters] = useState<TicketFilters>(initializeFiltersFromURL());

  const parseStatusFilter = (status?: string): string[] => {
    if (!status) return [];
    return status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const serializeStatusFilter = (statuses: string[]): string => {
    if (!statuses.length) return "";
    return statuses.join(",");
  };

  const getStatusFilterLabel = (statusValue: string): string => {
    const option = STATUS_FILTER_OPTIONS.find((item) => item.value === statusValue);
    if (option) {
      return t(option.labelKey);
    }
    return statusValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const selectedStatuses = parseStatusFilter(filters.status);

  const parsePlantFilter = (plant?: string): string[] => {
    if (!plant) return [];
    return plant
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializePlantFilter = (plants: string[]): string => {
    if (!plants.length) return "";
    return plants.join(",");
  };

  const getPlantFilterLabel = (plantCode: string): string => {
    const plant = plants.find((item) => item.code === plantCode);
    return plant ? plant.name : plantCode;
  };

  const selectedPlants = parsePlantFilter(filters.plant);

  const parseAreaFilter = (area?: string): string[] => {
    if (!area) return [];
    return area
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializeAreaFilter = (areaCodes: string[]): string => {
    if (!areaCodes.length) return "";
    return areaCodes.join(",");
  };

  const getAreaFilterLabel = (areaCode: string): string => {
    const area = areas.find((item) => item.code === areaCode);
    return area ? area.name : areaCode;
  };

  const selectedAreas = parseAreaFilter(filters.area);

  const parseTicketClassFilter = (ticketClass?: number | string | null): string[] => {
    if (ticketClass === undefined || ticketClass === null || ticketClass === "") return [];
    return String(ticketClass)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializeTicketClassFilter = (classIds: string[]): string => {
    if (!classIds.length) return "";
    return classIds.join(",");
  };

  const getTicketClassFilterLabel = (classId: string): string => {
    const selectedClass = ticketClasses.find((ticketClass) => String(ticketClass.id) === classId);
    if (!selectedClass) return `Class ${classId}`;
    return language === 'en' ? selectedClass.name_en : selectedClass.name_th;
  };

  const selectedTicketClasses = parseTicketClassFilter(filters.ticketClass);

  const parseUserFilter = (userValue?: number | string): string[] => {
    if (userValue === undefined || userValue === null || userValue === "") return [];
    return String(userValue)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializeUserFilter = (userIds: string[]): string => {
    if (!userIds.length) return "";
    return userIds.join(",");
  };

  const getUserFilterLabel = (userId: string): string => {
    const selectedUser = [...createdByUsers, ...assignedToUsers].find((user) => String(user.id) === userId);
    return selectedUser?.name || `User ${userId}`;
  };

  const selectedCreatedByUsers = parseUserFilter(filters.created_by);
  const selectedAssignedToUsers = parseUserFilter(filters.assigned_to);

  const getUserFilterSummary = (selectedUserIds: string[], type: "created_by" | "assigned_to"): string => {
    if (selectedUserIds.length === 0) {
      return t("ticket.allUsers");
    }

    if (selectedUserIds.length <= 2) {
      return selectedUserIds.map(getUserFilterLabel).join(", ");
    }

    if (language === "th") {
      return type === "created_by"
        ? `${selectedUserIds.length} ผู้สร้างที่เลือก`
        : `${selectedUserIds.length} ผู้รับผิดชอบที่เลือก`;
    }

    return type === "created_by"
      ? `${selectedUserIds.length} creators selected`
      : `${selectedUserIds.length} assignees selected`;
  };

  const parseCriticalFilter = (critical?: number | string): string[] => {
    if (critical === undefined || critical === null || critical === "") return [];
    return String(critical)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const serializeCriticalFilter = (levels: string[]): string => {
    if (!levels.length) return "";
    return levels.join(",");
  };

  const getCriticalFilterLabel = (criticalValue: string): string => {
    const selectedLevel = criticalLevels.find((level) => String(level.PUCRITICALNO) === criticalValue);
    if (selectedLevel) return selectedLevel.PUCRITICALNAME;
    return criticalValue;
  };

  const selectedCriticalLevels = parseCriticalFilter(filters.pucriticalno);

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
      const result = await hierarchyService.getDistinctPlants();
      if (result.success) {
        setPlants(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    }
  };

  const fetchAreas = async (plantCodes: string[]) => {
    try {
      const areaResults = await Promise.all(
        plantCodes.map(async (plantCode) => {
          const result = await hierarchyService.getDistinctAreas(plantCode);
          return result.success ? result.data : [];
        })
      );
      const mergedAreas = areaResults.flat();
      const uniqueAreasMap = new Map<string, HierarchyOption>();
      mergedAreas.forEach((area) => {
        if (!uniqueAreasMap.has(area.code)) {
          uniqueAreasMap.set(area.code, area);
        }
      });
      setAreas(Array.from(uniqueAreasMap.values()));
    } catch (error) {
      console.error('Failed to fetch areas:', error);
      setAreas([]);
    }
  };

  const fetchTicketFilterUsers = async () => {
    try {
      setTicketUsersLoading(true);
      const [createdByResponse, assignedToResponse] = await Promise.all([
        ticketService.getTicketFilterUsers("created_by"),
        ticketService.getTicketFilterUsers("assigned_to"),
      ]);
      setCreatedByUsers(createdByResponse.data || []);
      setAssignedToUsers(assignedToResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch ticket filter users:', error);
      setCreatedByUsers([]);
      setAssignedToUsers([]);
    } finally {
      setTicketUsersLoading(false);
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

  const fetchTicketClasses = async () => {
    try {
      setTicketClassesLoading(true);
      const response = await ticketClassService.getTicketClasses();
      setTicketClasses(response);
    } catch (error) {
      console.error('Failed to fetch ticket classes:', error);
      setTicketClasses([]);
    } finally {
      setTicketClassesLoading(false);
    }
  };

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
    fetchTicketFilterUsers();
    fetchCriticalLevels();
    fetchTicketClasses();
  }, []);

  // Refetch areas when plant filter changes
  useEffect(() => {
    const selectedPlantCodes = parsePlantFilter(filters.plant);
    if (selectedPlantCodes.length > 0) {
      fetchAreas(selectedPlantCodes);
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
        if ((key === 'delay' || key === 'overdue') && typeof value === 'boolean') {
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

  const handleFilterChange = <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
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
      ticketClass: undefined,
      search: "",
      plant: undefined,
      area: undefined,
      created_by: undefined,
      assigned_to: undefined,
      startDate: undefined,
      endDate: undefined,
      puno: undefined,
      delay: undefined,
      overdue: undefined,
      team: undefined,
    };
    setFilters(clearedFilters);
    syncFiltersToURL(clearedFilters);
  };

  const hasActiveFilters = () => {
    return !!(filters.status || filters.pucriticalno || filters.ticketClass || filters.search || filters.plant || filters.area || filters.created_by || filters.assigned_to || filters.startDate || filters.endDate || filters.puno || filters.delay || filters.overdue || filters.team);
  };

  const getTicketClassLabel = (ticketClassId?: number | string | null) => {
    if (!ticketClassId) return '';
    const selectedClass = ticketClasses.find((ticketClass) => String(ticketClass.id) === String(ticketClassId));
    if (!selectedClass) return `Class ${ticketClassId}`;
    return language === 'en' ? selectedClass.name_en : selectedClass.name_th;
  };

  const getEffectiveExportFilters = (): TicketFilters => {
    if (exportFilters) {
      return exportFilters;
    }
    return { ...filters };
  };

  const handleExportFilterChange = <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    setExportFilters((prev) => {
      const base: TicketFilters = prev ? { ...prev } : { ...filters };
      // When plant changes, reset area filter
      if (key === "plant") {
        return { ...base, [key]: value, area: undefined };
      }
      return { ...base, [key]: value };
    });
  };

  const openExportDialog = () => {
    setExportDateError(null);
    setExportFilters({
      ...filters,
      page: 1,
      // Use a larger default limit for export; pagination will still be handled on the backend.
      limit: 100,
    });
    setExportDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    syncFiltersToURL(updatedFilters);
  };

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('ticketListViewMode', mode);
  };

  const handleViewTicket = (ticket: Ticket) => {
    // Preserve current list URL (filters, pagination) for back navigation
    const listUrl = location.pathname + location.search;
    navigate(`/tickets/${ticket.id}`, { state: { from: listUrl } });
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

  // Parse API timestamp as UTC+7 when it has Z suffix (same as formatTimelineTime).
  const parseApiDate = (dateString: string): number => {
    const raw = dateString || '';
    const localTimestamp = /Z$/i.test(raw) ? raw.replace(/Z$/i, '+07:00') : raw;
    return new Date(localTimestamp).getTime();
  };

  // Returns { days, hours } overdue for in_progress / planed / reopened_in_progress tickets, or null if not overdue.
  const getOverdueDetail = (ticket: Ticket): { days: number; hours: number } | null => {
    if (!ticket.schedule_finish || !['in_progress', 'planed', 'reopened_in_progress'].includes(ticket.status)) return null;
    const finish = parseApiDate(ticket.schedule_finish);
    const now = Date.now();
    if (finish >= now) return null;
    const diffMs = now - finish;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return { days, hours };
  };

  const formatOverdueText = (detail: { days: number; hours: number }): string => {
    return formatDurationText(t('ticket.overdueLabel'), detail);
  };

  // Generic "Label: X days Y hrs" formatter for open duration, time to action, etc.
  const formatDurationText = (label: string, detail: { days: number; hours: number }): string => {
    const parts: string[] = [];
    if (detail.days > 0) {
      parts.push(`${detail.days} ${detail.days === 1 ? t('ticket.day') : t('ticket.days')}`);
    }
    parts.push(`${detail.hours} ${detail.hours === 1 ? t('ticket.hr') : t('ticket.hrs')}`);
    return `${label}: ${parts.join(' ')}`;
  };

  // Open duration: now − created_at (for status open).
  const getOpenDurationDetail = (ticket: Ticket): { days: number; hours: number } => {
    const start = parseApiDate(ticket.created_at);
    const diffMs = Date.now() - start;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return { days, hours };
  };

  // Time to action: actual_finish_at − created_at (for status closed).
  const getTimeToActionDetail = (ticket: Ticket): { days: number; hours: number } | null => {
    if (!ticket.actual_finish_at) return null;
    const start = parseApiDate(ticket.created_at);
    const end = parseApiDate(ticket.actual_finish_at);
    const diffMs = end - start;
    if (diffMs < 0) return null;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return { days, hours };
  };

  const handleExportTickets = async () => {
    const effectiveFilters = getEffectiveExportFilters();

    // Validate created date range (startDate / endDate)
    if ((effectiveFilters.startDate && !effectiveFilters.endDate) || (!effectiveFilters.startDate && effectiveFilters.endDate)) {
      setExportDateError('Both From and To dates are required when filtering by created date.');
      return;
    }

    if (effectiveFilters.startDate && effectiveFilters.endDate) {
      const from = new Date(effectiveFilters.startDate);
      const to = new Date(effectiveFilters.endDate);
      if (from > to) {
        setExportDateError('From date must be before or equal to To date.');
        return;
      }
    }

    setExportDateError(null);
    setExportLoading(true);

    try {
      const EXPORT_PAGE_LIMIT = 1000;
      const allTickets: Ticket[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await ticketService.getTickets({
          ...effectiveFilters,
          page,
          limit: EXPORT_PAGE_LIMIT,
        });

        const { tickets: pageTickets, pagination } = response.data;
        allTickets.push(...pageTickets);
        totalPages = pagination.pages;
        page += 1;
      } while (page <= totalPages);

      if (allTickets.length === 0) {
        toast({
          title: t('common.warning'),
          description: t('ticket.noTicketsToExport'),
          variant: "destructive",
        });
        return;
      }

      // Prepare CSV headers based on igxTickets / Ticket schema
      const csvHeaders = [
        t('ticket.ticketNumber'),
        t('ticket.title'),
        t('ticket.description'),
        t('ticket.status'),
        'PU Code',
        'PU Name',
        'PU Description',
        'Plant Code',
        'Area Code',
        'Line Code',
        'Machine Code',
        t('ticket.criticalLevel'),
        'Ticket Class (EN)',
        'Ticket Class (TH)',
        'Failure Mode Code',
        'Failure Mode Name',
        'Cost Avoidance',
        'Downtime Avoidance (hours)',
        'Satisfaction Rating',
        t('ticket.createdBy'),
        t('ticket.assignedTo'),
        t('ticket.created'),
        'Updated At',
        'Schedule Start',
        'Schedule Finish',
        'Actual Start',
        'Actual Finish',
      ];

      const csvData = allTickets.map((ticket) => [
        ticket.ticket_number,
        ticket.title,
        ticket.description?.replace(/\n/g, ' ') || '',
        ticket.status?.replace(/_/g, ' ').toUpperCase() || '',
        ticket.pu_pucode || ticket.pucode || '',
        ticket.pu_name || ticket.PUNAME || '',
        ticket.pudescription || '',
        ticket.plant_code || '',
        ticket.area_code || '',
        ticket.line_code || '',
        ticket.machine_code || '',
        ticket.pucriticalno != null ? String(ticket.pucriticalno) : '',
        ticket.ticket_class_en || '',
        ticket.ticket_class_th || '',
        ticket.failure_mode_code || '',
        ticket.failure_mode_name || '',
        ticket.cost_avoidance != null ? String(ticket.cost_avoidance) : '',
        ticket.downtime_avoidance_hours != null ? String(ticket.downtime_avoidance_hours) : '',
        ticket.satisfaction_rating != null ? String(ticket.satisfaction_rating) : '',
        ticket.reporter_name || `User ${ticket.created_by}`,
        ticket.assignee_name || (ticket.assigned_to ? `User ${ticket.assigned_to}` : t('ticket.unassigned')),
        ticket.created_at ? formatDate(ticket.created_at) : '',
        ticket.updated_at ? formatDate(ticket.updated_at) : '',
        ticket.schedule_start ? formatDate(ticket.schedule_start) : '',
        ticket.schedule_finish ? formatDate(ticket.schedule_finish) : '',
        ticket.actual_start_at ? formatDate(ticket.actual_start_at) : '',
        ticket.actual_finish_at ? formatDate(ticket.actual_finish_at) : '',
      ]);

      // Escape CSV field: wrap in quotes and escape internal double quotes (for Thai/Unicode and Excel)
      const escapeCsvField = (val: string | number | boolean | null | undefined) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`;

      // Convert to CSV string; prepend UTF-8 BOM so Excel displays Thai (and other Unicode) correctly
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        csvHeaders.map(escapeCsvField).join(','),
        ...csvData.map((row) => row.map(escapeCsvField).join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // Generate filename with current date and filters
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filterStr = effectiveFilters.status ? `_${effectiveFilters.status}` : '';
      const plantStr = effectiveFilters.plant ? `_${effectiveFilters.plant}` : '';
      const areaStr = effectiveFilters.area ? `_${effectiveFilters.area}` : '';
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

      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error ? error.message : t('ticket.failedToFetchTickets'),
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
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

  /** Status-based card content (shared by mobile and desktop card view). */
  const renderCardStatusContent = (ticket: Ticket) => (
    <div className="text-sm text-muted-foreground space-y-1 mt-auto">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{t('ticket.createdBy')}: {ticket.reporter_name || `${t('ticket.userId')} ${ticket.created_by}`}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{t('ticket.created')} {formatDate(ticket.created_at)}</span>
      </div>
      {ticket.status === 'open' && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{formatDurationText(t('ticket.openDuration'), getOpenDurationDetail(ticket))}</span>
        </div>
      )}
      {(ticket.status === 'accepted') && (
        <>
          {ticket.accepted_by != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.acceptedBy')}: {ticket.accepted_by_name || `${t('ticket.userId')} ${ticket.accepted_by}`}</span>
            </div>
          )}
          {ticket.accepted_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.acceptedAt')}: {formatDate(ticket.accepted_at)}</span>
            </div>
          )}
        </>
      )}
      {(ticket.status === 'planed') && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.schedule_start && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.scheduleStart')}: {formatDate(ticket.schedule_start)}</span>
            </div>
          )}
          {ticket.schedule_finish && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.scheduleFinish')}: {formatDate(ticket.schedule_finish)}</span>
            </div>
          )}
          {(() => { const d = getOverdueDetail(ticket); return d ? <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-medium"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span className="truncate">{formatOverdueText(d)}</span></div> : null; })()}
        </>
      )}
      {(ticket.status === 'in_progress' || ticket.status === 'reopened_in_progress') && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.schedule_start && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.scheduleStart')}: {formatDate(ticket.schedule_start)}</span>
            </div>
          )}
          {ticket.actual_start_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.actualStartTime')}: {formatDate(ticket.actual_start_at)}</span>
            </div>
          )}
          {ticket.schedule_finish && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.scheduleFinish')}: {formatDate(ticket.schedule_finish)}</span>
            </div>
          )}
          {(() => { const d = getOverdueDetail(ticket); return d ? <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-medium"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span className="truncate">{formatOverdueText(d)}</span></div> : null; })()}
        </>
      )}
      {ticket.status === 'finished' && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.schedule_finish && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.scheduleFinish')}: {formatDate(ticket.schedule_finish)}</span>
            </div>
          )}
          {ticket.actual_finish_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.actualFinishTime')}: {formatDate(ticket.actual_finish_at)}</span>
            </div>
          )}
        </>
      )}
      {ticket.status === 'reviewed' && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.satisfaction_rating != null && (
            <div className="flex items-center gap-2">
              <span className="truncate">{t('ticket.rating')}:</span>
              <StarRatingDisplay value={ticket.satisfaction_rating} size="sm" />
            </div>
          )}
        </>
      )}
      {ticket.status === 'review_escalated' && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.finished_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.finished')}: {formatDate(ticket.finished_at)}</span>
            </div>
          )}
          {ticket.actual_finish_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.actualFinishTime')}: {formatDate(ticket.actual_finish_at)}</span>
            </div>
          )}
        </>
      )}
      {ticket.status === 'closed' && (
        <>
          {ticket.assigned_to != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.assignedTo')}: {ticket.assignee_name || `${t('ticket.userId')} ${ticket.assigned_to}`}</span>
            </div>
          )}
          {ticket.actual_finish_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.actualFinishTime')}: {formatDate(ticket.actual_finish_at)}</span>
            </div>
          )}
          {ticket.satisfaction_rating != null && (
            <div className="flex items-center gap-2">
              <span className="truncate">{t('ticket.rating')}:</span>
              <StarRatingDisplay value={ticket.satisfaction_rating} size="sm" />
            </div>
          )}
          {(() => { const d = getTimeToActionDetail(ticket); return d ? <div className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" /><span className="truncate">{formatDurationText(t('ticket.timeToAction'), d)}</span></div> : null; })()}
        </>
      )}
      {ticket.status === 'escalated' && (
        <>
          {ticket.escalated_by != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.escalatedBy')}: {ticket.escalated_by_name || `${t('ticket.userId')} ${ticket.escalated_by}`}</span>
            </div>
          )}
          {ticket.escalated_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.escalatedAt')}: {formatDate(ticket.escalated_at)}</span>
            </div>
          )}
        </>
      )}
      {ticket.status === 'rejected_pending_l3_review' && (
        <>
          {ticket.rejected_by != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedBy')}: {ticket.rejected_by_name || `${t('ticket.userId')} ${ticket.rejected_by}`}</span>
            </div>
          )}
          {ticket.rejected_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedAt')}: {formatDate(ticket.rejected_at)}</span>
            </div>
          )}
        </>
      )}
      {ticket.status === 'rejected_final' && (
        <>
          {ticket.rejected_by != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedBy')}: {ticket.rejected_by_name || `${t('ticket.userId')} ${ticket.rejected_by}`}</span>
            </div>
          )}
          {ticket.rejected_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedAt')}: {formatDate(ticket.rejected_at)}</span>
            </div>
          )}
          {ticket.rejected_final_by != null && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedFinalBy')}: {ticket.rejected_final_by_name || `${t('ticket.userId')} ${ticket.rejected_final_by}`}</span>
            </div>
          )}
          {ticket.rejected_final_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t('ticket.rejectedFinalAt')}: {formatDate(ticket.rejected_final_at)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  /** Single ticket card used for both mobile and desktop card view. */
  const TicketListCard = ({ ticket, onView }: { ticket: Ticket; onView: (ticket: Ticket) => void }) => (
    <div
      className="border rounded-lg bg-card cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30 overflow-hidden flex flex-col"
      onClick={() => onView(ticket)}
    >
      <LazyCardImage
        src={ticket.first_image_url ? getFileUrl(ticket.first_image_url) : undefined}
        alt={ticket.title}
      />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground font-medium">#{ticket.ticket_number}</span>
          <div className="flex gap-2 items-center flex-shrink-0">
            <div className={getCriticalLevelClassModern(ticket.pucriticalno)}>
              <div className={getCriticalLevelIconClass(ticket.pucriticalno)}></div>
              <span>{getCriticalLevelText(ticket.pucriticalno, t)}</span>
            </div>
            <div className={getTicketStatusClassModern(ticket.status)}>
              <span>{ticket.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
            </div>
          </div>
        </div>
        <div className="text-lg font-semibold mb-2 line-clamp-2">{ticket.title}</div>
        <div className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{ticket.description}</div>
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">{ticket.pu_name || ticket.pucode || 'N/A'}</Badge>
        </div>
        {renderCardStatusContent(ticket)}
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Plant quick filter (toggle group) */}
          <div className="flex rounded-md border overflow-hidden bg-muted/30">
            <Button
              variant={selectedPlants.length === 0 ? "default" : "ghost"}
              className="rounded-none flex-shrink-0"
              size="sm"
              onClick={() => handleFilterChange("plant", undefined)}
            >
              All
            </Button>
            {QUICK_PLANT_OPTIONS.map((code) => (
              <Button
                key={code}
                variant={selectedPlants.includes(code) ? "default" : "ghost"}
                className="rounded-none flex-shrink-0"
                size="sm"
                onClick={() => {
                  const plantSet = new Set(selectedPlants);
                  if (plantSet.has(code)) {
                    plantSet.delete(code);
                  } else {
                    plantSet.add(code);
                  }
                  handleFilterChange("plant", serializePlantFilter(Array.from(plantSet)));
                }}
              >
                {code}
              </Button>
            ))}
          </div>
          {/* Overdue toggle */}
          <Button
            variant={filters.overdue ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("overdue", !filters.overdue)}
            title={t('ticket.overdue')}
          >
            {t('ticket.overdue')}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title={t('ticket.filter')}>
                <Filter className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">{t('homepage.filters')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-w-3xl max-h-[90vh] lg:max-h-none dark:text-gray-100 flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{t('ticket.filter')}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto lg:overflow-visible flex-1 min-h-0 pr-2 -mr-2">
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
                  <SearchableMultiSelectUserFilter
                    id="created_by"
                    label={t('ticket.createdBy')}
                    options={createdByUsers}
                    selectedValues={selectedCreatedByUsers}
                    triggerLabel={getUserFilterSummary(selectedCreatedByUsers, "created_by")}
                    searchPlaceholder={t('ticket.searchUsers')}
                    loadingText={t('ticket.searching')}
                    emptyText={t('ticket.noUsersFound')}
                    loading={ticketUsersLoading}
                    onChange={(nextValues) =>
                      handleFilterChange(
                        "created_by",
                        serializeUserFilter(nextValues) as TicketFilters["created_by"]
                      )
                    }
                  />
                  {/* 3. Assigned To */}
                  <SearchableMultiSelectUserFilter
                    id="assigned_to"
                    label={t('ticket.assignedTo')}
                    options={assignedToUsers}
                    selectedValues={selectedAssignedToUsers}
                    triggerLabel={getUserFilterSummary(selectedAssignedToUsers, "assigned_to")}
                    searchPlaceholder={t('ticket.searchUsers')}
                    loadingText={t('ticket.searching')}
                    emptyText={t('ticket.noUsersFound')}
                    loading={ticketUsersLoading}
                    onChange={(nextValues) =>
                      handleFilterChange(
                        "assigned_to",
                        serializeUserFilter(nextValues) as TicketFilters["assigned_to"]
                      )
                    }
                  />
                  {/* 4. Plant */}
                  <div className="space-y-2">
                    <Label htmlFor="plant">Plant</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button id="plant" variant="outline" className="w-full justify-between">
                          <span className="truncate">
                            {selectedPlants.length === 0
                              ? "All Plants"
                              : selectedPlants.length <= 2
                                ? selectedPlants.map(getPlantFilterLabel).join(", ")
                                : `${selectedPlants.length} ${language === "th" ? "โรงงานที่เลือก" : "plants selected"}`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                        <DropdownMenuLabel>Plant</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {plants.map((plant) => {
                          const checked = selectedPlants.includes(plant.code);
                          return (
                            <DropdownMenuCheckboxItem
                              key={plant.code}
                              checked={checked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(nextChecked) => {
                                const plantSet = new Set(selectedPlants);
                                if (nextChecked) {
                                  plantSet.add(plant.code);
                                } else {
                                  plantSet.delete(plant.code);
                                }
                                handleFilterChange("plant", serializePlantFilter(Array.from(plantSet)));
                              }}
                            >
                              {plant.name}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* 5. Area */}
                  <div className="space-y-2">
                    <Label htmlFor="area">{t('ticket.area')}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          id="area"
                          variant="outline"
                          className="w-full justify-between"
                          disabled={selectedPlants.length === 0}
                        >
                          <span className="truncate">
                            {selectedPlants.length === 0
                              ? "Select plant first"
                              : selectedAreas.length === 0
                                ? t("ticket.allAreas")
                                : selectedAreas.length <= 2
                                  ? selectedAreas.map(getAreaFilterLabel).join(", ")
                                  : `${selectedAreas.length} ${language === "th" ? "พื้นที่ที่เลือก" : "areas selected"}`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                        <DropdownMenuLabel>{t("ticket.area")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {areas.map((area) => {
                          const checked = selectedAreas.includes(area.code);
                          return (
                            <DropdownMenuCheckboxItem
                              key={area.code}
                              checked={checked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(nextChecked) => {
                                const areaSet = new Set(selectedAreas);
                                if (nextChecked) {
                                  areaSet.add(area.code);
                                } else {
                                  areaSet.delete(area.code);
                                }
                                handleFilterChange("area", serializeAreaFilter(Array.from(areaSet)));
                              }}
                            >
                              {area.name}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* 6. Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">{t('ticket.status')}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          id="status"
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="truncate">
                            {selectedStatuses.length === 0
                              ? t("ticket.allStatuses")
                              : selectedStatuses.length <= 2
                                ? selectedStatuses.map(getStatusFilterLabel).join(", ")
                                : `${selectedStatuses.length} ${language === "th" ? "สถานะที่เลือก" : "statuses selected"}`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                        <DropdownMenuLabel>{t("ticket.status")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STATUS_FILTER_OPTIONS.map((option) => {
                          const checked = selectedStatuses.includes(option.value);
                          return (
                            <DropdownMenuCheckboxItem
                              key={option.value}
                              checked={checked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(nextChecked) => {
                                const statusSet = new Set(selectedStatuses);
                                if (nextChecked) {
                                  statusSet.add(option.value);
                                } else {
                                  statusSet.delete(option.value);
                                }
                                handleFilterChange("status", serializeStatusFilter(Array.from(statusSet)));
                              }}
                            >
                              {t(option.labelKey)}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* 7. Ticket Class */}
                  <div className="space-y-2">
                    <Label htmlFor="ticketClass">{t('ticket.ticketClass')}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          id="ticketClass"
                          variant="outline"
                          className="w-full justify-between"
                          disabled={ticketClassesLoading}
                        >
                          <span className="truncate">
                            {ticketClassesLoading
                              ? t("common.loading")
                              : selectedTicketClasses.length === 0
                                ? t("ticket.ticketClass")
                                : selectedTicketClasses.length <= 2
                                  ? selectedTicketClasses.map(getTicketClassFilterLabel).join(", ")
                                  : `${selectedTicketClasses.length} ${language === "th" ? "คลาสที่เลือก" : "classes selected"}`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                        <DropdownMenuLabel>{t("ticket.ticketClass")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ticketClasses.map((ticketClass) => {
                          const value = ticketClass.id.toString();
                          const checked = selectedTicketClasses.includes(value);
                          return (
                            <DropdownMenuCheckboxItem
                              key={ticketClass.id}
                              checked={checked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(nextChecked) => {
                                const classSet = new Set(selectedTicketClasses);
                                if (nextChecked) {
                                  classSet.add(value);
                                } else {
                                  classSet.delete(value);
                                }
                                handleFilterChange("ticketClass", serializeTicketClassFilter(Array.from(classSet)) as TicketFilters["ticketClass"]);
                              }}
                            >
                              {language === 'en' ? ticketClass.name_en : ticketClass.name_th}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* 8. Critical Level */}
                  <div className="space-y-2">
                    <Label htmlFor="critical">{t('ticket.criticalLevel')}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          id="critical"
                          variant="outline"
                          className="w-full justify-between"
                          disabled={criticalLevelsLoading}
                        >
                          <span className="truncate">
                            {criticalLevelsLoading
                              ? t("common.loading")
                              : selectedCriticalLevels.length === 0
                                ? t("ticket.allCriticalLevels")
                                : selectedCriticalLevels.length <= 2
                                  ? selectedCriticalLevels.map(getCriticalFilterLabel).join(", ")
                                  : `${selectedCriticalLevels.length} ${language === "th" ? "ระดับที่เลือก" : "levels selected"}`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
                        <DropdownMenuLabel>{t("ticket.criticalLevel")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {criticalLevels.map((level) => {
                          const value = String(level.PUCRITICALNO);
                          const checked = selectedCriticalLevels.includes(value);
                          return (
                            <DropdownMenuCheckboxItem
                              key={value}
                              checked={checked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(nextChecked) => {
                                const criticalSet = new Set(selectedCriticalLevels);
                                if (nextChecked) {
                                  criticalSet.add(value);
                                } else {
                                  criticalSet.delete(value);
                                }
                                handleFilterChange("pucriticalno", serializeCriticalFilter(Array.from(criticalSet)) as TicketFilters["pucriticalno"]);
                              }}
                            >
                              {level.PUCRITICALNAME}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Overdue: in_progress/planed with schedule_finish before now */}
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overdue"
                        checked={!!filters.overdue}
                        onCheckedChange={(checked) =>
                          handleFilterChange("overdue", checked === true)
                        }
                      />
                      <Label htmlFor="overdue" className="cursor-pointer">
                        {t('ticket.overdue')}
                      </Label>
                    </div>
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
          <Dialog open={exportDialogOpen} onOpenChange={(open) => {
            setExportDialogOpen(open);
            if (!open) {
              setExportDateError(null);
              setExportFilters(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={openExportDialog}
                title={t('ticket.exportTickets')}
                className="hidden md:inline-flex"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('ticket.export')}
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-w-3xl max-h-[90vh] lg:max-h-none dark:text-gray-100 flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{t('ticket.exportTickets')}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto lg:overflow-visible flex-1 min-h-0 pr-2 -mr-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="export_search">{t('common.search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <Input
                        id="export_search"
                        placeholder={t('ticket.searchTickets')}
                        value={getEffectiveExportFilters().search || ""}
                        onChange={(e) =>
                          handleExportFilterChange("search", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {/* Created By */}
                  <div className="space-y-2">
                    <Label htmlFor="export_created_by">{t('ticket.createdBy')}</Label>
                    <SearchableCombobox
                      options={[
                        { value: "all", label: t('ticket.allUsers') },
                        ...createdByUsers.map((user) => ({
                          value: user.id.toString(),
                          label: user.name,
                        })),
                      ]}
                      value={getEffectiveExportFilters().created_by ? getEffectiveExportFilters().created_by!.toString() : "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("created_by", v === "all" ? undefined : parseInt(v))
                      }
                      placeholder={t('ticket.allUsers')}
                      searchPlaceholder={t('ticket.searchUsers')}
                    />
                  </div>
                  {/* Assigned To */}
                  <div className="space-y-2">
                    <Label htmlFor="export_assigned_to">{t('ticket.assignedTo')}</Label>
                    <SearchableCombobox
                      options={[
                        { value: "all", label: t('ticket.allUsers') },
                        ...assignedToUsers.map((user) => ({
                          value: user.id.toString(),
                          label: user.name,
                        })),
                      ]}
                      value={getEffectiveExportFilters().assigned_to ? getEffectiveExportFilters().assigned_to!.toString() : "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("assigned_to", v === "all" ? undefined : parseInt(v))
                      }
                      placeholder={t('ticket.allUsers')}
                      searchPlaceholder={t('ticket.searchUsers')}
                    />
                  </div>
                  {/* Plant */}
                  <div className="space-y-2">
                    <Label htmlFor="export_plant">Plant</Label>
                    <Select
                      value={getEffectiveExportFilters().plant || "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("plant", v === "all" ? undefined : v)
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
                  {/* Area */}
                  <div className="space-y-2">
                    <Label htmlFor="export_area">{t('ticket.area')}</Label>
                    <Select
                      value={getEffectiveExportFilters().area || "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("area", v === "all" ? undefined : v)
                      }
                      disabled={!getEffectiveExportFilters().plant}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !getEffectiveExportFilters().plant
                              ? 'Select plant first'
                              : t('ticket.allAreas')
                          }
                        />
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
                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="export_status">{t('ticket.status')}</Label>
                    <Select
                      value={getEffectiveExportFilters().status || "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("status", v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('ticket.allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('ticket.allStatuses')}</SelectItem>
                        <SelectItem value="open">{t('ticket.open')}</SelectItem>
                        <SelectItem value="accepted">{t('ticket.accepted')}</SelectItem>
                        <SelectItem value="planed">{t('ticket.planed')}</SelectItem>
                        <SelectItem value="in_progress">{t('ticket.inProgress')}</SelectItem>
                        <SelectItem value="reviewed">{t('ticket.reviewed')}</SelectItem>
                        <SelectItem value="review_escalated">{t('ticket.reviewEscalated')}</SelectItem>
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
                  {/* Ticket Class */}
                  <div className="space-y-2">
                    <Label htmlFor="export_ticketClass">{t('ticket.ticketClass')}</Label>
                    <Select
                      value={getEffectiveExportFilters().ticketClass ? getEffectiveExportFilters().ticketClass!.toString() : "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("ticketClass", v === "all" ? undefined : parseInt(v))
                      }
                      disabled={ticketClassesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            ticketClassesLoading ? t('common.loading') : t('ticket.ticketClass')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {ticketClasses.map((ticketClass) => (
                          <SelectItem key={ticketClass.id} value={ticketClass.id.toString()}>
                            {language === 'en' ? ticketClass.name_en : ticketClass.name_th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Critical Level */}
                  <div className="space-y-2">
                    <Label htmlFor="export_critical">{t('ticket.criticalLevel')}</Label>
                    <Select
                      value={getEffectiveExportFilters().pucriticalno ? getEffectiveExportFilters().pucriticalno!.toString() : "all"}
                      onValueChange={(v) =>
                        handleExportFilterChange("pucriticalno", v === "all" ? undefined : parseInt(v))
                      }
                      disabled={criticalLevelsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            criticalLevelsLoading
                              ? t('common.loading')
                              : t('ticket.allCriticalLevels')
                          }
                        />
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
                  {/* Created date range (From / To) */}
                  <div className="space-y-2">
                    <Label>{t('ticket.created')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={getEffectiveExportFilters().startDate || ""}
                        onChange={(e) =>
                          handleExportFilterChange("startDate", e.target.value || undefined)
                        }
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={getEffectiveExportFilters().endDate || ""}
                        onChange={(e) =>
                          handleExportFilterChange("endDate", e.target.value || undefined)
                        }
                      />
                    </div>
                    {exportDateError && (
                      <p className="text-xs text-destructive mt-1">
                        {exportDateError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportDialogOpen(false);
                    setExportDateError(null);
                    setExportFilters(null);
                  }}
                  disabled={exportLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleExportTickets}
                  disabled={exportLoading}
                >
                  {exportLoading ? t('common.loading') : t('ticket.export')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
              Status: {parseStatusFilter(filters.status).map(getStatusFilterLabel).join(", ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("status")}
              />
            </Badge>
          )}
          {filters.pucriticalno && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.criticalLevel')}: {parseCriticalFilter(filters.pucriticalno).map(getCriticalFilterLabel).join(", ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("pucriticalno")}
              />
            </Badge>
          )}
          {filters.ticketClass && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.ticketClass')}: {parseTicketClassFilter(filters.ticketClass).map(getTicketClassFilterLabel).join(", ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("ticketClass")}
              />
            </Badge>
          )}
          {filters.plant && (
            <Badge variant="secondary" className="gap-1">
              Plant: {parsePlantFilter(filters.plant).map(getPlantFilterLabel).join(", ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("plant")}
              />
            </Badge>
          )}
          {filters.area && (
            <Badge variant="secondary" className="gap-1">
              Area: {parseAreaFilter(filters.area).map(getAreaFilterLabel).join(", ")}
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
              Created By: {parseUserFilter(filters.created_by).map(getUserFilterLabel).join(", ")}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("created_by")}
              />
            </Badge>
          )}
          {filters.assigned_to && (
            <Badge variant="secondary" className="gap-1">
              Assigned To: {parseUserFilter(filters.assigned_to).map(getUserFilterLabel).join(", ")}
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
          {filters.overdue && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.overdue')}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter("overdue")}
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
                <TicketListCard key={ticket.id} ticket={ticket} onView={handleViewTicket} />
              ))}
            </div>

            {/* Desktop Card View - same card component, grid layout */}
            {viewMode === 'card' && (
              <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {tickets.map((ticket) => (
                  <TicketListCard key={ticket.id} ticket={ticket} onView={handleViewTicket} />
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
                    {/* <th className="px-4 py-2">{t('ticket.scheduleFinish')}</th> */}
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
                      {/* <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {(ticket.status === 'in_progress' || ticket.status === 'planed') && ticket.schedule_finish
                          ? formatDate(ticket.schedule_finish)
                          : '—'}
                      </td> */}
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
