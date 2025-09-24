const STATUS_CLASSES: Record<string, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700",
  assigned: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-yellow-200 bg-yellow-50 text-yellow-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-50 text-slate-700",
  rejected_pending_l3_review: "border-orange-200 bg-orange-50 text-orange-700",
  rejected_final: "border-red-200 bg-red-50 text-red-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  escalated: "border-red-200 bg-red-50 text-red-700",
  reopened_in_progress: "border-blue-200 bg-blue-50 text-blue-700",
};

const PRIORITY_CLASSES: Record<string, string> = {
  urgent: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const SEVERITY_CLASSES: Record<string, string> = {
  critical: "bg-red-600 text-white border-red-700",
  high: "bg-orange-600 text-white border-orange-700",
  medium: "bg-amber-500 text-white border-amber-600",
  low: "bg-blue-600 text-white border-blue-700",
};

export const getTicketStatusClass = (status?: string) => {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-700";
  return (
    STATUS_CLASSES[status.toLowerCase()] ??
    "border-slate-200 bg-slate-50 text-slate-700"
  );
};

export const getTicketPriorityClass = (priority?: string) => {
  if (!priority) return "border-slate-200 bg-slate-50 text-slate-700";
  return (
    PRIORITY_CLASSES[priority.toLowerCase()] ??
    "border-slate-200 bg-slate-50 text-slate-700"
  );
};

export const getTicketSeverityClass = (severity?: string) => {
  if (!severity) return "bg-slate-600 text-white border-slate-700";
  return (
    SEVERITY_CLASSES[severity.toLowerCase()] ??
    "bg-slate-600 text-white border-slate-700"
  );
};
