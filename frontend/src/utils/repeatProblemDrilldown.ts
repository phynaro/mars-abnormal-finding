export interface RepeatProblemDrilldownArgs {
  puno: number | null;
  partCode: string;
  symptomCode: string;
  year: number;
  /** 1–12 for a single month; omit for the full year */
  month?: number;
  plant?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function buildRepeatProblemTicketListSearch(args: RepeatProblemDrilldownArgs): string {
  const params = new URLSearchParams();
  if (args.puno != null) params.set('puno', String(args.puno));
  params.set('part_code', args.partCode);
  params.set('symptom_code', args.symptomCode);

  if (args.month && args.month >= 1 && args.month <= 12) {
    params.set('startDate', `${args.year}-${pad2(args.month)}-01`);
    params.set('endDate', `${args.year}-${pad2(args.month)}-${pad2(lastDayOfMonth(args.year, args.month))}`);
  } else {
    params.set('startDate', `${args.year}-01-01`);
    params.set('endDate', `${args.year}-12-31`);
  }

  if (args.plant && args.plant !== 'all') params.set('plant', args.plant);
  return params.toString();
}

export function openRepeatProblemTicketList(args: RepeatProblemDrilldownArgs): void {
  window.open(`/tickets?${buildRepeatProblemTicketListSearch(args)}`, '_blank', 'noopener,noreferrer');
}
