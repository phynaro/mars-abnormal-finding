import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ticketService } from "@/services/ticketService";
import type { Ticket } from "@/services/ticketService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  Image,
  Sparkles,
  Clock,
  Plus,
  X,
  CheckCircle,
  Lock,
  RefreshCw,
  Circle,
  Play,
  UserPlus,
  Phone,
} from "lucide-react";
import { getApiBaseUrl, getFileUrl } from "@/utils/url";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import authService from "@/services/authService";
import { formatTimelineTime, formatCommentTime } from "@/utils/timezone";
import {
  getTicketPriorityClass,
  getTicketSeverityClass,
  getTicketStatusClass,
} from "@/utils/ticketBadgeStyles";

const TicketDetailsPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Separate file queues for before/after uploads
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragTarget, setDragTarget] = useState<"before" | "after" | null>(null);
  const [, setProgressMap] = useState<Record<number, number>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { user } = useAuth();
  const { t } = useLanguage();
  // Action modal hooks must be declared before any early returns
  type ActionType =
    | "accept"
    | "plan"
    | "start"
    | "reject"
    | "finish"
    | "escalate"
    | "approve-review"
    | "approve-close"
    | "reopen"
    | "reassign";
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("accept");
  const [actionComment, setActionComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [actionNumber, setActionNumber] = useState("");
  const [actionExtraId, setActionExtraId] = useState("");
  const [acting, setActing] = useState(false);
  
  // Plan action specific state
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleFinish, setScheduleFinish] = useState("");
  
  // Start action specific state
  const [actualStartAt, setActualStartAt] = useState("");

  // Additional state for finish action
  const [downtimeAvoidance, setDowntimeAvoidance] = useState("1");
  const [costAvoidance, setCostAvoidance] = useState("10000");
  const [failureModeId, setFailureModeId] = useState("");
  const [actualFinishAt, setActualFinishAt] = useState("");
  const [actualStartAtEdit, setActualStartAtEdit] = useState("");
  const [failureModes, setFailureModes] = useState<
    Array<{ id: number; code: string; name: string }>
  >([]);

  // Use area-specific approval levels instead of global permission levels
  const isCreator = ticket?.user_relationship === "creator";
  const isApprover = ticket?.user_relationship === "approver";
  const userApprovalLevel = ticket?.user_approval_level || 0;
  const isL2Plus = userApprovalLevel >= 2;
  const isL3Plus = userApprovalLevel >= 3;
  const isL4Plus = userApprovalLevel >= 4;

  // Check if current user is the assigned person for this ticket
  const isAssignedUser = ticket?.assigned_to === user?.id;

  // Reassign modal helper state (loaded regardless of status to keep hook order stable)
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assignees, setAssignees] = useState<
    Array<{ id: number; name: string; email?: string }>
  >([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  // Ref for assignee dropdown to handle click outside
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Function to determine where to navigate back to
  const getBackNavigation = () => {
    // Check if we have a referrer in the location state
    if (location.state?.from) {
      return location.state.from;
    }
    
    // Check if we came from the homepage by looking at the referrer
    const referrer = document.referrer;
    if (referrer && (referrer.includes('/home') || referrer.includes('/dashboard'))) {
      return '/home';
    }
    
    // Default to tickets page
    return '/tickets';
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    } else {
      setError("No ticket ID provided");
      setLoading(false);
    }
  }, [ticketId]);

  // Load failure modes only when finish modal opens
  useEffect(() => {
    if (!actionOpen || actionType !== "finish") return;
    
    const loadFailureModes = async () => {
      try {
        const response = await ticketService.getFailureModes();
        if (response.success) {
          setFailureModes(response.data);
        }
      } catch (err) {
        console.error("Error loading failure modes:", err);
      }
    };
    loadFailureModes();
  }, [actionOpen, actionType]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTicketById(parseInt(ticketId!));
      if (response.success) {
        setTicket(response.data);
        console.log(response.data);
      } else {
        setError(t('ticket.failedToFetchTickets'));
      }
    } catch (err) {
      console.error("Error fetching ticket:", err);
      setError(t('ticket.errorLoadingTickets'));
    } finally {
      setLoading(false);
    }
  };

  // Load assignees only when modal is open with specific actions
  useEffect(() => {
    // Only load when the modal is open and we need assignees (plan/reassign/escalate)
    if (!actionOpen || !ticket?.id || (actionType !== 'plan' && actionType !== 'reassign' && actionType !== 'escalate')) {
      setAssignees([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAssigneesLoading(true);
        // For escalate action, only show L3 users; for plan and reassign, show L2+ users
        const escalationOnly = actionType === "escalate";
        const res = await ticketService.getAvailableAssignees(
          assigneeQuery || undefined,
          ticket.id,
          escalationOnly,
        );
        if (!cancelled) setAssignees(res.data || []);
      } catch (e) {
        if (!cancelled) setAssignees([]);
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actionOpen, assigneeQuery, ticket?.id, actionType]);

  // Handle click outside assignee dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setAssigneeDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAssigneeDropdownOpen(false);
      }
    };

    if (assigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [assigneeDropdownOpen]);

  // Upload with per-file progress using XMLHttpRequest
  const handleImageUpload = async (imageType: "before" | "after") => {
    if (!ticket) return;
    const selectedFiles = imageType === "before" ? beforeFiles : afterFiles;
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setProgressMap({});
    try {
      const token = authService.getToken();
      if (!token) throw new Error("Not authenticated");

      // Upload files sequentially to get per-file progress
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${getApiBaseUrl()}/tickets/${ticket.id}/images`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          const form = new FormData();
          form.append("image", file);
          form.append("image_type", imageType);
          form.append("image_name", file.name);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgressMap((prev) => ({ ...prev, [i]: percent }));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgressMap((prev) => ({ ...prev, [i]: 100 }));
              resolve();
            } else {
              try {
                const res = JSON.parse(xhr.responseText || "{}");
                reject(
                  new Error(res.message || `Upload failed (${xhr.status})`),
                );
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          };
          xhr.send(form);
        });
      }
      await fetchTicketDetails();
      if (imageType === "before") setBeforeFiles([]);
      if (imageType === "after") setAfterFiles([]);
    } catch (e) {
      console.error("Upload failed:", e);
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver =
    (target: "before" | "after") => (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
      setDragTarget(target);
    };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragTarget(null);
  };

  const handleDrop = (target: "before" | "after") => (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragTarget(null);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      if (target === "before") setBeforeFiles(files);
      if (target === "after") setAfterFiles(files);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('ticket.ticketNotFound')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || t('ticket.ticketNotFoundDescription')}
          </p>
          <Button onClick={() => navigate(getBackNavigation())} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('ticket.backToTickets')}
          </Button>
        </div>
      </div>
    );
  }

  // Derived helpers
  const isRejected =
    ticket?.status === "rejected_final" ||
    ticket?.status === "rejected_pending_l3_review";
  const isClosed = ticket?.status === "closed";
  const uploadAllowed = !(isClosed || isRejected);

  const showAfterSection = ticket?.status
    ? !["open", "rejected_pending_l3_review", "rejected_final"].includes(
        ticket.status,
      )
    : false;
  const beforeImages =
    ticket?.images?.filter((img) => img.image_type === "before") || [];
  const afterImages =
    ticket?.images?.filter((img) => img.image_type === "after") || [];
  const locationHierarchy = ticket
    ? [
        { 
          label: "Plant", 
          code: ticket.plant_code,
          value: ticket.plant_name || ticket.plant_code 
        },
        { 
          label: "Area", 
          code: ticket.area_code,
          value: ticket.area_name || ticket.area_code 
        },
        { 
          label: "Line/Sub Area", 
          code: ticket.line_code,
          value: ticket.line_name || ticket.line_code 
        },
        {
          label: "Machine",
          code: ticket.machine_code,
          value: ticket.machine_name || (ticket.machine_code
            ? `${ticket.machine_code}${ticket.machine_number ? `-${ticket.machine_number}` : ""}`
            : undefined),
        },
      ].filter((item) => Boolean(item.code))
    : [];

  const renderImageCard = (
    img: NonNullable<Ticket["images"]>[number],
    accent: "before" | "after",
  ) => {
    const accentClasses =
      accent === "before"
        ? "border-red-200/70 ring-red-100/50 hover:ring-2 dark:border-red-500/60 dark:ring-red-900/40"
        : "border-emerald-200/70 ring-emerald-100/50 hover:ring-2 dark:border-emerald-500/60 dark:ring-emerald-900/40";

    return (
      <div
        key={img.id}
        className={`group relative overflow-hidden rounded-md border bg-white shadow-sm transition dark:bg-slate-900 ${accentClasses}`}
      >
        <button
          type="button"
          className="block w-full"
          onClick={() => {
            const idx = ticket?.images?.findIndex((i) => i.id === img.id) ?? 0;
            setLightboxIndex(idx);
            setLightboxOpen(true);
          }}
        >
          <img
            src={getFileUrl(img.image_url)}
            alt={img.image_name}
            className="h-32 w-full object-cover transition-transform duration-200 sm:h-36 lg:h-40"
          />
        </button>
        {(isApprover || isCreator) && (
          <button
            className="absolute right-3 top-3 hidden rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition hover:bg-white group-hover:block"
            title="Delete image"
            onClick={async () => {
              try {
                await ticketService.deleteTicketImage(ticket!.id, img.id);
                await fetchTicketDetails();
              } catch (e) {
                alert(
                  e instanceof Error ? e.message : "Failed to delete image",
                );
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  // Action modal state moved above (before early returns)

  const openAction = (type: ActionType) => {
    setActionType(type);
    setActionComment("");
    setActionNumber("");
    setActionExtraId("");
    // Reset plan action fields
    setScheduleStart("");
    setScheduleFinish("");
    // Reset start action fields
    if (type === "start") {
      // Set current datetime as default, but allow user to change
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setActualStartAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setActualStartAt("");
    }
    // Reset finish action fields to defaults
    setDowntimeAvoidance("1");
    setCostAvoidance("10000");
    setFailureModeId("");
    if (type === "finish") {
      // Set current datetime as default for actual finish time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setActualFinishAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      
      // Pre-populate actual start time with existing value if available
      if (ticket?.actual_start_at) {
        const startDate = new Date(ticket.actual_start_at);
        const startYear = startDate.getFullYear();
        const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
        const startDay = String(startDate.getDate()).padStart(2, '0');
        const startHours = String(startDate.getHours()).padStart(2, '0');
        const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
        setActualStartAtEdit(`${startYear}-${startMonth}-${startDay}T${startHours}:${startMinutes}`);
      } else {
        setActualStartAtEdit("");
      }
    } else {
      setActualFinishAt("");
      setActualStartAtEdit("");
    }
    setActionOpen(true);
  };

  const performAction = async () => {
    if (!ticket) return;
    setActing(true);
    try {
      switch (actionType) {
        case "accept":
          await ticketService.acceptTicket(
            ticket.id,
            actionComment || undefined,
            undefined, // No scheduled completion date - will be set in planning phase
          );
          break;
        case "plan":
          if (!scheduleStart || !scheduleFinish) {
            throw new Error("Schedule start and schedule finish are required");
          }
          // For L2 users, automatically assign to themselves
          const assigneeId = (isL2Plus && !isL3Plus) ? user?.id : parseInt(actionExtraId, 10);
          if (!assigneeId) {
            throw new Error("Assigned user is required");
          }
          await ticketService.planTicket(
            ticket.id,
            scheduleStart,
            scheduleFinish,
            assigneeId,
            actionComment || undefined
          );
          break;
        case "start":
          if (!actualStartAt) {
            throw new Error("Actual start time is required");
          }
          await ticketService.startTicket(
            ticket.id,
            actualStartAt,
            actionComment || undefined
          );
          break;
        case "reject":
          if (!actionComment || actionComment.trim() === "") {
            throw new Error("Rejection reason is required");
          }
          await ticketService.rejectTicket(
            ticket.id,
            actionComment || "Rejected",
            true,
          );
          break;
        case "finish": {
          // Validate required fields
          if (!downtimeAvoidance || !costAvoidance || !failureModeId || !actualFinishAt) {
            throw new Error(
              "All fields are required: Downtime Avoidance, Cost Avoidance, Failure Mode, and Actual Finish Time",
            );
          }

          const downtimeAvoidanceHours = parseFloat(downtimeAvoidance);
          const costAvoidanceAmount = parseFloat(costAvoidance);
          const failureMode = parseInt(failureModeId, 10);

          await ticketService.finishTicket(
            ticket.id,
            actionComment || undefined,
            downtimeAvoidanceHours,
            costAvoidanceAmount,
            failureMode,
            actualFinishAt,
            actualStartAtEdit || undefined
          );
          break;
        }
        case "escalate": {
          const toId = parseInt(actionExtraId || "0", 10);
          if (!toId)
            throw new Error("Please select an L3 user from the dropdown list");
          await ticketService.escalateTicket(
            ticket.id,
            actionComment || "Escalated",
            toId,
          );
          break;
        }
        case "approve-review": {
          const rating =
            actionNumber !== "" ? parseInt(actionNumber, 10) : undefined;
          await ticketService.approveReview(
            ticket.id,
            actionComment || "Approved review",
            rating,
          );
          break;
        }
        case "approve-close": {
          await ticketService.approveClose(
            ticket.id,
            actionComment || "Approved close",
          );
          break;
        }
        case "reopen":
          await ticketService.reopenTicket(
            ticket.id,
            actionComment || "Reopened",
          );
          break;
        case "reassign": {
          if (!scheduleStart || !scheduleFinish || !actionExtraId) {
            throw new Error("Schedule start, schedule finish, and assigned user are required for reassignment");
          }
          const toId = parseInt(actionExtraId || "0", 10);
          if (!toId)
            throw new Error("Please select a new assignee from the dropdown list");
          await ticketService.reassignTicket(
            ticket.id,
            scheduleStart,
            scheduleFinish,
            toId,
            actionComment || undefined,
          );
          break;
        }
      }
      await fetchTicketDetails();
      setActionOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
          title={`Ticket #${ticket.ticket_number}`}
          showBackButton={true}
          onBack={() => navigate(getBackNavigation())}
          rightContent={
          <div className="flex flex-wrap gap-2 justify-end">
            {/* Accept button - Only assigned L2 user can accept open tickets */}
            {isL2Plus &&
              (isAssignedUser || ticket.assigned_to == null) &&
              ticket.status === "open" && (
                <Button onClick={() => openAction("accept")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {t('ticket.accept')}
                </Button>
              )}
            {/* L3 Accept button - Only L3 can override L2 rejections */}
            {isL3Plus && ticket.status === "rejected_pending_l3_review" && (
              <Button onClick={() => openAction("accept")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> {t('ticket.overrideAccept')}
              </Button>
            )}
            {/* Plan button - L2+ can plan accepted tickets */}
            {isL2Plus && ticket.status === "accepted" && (
              <Button onClick={() => openAction("plan")}>
                <Clock className="mr-2 h-4 w-4" /> {t('ticket.plan')}
              </Button>
            )}
            {/* Start button - Only assigned L2+ user can start planed tickets */}
            {isL2Plus && isAssignedUser && ticket.status === "planed" && (
              <Button onClick={() => openAction("start")}>
                <Play className="mr-2 h-4 w-4" /> {t('ticket.start')}
              </Button>
            )}
            {/* Reject button - L2 can only reject open tickets */}
            {isL2Plus && !isL3Plus && ticket.status === "open" && (
              <Button
                variant="destructive"
                onClick={() => openAction("reject")}
              >
                <XCircle className="mr-2 h-4 w-4" /> {t('ticket.reject')}
              </Button>
            )}
            {/* L3 Reject button - Only L3 can reject open tickets and tickets pending L3 review */}
            {isL3Plus &&
              (ticket.status === "open" || ticket.status === "rejected_pending_l3_review") && (
                <Button
                  variant="destructive"
                  onClick={() => openAction("reject")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {ticket.status === "rejected_pending_l3_review"
                    ? t('ticket.finalReject')
                    : t('ticket.reject')}
                </Button>
              )}
            {/* Finish and Escalate buttons - Only assigned L2 user can finish/escalate when ticket is in-progress or reopened_in_progress */}
            {isL2Plus &&
              isAssignedUser &&
              (ticket.status === "in_progress" ||
                ticket.status === "reopened_in_progress") && (
                <>
                  <Button onClick={() => openAction("finish")}>
                    {t('ticket.finish')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openAction("escalate")}
                  >
                    {t('ticket.escalate')}
                  </Button>
                </>
              )}
            {/* Approve Review button - Creator can approve review when ticket is finished */}
            {isCreator && ticket.status === "finished" && (
              <>
                <Button onClick={() => openAction("approve-review")}>
                  {t('ticket.approveReview')}
                </Button>
                <Button variant="outline" onClick={() => openAction("reopen")}>
                  {t('ticket.reopen')}
                </Button>
              </>
            )}
            
            {/* Approve Close button - L4+ managers can approve close when ticket is reviewed */}
            {isL4Plus && ticket.status === "reviewed" && (
              <Button onClick={() => openAction("approve-close")}>
                {t('ticket.approveClose')}
              </Button>
            )}
            {/* L3 Reassign button - L3 can reassign tickets in any status except rejected_final and closed */}
            {isL3Plus &&
              ticket.status !== "rejected_final" &&
              ticket.status !== "closed" && (
                <Button
                  variant="outline"
                  onClick={() => openAction("reassign")}
                >
                  {t('ticket.reassign')}
                </Button>
              )}
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-red-500" />
                {t('ticket.imageEvidence')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section
                className={`rounded-lg border-2 p-4 shadow-sm transition-colors ${
                  isDragOver && dragTarget === "before"
                    ? "border-red-400 bg-red-50/80 dark:border-red-500 dark:bg-red-950/40"
                    : "border-red-200/80 bg-red-50/40 dark:border-red-500/60 dark:bg-red-950/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-200">
                    <Image className="h-4 w-4" />
                    <span>{t('ticket.before')}</span>
                  </div>
                  <Badge className="border-red-200 bg-white/70 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
                    {beforeImages.length} {t('ticket.photo')}
                    {beforeImages.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {beforeImages.length > 0 ? (
                    beforeImages.map((img) => renderImageCard(img, "before"))
                  ) : (
                    <div className="col-span-full rounded-md border border-dashed border-red-200/70 bg-white/60 px-3 py-6 text-sm text-red-700 dark:border-red-500/50 dark:bg-transparent dark:text-red-200">
                      {t('ticket.noBeforeImages')}
                    </div>
                  )}
                </div>

                {uploadAllowed && (
                  <div
                    className={`mt-4 rounded-md border border-dashed px-4 py-3 text-center text-sm transition-colors ${
                      isDragOver && dragTarget === "before"
                        ? "border-red-400 bg-white/60 dark:border-red-500"
                        : "border-red-200/80 bg-white/40 dark:border-red-500/50 dark:bg-transparent"
                    }`}
                    onDragOver={handleDragOver("before")}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop("before")}
                  >
                    <p className="font-medium text-red-700 dark:text-red-200">
                      {t('ticket.addProblemEvidence')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('ticket.dragDropOrChoose')}
                    </p>
                    <FileUpload
                      accept="image/*"
                      multiple
                      onChange={(files) => setBeforeFiles(Array.from(files || []))}
                      className="mt-3"
                      placeholder={t('ticket.chooseFiles')}
                    />
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={beforeFiles.length === 0 || uploading}
                        onClick={() => handleImageUpload("before")}
                      >
                        {uploading
                          ? t('ticket.uploading')
                          : beforeFiles.length > 1
                            ? `${t('ticket.upload')} ${beforeFiles.length} ${t('ticket.images')}`
                            : `${t('ticket.upload')} ${t('ticket.image')}`}
                      </Button>
                      {beforeFiles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBeforeFiles([])}
                          disabled={uploading}
                        >
                          {t('common.clear')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {!uploadAllowed && (
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    {t('ticket.uploadDisabled')}
                  </p>
                )}
              </section>

              {showAfterSection ? (
                <section
                  className={`rounded-lg border-2 p-4 shadow-sm transition-colors ${
                    isDragOver && dragTarget === "after"
                      ? "border-emerald-400 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/60 dark:bg-emerald-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                      <Sparkles className="h-4 w-4" />
                      <span>{t('ticket.after')}</span>
                    </div>
                    <Badge className="border-emerald-200 bg-white/70 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                      {afterImages.length} {t('ticket.photo')}
                      {afterImages.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {afterImages.length > 0 ? (
                      afterImages.map((img) => renderImageCard(img, "after"))
                    ) : (
                      <div className="col-span-full rounded-md border border-dashed border-emerald-200/70 bg-white/60 px-3 py-6 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-transparent dark:text-emerald-200">
                        {t('ticket.noAfterImages')}
                      </div>
                    )}
                  </div>

                  {uploadAllowed && (
                    <div
                      className={`mt-4 rounded-md border border-dashed px-4 py-3 text-center text-sm transition-colors ${
                        isDragOver && dragTarget === "after"
                          ? "border-emerald-400 bg-white/60 dark:border-emerald-500"
                          : "border-emerald-200/80 bg-white/40 dark:border-emerald-500/50 dark:bg-transparent"
                      }`}
                      onDragOver={handleDragOver("after")}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop("after")}
                    >
                      <p className="font-medium text-emerald-700 dark:text-emerald-200">
                        {t('ticket.shareImprovementResults')}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('ticket.dragDropOrChoose')}
                      </p>
                      <FileUpload
                        accept="image/*"
                        multiple
                        onChange={(files) => setAfterFiles(Array.from(files || []))}
                        className="mt-3"
                        placeholder={t('ticket.chooseFiles')}
                      />
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={afterFiles.length === 0 || uploading}
                          onClick={() => handleImageUpload("after")}
                        >
                          {uploading
                            ? t('ticket.uploading')
                            : afterFiles.length > 1
                              ? `${t('ticket.upload')} ${afterFiles.length} ${t('ticket.images')}`
                              : `${t('ticket.upload')} ${t('ticket.image')}`}
                        </Button>
                        {afterFiles.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAfterFiles([])}
                            disabled={uploading}
                          >
                            {t('common.clear')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {!uploadAllowed && (
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      {t('ticket.uploadDisabled')}
                    </p>
                  )}
                </section>
              ) : (
                <div className="rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 p-4 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                  {t('ticket.afterGalleryUnlock')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('ticket.comments')} {ticket.comments ? `(${ticket.comments.length})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isClosed && (
                <div className="mb-6 space-y-3">
                  <Label htmlFor="new-comment">{t('ticket.addComment')}</Label>
                  <Textarea
                    id="new-comment"
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t('ticket.commentPlaceholder')}
                  />
                  <div className="flex justify-end gap-2">
                    {commentText.trim().length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentText("")}
                      >
                        {t('common.clear')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={!commentText.trim()}
                      onClick={async () => {
                        try {
                          if (!ticket) return;
                          const text = commentText.trim();
                          if (!text) return;
                          await ticketService.addComment(ticket.id, text);
                          setCommentText("");
                          await fetchTicketDetails();
                        } catch (err) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : t('ticket.failedToAddComment'),
                          );
                        }
                      }}
                    >
                      {t('ticket.postComment')}
                    </Button>
                  </div>
                </div>
              )}

              {ticket.comments && ticket.comments.length > 0 ? (
                <div className="space-y-4">
                  {ticket.comments.map((comment, index) => {
                    const isStatusChange = comment.comment?.startsWith(
                      "Status changed from",
                    );
                    const userInitials = comment.user_name
                      ? `${comment.user_name.split(" ")[0]?.[0] || ""}${comment.user_name.split(" ")[1]?.[0] || ""}`
                      : `U${comment.user_id}`;

                    const avatarSrc = getFileUrl(comment.user_avatar_url);

                    return (
                      <div
                        key={index}
                        className={`rounded-md border p-4 ${
                          isStatusChange
                            ? "border-green-200/60 bg-green-50/40 dark:border-green-500/30 dark:bg-green-950/20"
                            : "border-blue-200/60 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-950/20"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {avatarSrc ? (
                              <AvatarImage src={avatarSrc} alt="avatar" />
                            ) : null}
                            <AvatarFallback className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {comment.user_name || `User ${comment.user_id}`}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {formatCommentTime(comment.created_at)}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-sm ${
                            isStatusChange
                              ? "text-green-700 dark:text-green-300 font-medium"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {comment.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('ticket.noComments')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('ticket.ticketInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('ticket.title')}
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {ticket.title}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('ticket.description')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
              {ticket.pucode && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    PUCODE
                  </p>
                  <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                    {ticket.pucode}
                  </p>
                </div>
              )}

              {ticket.pu_name && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    PU Name
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.pu_name}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ticket.status')}
                  </p>
                  <Badge
                    className={`mt-1 ${getTicketStatusClass(ticket.status)}`}
                  >
                    {ticket.status?.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ticket.priority')}
                  </p>
                  <Badge
                    className={`mt-1 ${getTicketPriorityClass(ticket.priority)}`}
                  >
                    {ticket.priority?.toUpperCase() || "N/A"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ticket.severity')}
                  </p>
                  <Badge
                    className={`mt-1 ${getTicketSeverityClass(ticket.severity_level)}`}
                  >
                    {ticket.severity_level?.toUpperCase() || "N/A"}
                  </Badge>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ticket.reporter')}
                  </dt>
                  <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>{ticket.reporter_name}</span>
                    {ticket.reporter_phone && (
                      <a
                        href={`tel:${ticket.reporter_phone}`}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 transition-colors"
                        title={`Call ${ticket.reporter_name}: ${ticket.reporter_phone}`}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                  </dd>
                </div>
                {ticket.assignee_name && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.assignedTo')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <span>{ticket.assignee_name}</span>
                      {ticket.assignee_phone && (
                        <a
                          href={`tel:${ticket.assignee_phone}`}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 transition-colors"
                          title={`Call ${ticket.assignee_name}: ${ticket.assignee_phone}`}
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ticket.created')}
                  </dt>
                  <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {formatCommentTime(ticket.created_at)}
                  </dd>
                </div>
               

                {ticket.schedule_start && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.scheduledStartdate')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {formatCommentTime(ticket.schedule_start)}
                    </dd>
                  </div>
                )}
                {ticket.schedule_finish && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.scheduledFinishedate')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {formatCommentTime(ticket.schedule_finish)}
                    </dd>
                  </div>
                )}
                {ticket.actual_finish_at && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.actualFinishdate')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {formatCommentTime(ticket.actual_finish_at)}
                    </dd>
                  </div>
                )}
                {ticket.actual_start_at && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.actualStartdate')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {formatCommentTime(ticket.actual_start_at)}
                    </dd>
                  </div>
                )}
                {ticket.cost_avoidance && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.costAvoidance')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      ฿{ticket.cost_avoidance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                )}
                {ticket.downtime_avoidance_hours && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ticket.downtimeAvoidance')}
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      {ticket.downtime_avoidance_hours} {t('ticket.hours')}
                    </dd>
                  </div>
                )}
                {ticket.failure_mode_name && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Failure Mode
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      {ticket.failure_mode_code && `[${ticket.failure_mode_code}] `}
                      {ticket.failure_mode_name}
                    </dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('ticket.location')}
                </p>
                {locationHierarchy.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {locationHierarchy.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-md border border-gray-200/60 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {item.label}
                        </span>
                        <div className="text-right">
                          <div className="text-gray-900 dark:text-gray-100 font-medium">
                            {item.value}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.code}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('ticket.noLocationDetails')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('ticket.workflowTimeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Create a comprehensive timeline by combining all events
                  const timelineEvents: Array<{
                    id: string;
                    type:
                      | "created"
                      | "status_change"
                      | "assignment"
                      | "accepted"
                      | "rejected"
                      | "finished"
                      | "escalated"
                      | "closed"
                      | "reopened"
                      | "l3_override";
                    timestamp: string;
                    title: string;
                    description: string;
                    icon: React.ReactNode;
                    iconBg: string;
                    iconColor: string;
                  }> = [];

                  // Add ticket creation event
                  timelineEvents.push({
                    id: "created",
                    type: "created",
                    timestamp: ticket.created_at,
                    title: t('ticket.ticketCreated'),
                    description: `${t('ticket.by')} ${ticket.reporter_name}`,
                    icon: <Plus className="h-4 w-4" />,
                    iconBg: "bg-blue-100 dark:bg-blue-900",
                    iconColor: "text-blue-600 dark:text-blue-400",
                  });

                  // Add all events from status history (including assignments)
                  if (
                    ticket.status_history &&
                    ticket.status_history.length > 0
                  ) {
                    ticket.status_history.forEach((statusChange) => {
                      const getStatusIcon = (status: string) => {
                        switch (status.toLowerCase()) {
                          case "open":
                            return <Plus className="h-4 w-4" />;
                          case "in_progress":
                            return <Play className="h-4 w-4" />;
                          case "finished":
                            return <CheckCircle className="h-4 w-4" />;
                          case "closed":
                            return <Lock className="h-4 w-4" />;
                          case "rejected":
                            return <X className="h-4 w-4" />;
                          case "escalated":
                            return <AlertTriangle className="h-4 w-4" />;
                          case "reopened":
                            return <RefreshCw className="h-4 w-4" />;
                          case "assigned":
                            return <UserPlus className="h-4 w-4" />;
                          default:
                            return <Circle className="h-4 w-4" />;
                        }
                      };

                      const getStatusIconBg = (status: string) => {
                        switch (status.toLowerCase()) {
                          case "open":
                            return "bg-blue-100 dark:bg-blue-900";
                          case "in_progress":
                            return "bg-yellow-100 dark:bg-yellow-900";
                          case "finished":
                            return "bg-emerald-100 dark:bg-emerald-900";
                          case "closed":
                            return "bg-gray-100 dark:bg-gray-800";
                          case "rejected":
                            return "bg-red-100 dark:bg-red-900";
                          case "escalated":
                            return "bg-orange-100 dark:bg-orange-900";
                          case "reopened":
                            return "bg-yellow-100 dark:bg-yellow-900";
                          case "assigned":
                            return "bg-indigo-100 dark:bg-indigo-900";
                          default:
                            return "bg-gray-100 dark:bg-gray-800";
                        }
                      };

                      const getStatusIconColor = (status: string) => {
                        switch (status.toLowerCase()) {
                          case "open":
                            return "text-blue-600 dark:text-blue-400";
                          case "in_progress":
                            return "text-yellow-600 dark:text-yellow-400";
                          case "finished":
                            return "text-emerald-600 dark:text-emerald-400";
                          case "closed":
                            return "text-gray-600 dark:text-gray-400";
                          case "rejected":
                            return "text-red-600 dark:text-red-400";
                          case "escalated":
                            return "text-orange-600 dark:text-orange-400";
                          case "reopened":
                            return "text-yellow-600 dark:text-yellow-400";
                          case "assigned":
                            return "text-indigo-600 dark:text-indigo-400";
                          default:
                            return "text-gray-600 dark:text-gray-400";
                        }
                      };

                      // Determine title and description based on status and to_user
                      let title: string;
                      let description: string;

                      if (
                        statusChange.new_status === "assigned" &&
                        statusChange.to_user_name
                      ) {
                        title = t('ticket.ticketAssigned');
                        description = `${t('ticket.to')} ${statusChange.to_user_name} ${t('ticket.by')} ${statusChange.changed_by_name}`;
                      } else {
                        title = `${t('ticket.statusChangedTo')} ${statusChange.new_status.replace("_", " ").toUpperCase()}`;
                        description = `${t('ticket.by')} ${statusChange.changed_by_name}`;
                      }

                      timelineEvents.push({
                        id: `status-${statusChange.id}`,
                        type:
                          statusChange.new_status === "assigned"
                            ? "assignment"
                            : "status_change",
                        timestamp: statusChange.changed_at,
                        title,
                        description,
                        icon: getStatusIcon(statusChange.new_status),
                        iconBg: getStatusIconBg(statusChange.new_status),
                        iconColor: getStatusIconColor(statusChange.new_status),
                      });
                    });
                  }

                  // Sort events by timestamp
                  timelineEvents.sort(
                    (a, b) =>
                      new Date(a.timestamp).getTime() -
                      new Date(b.timestamp).getTime(),
                  );

                  return timelineEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${event.iconBg}`}
                      >
                        <span className={event.iconColor}>{event.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimelineTime(event.timestamp)} -{" "}
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl">
          {ticket && ticket.images && ticket.images[lightboxIndex] && (
            <div className="relative">
              <img
                src={getFileUrl(ticket.images[lightboxIndex].image_url)}
                alt={ticket.images[lightboxIndex].image_name}
                className="w-full h-auto"
              />
              <div className="flex justify-between mt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) =>
                        (prev - 1 + ticket.images!.length) %
                        ticket.images!.length,
                    )
                  }
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) => (prev + 1) % ticket.images!.length,
                    )
                  }
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Modal with comment */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold capitalize">
              {actionType.replace("_", " ")}
            </h3>
            <div className="space-y-2">
              <Label>
                {actionType === "reject"
                  ? t('ticket.rejectionReason')
                  : actionType === "approve-review"
                    ? t('ticket.reviewReason')
                    : actionType === "approve-close"
                      ? t('ticket.closeReason')
                    : actionType === "reopen"
                      ? t('ticket.reopenReason')
                      : t('ticket.notes')}
              </Label>
              <Textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                required={actionType === "reject"}
              />
              {actionType === "reject" && !actionComment && (
                <p className="text-xs text-red-500">{t('ticket.rejectionReasonRequired')}</p>
              )}
            </div>
            {actionType === "plan" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('ticket.scheduleStart')}</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.scheduleFinish')}</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleFinish}
                    onChange={(e) => setScheduleFinish(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.assignTo')}</Label>
                  {/* L2 users can only assign themselves when planning */}
                  {isL2Plus && !isL3Plus ? (
                    <div className="rounded-md border bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.email || 'You'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        L2 users can only assign themselves when planning tickets
                      </p>
                      <input type="hidden" value={user?.id} />
                    </div>
                  ) : (
                    /* L3+ users can select any assignee */
                    <div className="relative" ref={assigneeDropdownRef}>
                      <Input
                        value={assigneeQuery}
                        onChange={(e) => {
                          setAssigneeQuery(e.target.value);
                          setAssigneeDropdownOpen(true);
                        }}
                        onFocus={() => setAssigneeDropdownOpen(true)}
                        placeholder={t('ticket.searchL2L3User')}
                        required
                      />
                      {assigneeDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {assigneesLoading ? (
                            <div className="p-3 text-sm text-gray-500">
                              {t('ticket.searching')}
                            </div>
                          ) : assignees.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">
                              {t('ticket.noUsersFound')}
                            </div>
                          ) : (
                            assignees.map((u) => (
                              <button
                                type="button"
                                key={u.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-hover hover:text-hover-foreground"
                                onClick={() => {
                                  setActionExtraId(String(u.id));
                                  setAssigneeQuery(u.name);
                                  setAssigneeDropdownOpen(false);
                                }}
                              >
                                <div className="font-medium">{u.name}</div>
                                <div className="text-xs text-gray-500">
                                  {u.email}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!actionExtraId && !(isL2Plus && !isL3Plus) && (
                    <p className="text-xs text-red-500">{t('ticket.pleaseSelectAssignee')}</p>
                  )}
                  {actionExtraId && (
                    <div className="text-xs text-gray-600">
                      {t('ticket.selectedUserId')}: {actionExtraId}
                    </div>
                  )}
                </div>
              </div>
            )}
            {actionType === "start" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('ticket.actualStartTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={actualStartAt}
                    onChange={(e) => setActualStartAt(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {t('ticket.actualStartTimeHelp')}
                  </p>
                </div>
              </div>
            )}
            {actionType === "finish" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('ticket.actualStartTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={actualStartAtEdit}
                    onChange={(e) => setActualStartAtEdit(e.target.value)}
                    placeholder={t('ticket.actualStartTimeHelp')}
                  />
                  <p className="text-xs text-gray-500">
                    {t('ticket.actualStartTimeEditHelp')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.actualFinishTime')}</Label>
                  <Input
                    type="datetime-local"
                    value={actualFinishAt}
                    onChange={(e) => setActualFinishAt(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {t('ticket.actualFinishTimeHelp')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.downtimeAvoidanceHours')}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={downtimeAvoidance}
                    onChange={(e) => setDowntimeAvoidance(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.costAvoidanceTHB')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costAvoidance}
                    onChange={(e) => setCostAvoidance(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.failureMode')}</Label>
                  <Select
                    value={failureModeId}
                    onValueChange={setFailureModeId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('ticket.selectFailureMode')} />
                    </SelectTrigger>
                    <SelectContent>
                      {failureModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id.toString()}>
                          {mode.code} - {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {actionType === "approve-review" && (
              <div className="space-y-2">
                <Label>{t('ticket.satisfactionRating')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={actionNumber}
                  onChange={(e) => setActionNumber(e.target.value)}
                />
              </div>
            )}
            {actionType === "reassign" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('ticket.scheduleStart')}</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.scheduleFinish')}</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleFinish}
                    onChange={(e) => setScheduleFinish(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('ticket.newAssignee')}</Label>
                  <div className="relative" ref={assigneeDropdownRef}>
                    <Input
                      value={assigneeQuery}
                      onChange={(e) => {
                        setAssigneeQuery(e.target.value);
                        setAssigneeDropdownOpen(true);
                      }}
                      onFocus={() => setAssigneeDropdownOpen(true)}
                      placeholder={t('ticket.searchL2L3User')}
                      required
                    />
                    {assigneeDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                        {assigneesLoading ? (
                          <div className="p-3 text-sm text-gray-500">
                            {t('ticket.searching')}
                          </div>
                        ) : assignees.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">
                            {t('ticket.noUsersFound')}
                          </div>
                        ) : (
                          assignees.map((u) => (
                            <button
                              type="button"
                              key={u.id}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-hover hover:text-hover-foreground"
                              onClick={() => {
                                setActionExtraId(String(u.id));
                                setAssigneeQuery(u.name);
                                setAssigneeDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-gray-500">
                                {u.email}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {!actionExtraId && (
                    <p className="text-xs text-red-500">{t('ticket.pleaseSelectNewAssignee')}</p>
                  )}
                  {actionExtraId && (
                    <div className="text-xs text-gray-600">
                      {t('ticket.selectedUserId')}: {actionExtraId}
                    </div>
                  )}
                </div>
              </div>
            )}
            {actionType === "escalate" && (
              <div className="space-y-2">
                <Label>{t('ticket.escalateToL3User')}</Label>
                <div className="relative">
                  <Input
                    value={assigneeQuery}
                    onChange={(e) => {
                      setAssigneeQuery(e.target.value);
                      setAssigneeDropdownOpen(true);
                    }}
                    onFocus={() => setAssigneeDropdownOpen(true)}
                    placeholder={t('ticket.searchL3User')}
                  />
                  {assigneeDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                      {assigneesLoading ? (
                        <div className="p-3 text-sm text-gray-500">
                          {t('ticket.searching')}
                        </div>
                      ) : assignees.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          {t('ticket.noL3UsersFound')}
                        </div>
                      ) : (
                        assignees.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-hover hover:text-hover-foreground"
                            onClick={() => {
                              setActionExtraId(String(u.id));
                              setAssigneeQuery(u.name);
                              setAssigneeDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">
                              {u.email}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {actionExtraId && (
                  <div className="text-xs text-gray-600">
                    {t('ticket.selectedL3UserId')}: {actionExtraId}
                  </div>
                )}
              </div>
            )}
            {actionType === "reject" && (
              <div className="text-sm text-gray-600">
                {userApprovalLevel >= 3
                  ? t('ticket.finalRejectionMessage')
                  : t('ticket.rejectionL3ReviewMessage')}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActionOpen(false)}
                disabled={acting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={performAction}
                disabled={
                  acting ||
                  (actionType === "plan" && (!scheduleStart || !scheduleFinish || (!actionExtraId && !(isL2Plus && !isL3Plus)))) ||
                  (actionType === "start" && !actualStartAt) ||
                  (actionType === "finish" && (!downtimeAvoidance || !costAvoidance || !failureModeId || !actualFinishAt)) ||
                  (actionType === "reject" && (!actionComment || actionComment.trim() === "")) ||
                  (actionType === "reassign" && (!scheduleStart || !scheduleFinish || !actionExtraId)) ||
                  (actionType === "escalate" && !actionExtraId)
                }
              >
                {acting ? t('ticket.working') : t('common.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetailsPage;
