import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import backlogService, { type BacklogItem } from '@/services/backlogService';
import personnelService, { type Person } from '@/services/personnelService';
import ReactECharts from 'echarts-for-react';

type TabKey = 'department' | 'user';
type ViewMode = 'table' | 'chart';

interface GroupRow {
  key: string; // deptCode or personName
  counts: Record<string, number>; // status name -> count
  total: number;
}

const DashboardBacklogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('department');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<BacklogItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Fetch backlog when tab or site changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (activeTab === 'department') {
          const res = await backlogService.getBacklogAssign({ siteNo: 3 });
          setRaw(res.data.backlog || []);
        } else {
          const res = await backlogService.getBacklogAssignTo({ siteNo: 3 });
          setRaw(res.data.backlog || []);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load backlog');
        setRaw([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  // Load personnel for By User tab to enable client-side dept filter
  useEffect(() => {
    const loadPersons = async () => {
      try {
        const res = await personnelService.getPersons({ page: 1, limit: 1000 });
        setPersons(res.data || []);
      } catch (e) {
        // Non-blocking for backlog view
      }
    };
    if (activeTab === 'user' && persons.length === 0) loadPersons();
  }, [activeTab, persons.length]);

  // Unique status names to define columns (hide unwanted ones like Cancelled)
  const HIDDEN_STATUSES = useMemo(() => new Set(['Cancelld', 'Cancelled'].map(s => s.toLowerCase())), []);
  const statuses = useMemo(() => {
    const s = Array.from(new Set(raw.map(r => r.woStatusName).filter(Boolean)));
    const filtered = s.filter(name => !HIDDEN_STATUSES.has(String(name).toLowerCase()));
    filtered.sort();
    return filtered;
  }, [raw, HIDDEN_STATUSES]);

  // Group rows by dept or user
  const rows: GroupRow[] = useMemo(() => {
    const map = new Map<string, GroupRow>();
    raw.forEach(item => {
      const key = activeTab === 'department' ? (item.deptCode || 'Unknown') : (item.personName || 'Unknown');
      const existing = map.get(key) || { key, counts: {}, total: 0 };
      existing.counts[item.woStatusName] = (existing.counts[item.woStatusName] || 0) + (item.count || 0);
      map.set(key, existing);
    });
    // Compute totals AFTER excluding hidden statuses so sorting uses adjusted totals
    const result = Array.from(map.values()).map(r => ({
      ...r,
      total: Object.entries(r.counts).reduce((sum, [status, cnt]) =>
        (HIDDEN_STATUSES.has(String(status).toLowerCase()) ? sum : sum + (cnt || 0)), 0)
    }));
    return result.sort((a, b) => b.total - a.total);
  }, [raw, activeTab, HIDDEN_STATUSES]);

  // Build dept options and mapping for user filter
  const personDeptMap = useMemo(() => {
    const m: Record<string, string | undefined> = {};
    persons.forEach(p => { if (p.PERSON_NAME) m[p.PERSON_NAME] = p.DEPTCODE; });
    return m;
  }, [persons]);

  const deptOptions = useMemo(() => {
    const set = new Map<string, string>();
    persons.forEach(p => {
      if (p.DEPTCODE) set.set(p.DEPTCODE, p.DEPTNAME || p.DEPTCODE);
    });
    return Array.from(set.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [persons]);

  const displayedRows = useMemo(() => {
    if (activeTab !== 'user' || !selectedDept) return rows;
    return rows.filter(r => personDeptMap[r.key] === selectedDept);
  }, [rows, activeTab, selectedDept, personDeptMap]);

  const onRowClick = (row: GroupRow) => {
    if (activeTab === 'department') {
      navigate(`/dashboard/backlog/department/${encodeURIComponent(row.key)}`);
    } else {
      navigate(`/dashboard/backlog/user/${encodeURIComponent(row.key)}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Backlog"
        description="Work order backlog overview by department and user"
      />

      {/* Tabs + Filters + View toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded border overflow-hidden">
          <Button variant={activeTab === 'department' ? 'default' : 'ghost'} className="rounded-none" onClick={() => setActiveTab('department')}>By Department</Button>
          <Button variant={activeTab === 'user' ? 'default' : 'ghost'} className="rounded-none" onClick={() => setActiveTab('user')}>By User</Button>
        </div>

        {activeTab === 'user' && (
          <div className="ml-0 inline-flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Department</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {deptOptions.map(d => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {(activeTab === 'department' || activeTab === 'user') && (
          <div className="ml-auto inline-flex rounded border overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              className="rounded-none flex items-center gap-1"
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              className="rounded-none flex items-center gap-1"
              onClick={() => setViewMode('chart')}
              title="Stacked bar chart"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Chart</span>
            </Button>
          </div>
        )}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Stacked chart for Department */}
          {(activeTab === 'department' || activeTab === 'user') && viewMode === 'chart' && (
            <StackedChart rows={activeTab === 'user' ? displayedRows : rows} statuses={statuses} />
          )}

          {/* Sunburst: By Department (WOType -> Status) */}
          {activeTab === 'department' && viewMode === 'chart' && (
            <div className="mt-4">
              <SunburstByDept hiddenStatuses={HIDDEN_STATUSES} />
            </div>
          )}

          {/* Desktop table */}
          {!((activeTab === 'department' || activeTab === 'user') && viewMode === 'chart') && (
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 whitespace-nowrap">{activeTab === 'department' ? 'Department' : 'User'}</th>
                  {statuses.map(st => (
                    <th key={st} className="px-4 py-2 whitespace-nowrap">{st}</th>
                  ))}
                  <th className="px-4 py-2 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map(row => (
                  <tr key={row.key} className="border-t cursor-pointer hover:bg-accent" onClick={() => onRowClick(row)}>
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{row.key}</td>
                    {statuses.map(st => (
                      <td key={st} className="px-4 py-2 text-right">{row.counts[st] || 0}</td>
                    ))}
                    <td className="px-4 py-2 text-right font-medium">{row.total}</td>
                  </tr>
                ))}
                {!displayedRows.length && (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={statuses.length + 2}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Mobile cards */}
          {!((activeTab === 'department' || activeTab === 'user') && viewMode === 'chart') && (
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {displayedRows.map(row => (
              <Card key={row.key} className="p-4 cursor-pointer hover:bg-accent" onClick={() => onRowClick(row)}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{row.key}</div>
                  <Badge variant="secondary">Total: {row.total}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {statuses.map(st => (
                    <Badge key={st} variant="outline">{st}: {row.counts[st] || 0}</Badge>
                  ))}
                </div>
              </Card>
            ))}
            {!displayedRows.length && (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardBacklogPage;

// ============ Internal reusable stacked chart component ============
const StackedChart: React.FC<{ rows: GroupRow[]; statuses: string[] }> = ({ rows, statuses }) => {
  // Prepare chart data
  const data = useMemo(() => {
    return rows.map(r => {
      const item: Record<string, any> = { name: r.key };
      statuses.forEach(st => { item[st] = r.counts[st] || 0; });
      return item;
    });
  }, [rows, statuses]);

  // Colors per status
  const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899','#22c55e','#6366f1'];
  const statusColors = useMemo(() => {
    const m: Record<string, string> = {};
    statuses.forEach((st, i) => { m[st] = palette[i % palette.length]; });
    return m;
  }, [statuses]);

  // Bigger bars and more space for long names
  const barSize = 26;
  // Let the chart grow with the number of rows (no upper cap)
  const chartHeight = Math.max(380, rows.length * (barSize + 6));
  const maxLabelLen = useMemo(() => rows.reduce((m, r) => Math.max(m, (r.key || '').length), 0), [rows]);
  const yAxisWidth = Math.min(360, Math.max(200, maxLabelLen * 9));

  return (
    <Card className="p-4">
      <div className="h-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 24, right: 24, left: 8, bottom: 24 }} barCategoryGap={2} barSize={barSize}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={yAxisWidth} interval={0} tickLine={false} />
            <Tooltip />
            <Legend />
            {statuses.map(st => (
              <Bar key={st} dataKey={st} stackId="a" fill={statusColors[st]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ============ Sunburst chart (By Department -> WOType -> WOStatus) ============
const SunburstByDept: React.FC<{ hiddenStatuses: Set<string> }> = ({ hiddenStatuses }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await backlogService.getBacklogByWOTypeAndDept({ siteNo: 3 });
        const items = res.data.backlog || [];

        // Aggregate: dept -> type -> status
        const deptMap = new Map<string, Map<string, Map<string, number>>>();
        for (const it of items) {
          const dept = it.deptCode || 'Unknown';
          const type = it.woTypeCode || 'Unknown';
          const status = it.woStatusCode || 'Unknown';
          if (hiddenStatuses.has(String(status).toLowerCase())) continue; // exclude hidden
          if (!deptMap.has(dept)) deptMap.set(dept, new Map());
          const typeMap = deptMap.get(dept)!;
          if (!typeMap.has(type)) typeMap.set(type, new Map());
          const statusMap = typeMap.get(type)!;
          statusMap.set(status, (statusMap.get(status) || 0) + (it.total || 0));
        }

        const toSunburst = Array.from(deptMap.entries()).map(([dept, typeMap]) => {
          const typeChildren = Array.from(typeMap.entries()).map(([type, statusMap]) => {
            const statusChildren = Array.from(statusMap.entries()).map(([status, v]) => ({ name: status, value: v }));
            const typeValue = statusChildren.reduce((s, c) => s + (c.value || 0), 0);
            return { name: type, value: typeValue, children: statusChildren };
          });
          const deptValue = typeChildren.reduce((s, c) => s + (c.value || 0), 0);
          return { name: dept, value: deptValue, children: typeChildren };
        });
        setData(toSunburst);
      } catch (e: any) {
        setError(e.message || 'Failed to load sunburst');
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hiddenStatuses]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading sunburst...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!data.length) return <div className="text-sm text-muted-foreground">No data</div>;

  const option = {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.value}` },
    series: [
      {
        type: 'sunburst',
        data,
        radius: [0, '85%'],
        sort: undefined,
        emphasis: { focus: 'ancestor' },
        label: { rotate: 'radial' },
      }
    ]
  } as any;

  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-2">Backlog Composition by Department → WO Type → Status</div>
      <ReactECharts option={option} style={{ height: 520, width: '100%' }} />
    </Card>
  );
};
