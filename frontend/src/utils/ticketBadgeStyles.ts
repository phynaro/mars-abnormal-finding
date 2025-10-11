const STATUS_CLASSES: Record<string, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700",
  assigned: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-yellow-200 bg-yellow-50 text-yellow-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-50 text-slate-700",
  rejected_pending_l3_review: "border-orange-200 bg-orange-50 text-orange-700",
  rejected_final: "border-red-200 bg-red-50 text-red-700",
  Finished: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reviewed: "border-purple-200 bg-purple-50 text-purple-700",
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

const CRITICAL_LEVEL_CLASSES: Record<number, string> = {
  1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  2: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  3: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  4: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  6: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  7: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const CEDAR_SYNC_STATUS_CLASSES: Record<string, string> = {
  success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  error: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
  syncing: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
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

// Helper function to get critical level text
export const getCriticalLevelText = (level: number | null | undefined, t: (key: string) => string): string => {
  if (!level) return "N/A";
  
  switch (level) {
    case 1:
      return t('ticket.criticalLevel1');
    case 2:
      return t('ticket.criticalLevel2');
    case 3:
      return t('ticket.criticalLevel3');
    case 4:
      return t('ticket.criticalLevel4');
    case 5:
      return t('ticket.criticalLevel5');
    case 6:
      return t('ticket.criticalLevel6');
    case 7:
      return t('ticket.criticalLevel7');
    default:
      return "N/A";
  }
};

// Helper function to get critical level CSS classes
export const getCriticalLevelClass = (level: number | null | undefined): string => {
  if (!level) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  
  return (
    CRITICAL_LEVEL_CLASSES[level] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
};

// Helper function to get Cedar sync status badge styling
export const getCedarSyncStatusClass = (status: string | null | undefined): string => {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
  
  return (
    CEDAR_SYNC_STATUS_CLASSES[status.toLowerCase()] ??
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
  );
};

// Helper function to get Cedar sync status text
export const getCedarSyncStatusText = (status: string | null | undefined): string => {
  if (!status) return 'Unknown';
  
  switch (status.toLowerCase()) {
    case 'success':
      return 'Synced';
    case 'error':
      return 'Error';
    case 'pending':
      return 'Pending';
    case 'syncing':
      return 'Syncing';
    default:
      return 'Unknown';
  }
};
