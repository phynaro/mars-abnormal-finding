export type Timeliness = 'ontime' | 'late';

export interface OntimeDrilldownArgs {
  timeliness: Timeliness;
  startDate: string;
  endDate: string;
  plant?: string;
  area?: string;
  finished_by?: string;
  machine?: string;
}

export function buildOntimeTicketListSearch(args: OntimeDrilldownArgs): string {
  const params = new URLSearchParams();
  params.set('timeliness', args.timeliness);
  params.set('startDate', args.startDate);
  params.set('endDate', args.endDate);
  if (args.plant && args.plant !== 'all') params.set('plant', args.plant);
  if (args.area && args.area !== 'all') params.set('area', args.area);
  if (args.finished_by) params.set('finished_by', args.finished_by);
  if (args.machine) params.set('machine', args.machine);
  return params.toString();
}

export function openOntimeTicketList(args: OntimeDrilldownArgs): void {
  window.open(`/tickets?${buildOntimeTicketListSearch(args)}`, '_blank');
}
