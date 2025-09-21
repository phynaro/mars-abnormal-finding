import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { workOrderService } from '@/services/workOrderService';

interface Option { id: number | string; code?: string | null; name: string | null; }

const StatusPill: React.FC<{ name?: string | null; code?: string | null }>
  = ({ name, code }) => {
  const color = (code || '').toString();
  const cls = color === '50' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    : color === '70' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : color === '95' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-muted text-foreground';
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{name || code || 'N/A'}</span>;
};

const WorkOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    type: '',
    priority: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [statusOptions, setStatusOptions] = useState<Option[]>([]);
  const [typeOptions, setTypeOptions] = useState<Option[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<Option[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [st, ty, pr] = await Promise.all([
          workOrderService.getStatuses(),
          workOrderService.getTypes(),
          workOrderService.getPriorities(),
        ]);
        const extractArray = (res: any) => Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];
        setStatusOptions(extractArray(st));
        setTypeOptions(extractArray(ty));
        setPriorityOptions(extractArray(pr));
      } catch (e) {
        // ignore lookup errors for now
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await workOrderService.getAll({
          page: filters.page,
          limit: filters.limit,
          status: filters.status || undefined,
          type: filters.type || undefined,
          priority: filters.priority || undefined,
          search: filters.search || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        });
        const extractPayload = (r: any) => {
          if (r?.data?.workOrders) return r.data;
          if (r?.data?.data?.workOrders) return r.data.data;
          if (r?.workOrders) return r;
          return { workOrders: [], pagination: r?.data?.pagination || r?.pagination || { page: 1, totalPages: 1 } };
        };
        const payload = extractPayload(res);
        const list = Array.isArray(payload.workOrders)
          ? payload.workOrders
          : (payload.workOrders && typeof payload.workOrders === 'object')
            ? Object.values(payload.workOrders)
            : Array.isArray(payload.data)
              ? payload.data
              : [];
        setRows(list);
        const pgn = payload.pagination || res?.data?.pagination || {};
        setPage(Number(pgn.page) || 1);
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load work orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.page, filters.limit, filters.status, filters.type, filters.priority, filters.search, filters.startDate, filters.endDate]);

  const onFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const onPageChange = (next: number) => setFilters(prev => ({ ...prev, page: next }));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Work Orders" description="Browse and filter maintenance work orders" />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input placeholder="Search code/problem/requester" value={filters.search} onChange={(e) => onFilterChange('search', e.target.value)} />

        <Select value={filters.status || 'all'} onValueChange={(v) => onFilterChange('status', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type || 'all'} onValueChange={(v) => onFilterChange('type', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority || 'all'} onValueChange={(v) => onFilterChange('priority', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorityOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input type="date" value={filters.startDate} onChange={(e) => onFilterChange('startDate', e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={filters.endDate} onChange={(e) => onFilterChange('endDate', e.target.value)} />
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">WO Code</th>
                  <th className="px-4 py-2">Date/Time</th>
                  <th className="px-4 py-2">Problem</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Requester</th>
                  <th className="px-4 py-2">WR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t align-top cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/maintenance/work-orders/${row.id}`, { state: { breadcrumbExtra: row.woCode } })}
                  >
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{row.woCode}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.date || '-'} {row.time || ''}</td>
                    <td className="px-4 py-2 max-w-[420px] truncate" title={row.problem || ''}>{row.problem || '-'}</td>
                    <td className="px-4 py-2"><StatusPill name={row.status?.name} code={row.status?.code} /></td>
                    <td className="px-4 py-2">{row.type?.code || ''} {row.type?.name ? `- ${row.type?.name}` : ''}</td>
                    <td className="px-4 py-2">{row.priority?.name || row.priority?.code || '-'}</td>
                    <td className="px-4 py-2">{row.requester?.name || '-'}</td>
                    <td className="px-4 py-2">{row.related?.wrCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map(row => (
              <Card key={row.id} className="p-4 space-y-2 cursor-pointer hover:bg-accent" onClick={() => navigate(`/maintenance/work-orders/${row.id}`, { state: { breadcrumbExtra: row.woCode } })}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{row.woCode}</div>
                  <StatusPill name={row.status?.name} code={row.status?.code} />
                </div>
                <div className="text-xs text-muted-foreground">{row.date || '-'} {row.time || ''}</div>
                <div className="text-sm">{row.problem || '-'}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <Badge variant="secondary">{row.type?.code || ''}</Badge>
                  {row.priority?.name && <Badge variant="secondary">{row.priority?.name}</Badge>}
                  {row.requester?.name && <span>By {row.requester?.name}</span>}
                  {row.related?.wrCode && <span>WR {row.related?.wrCode}</span>}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkOrdersPage;
