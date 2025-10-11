import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const DashboardPage: React.FC = () => {
  // Filters
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [area, setArea] = useState<string>('all');
  const [ticketStatus, setTicketStatus] = useState<string>('all');
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => `P${getWeekOfYear(now)}`);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const areas = ['Line A', 'Line B', 'Warehouse', 'Utilities'];


  function getWeekOfYear(date: Date) {
    const target: any = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday: any = new Date(target.getFullYear(), 0, 4);
    const diff = target - firstThursday;
    return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  }

  // Generate weekly periods for the year up to 52
  const periods = useMemo(() => Array.from({ length: 52 }, (_, i) => `P${i + 1}`), []);

  const barData = useMemo(() => {
    return periods.map(p => ({
      period: p,
      open: 0,
      closed: 0,
    }));
  }, [periods]);

  // KPI calculations - using real data
  const thisMonth = now.getMonth();
  const lastMonth = (thisMonth + 11) % 12;
  const totalThisMonth = 0;
  const totalLastMonth = 0;
  const openActive = 0;
  const closedThisMonth = 0;
  const closedLastMonth = 0;
  const downAvoidHours = 0;
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

  // Donut data: ticket distribution by area
  const donutData = useMemo(() => {
    return areas.map(a => ({
      name: a,
      value: 0
    }));
  }, [areas]);

  // Mini table data based on selected donut segment
  const selectedAreaTickets = useMemo(() => {
    if (!selectedArea) return [] as Array<{ machine: string; title: string; images: string[]; risk: 'high'|'medium'|'low'; status: 'open'|'closed' }>; 
  }, [selectedArea, year, ticketStatus, riskLevel]);

  // Reset row selection when area changes or list changes
  useEffect(() => {
    setSelectedRow(selectedAreaTickets.length ? 0 : null);
  }, [selectedArea, selectedAreaTickets.length]);

  // Horizontal bar for assignees by period
  const assignees: string[] = [];
  const assigneeData = useMemo(() => {
    return assignees.map(u => ({
      user: u,
      count: 0
    }));
  }, [assignees]);

  // Colors aligned to theme (muted minimal palette)
  const colors = {
    open: '#3b82f6',
    closed: '#22c55e',
    pie: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'],
    grid: '#e5e7eb',
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Tickets (This Month)</div>
            <div className="text-2xl font-semibold mt-1">{totalThisMonth}</div>
            <div className="text-xs mt-1">
              <span className={pct(totalThisMonth, totalLastMonth) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pct(totalThisMonth, totalLastMonth) >= 0 ? '+' : ''}{pct(totalThisMonth, totalLastMonth)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Open Tickets (Active)</div>
            <div className="text-2xl font-semibold mt-1">{openActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Closed Tickets (This Month)</div>
            <div className="text-2xl font-semibold mt-1">{closedThisMonth}</div>
            <div className="text-xs mt-1">
              <span className={pct(closedThisMonth, closedLastMonth) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {pct(closedThisMonth, closedLastMonth) >= 0 ? '+' : ''}{pct(closedThisMonth, closedLastMonth)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Downtime Avoidance</div>
            <div className="text-2xl font-semibold mt-1">{downAvoidHours} h</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters for charts */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bar Chart: Open vs Closed by Period (P1..P52) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Tickets by Period (Weekly)</CardTitle></CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="period" hide interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="open" name="Open" fill={colors.open} radius={[2, 2, 0, 0]} />
              <Bar dataKey="closed" name="Closed" fill={colors.closed} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Donut + Mini table + Images */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ticket Distribution by Area</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Select value={ticketStatus} onValueChange={setTicketStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  onClick={(d) => setSelectedArea((d && (d as any).name) || null)}
                >
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={colors.pie[idx % colors.pie.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Details {selectedArea ? `- ${selectedArea}` : ''}</CardTitle></CardHeader>
          <CardContent className="max-h-[320px] overflow-auto">
            {selectedArea ? (
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Machine</th>
                    <th className="px-3 py-2">Issue</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAreaTickets.map((t, i) => {
                    const isSel = selectedRow === i;
                    const riskColor = t.risk === 'high' ? 'bg-red-100 text-red-800' : t.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                    const statusColor = t.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
                    return (
                      <tr
                        key={i}
                        className={`border-t cursor-pointer ${isSel ? 'bg-accent' : 'hover:bg-hover/50'}`}
                        onClick={() => setSelectedRow(i)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{t.machine}</td>
                        <td className="px-3 py-2">{t.title}</td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs px-2 py-0.5 rounded ${riskColor}`}>{t.risk}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs px-2 py-0.5 rounded ${statusColor}`}>{t.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-muted-foreground">Select a segment in the donut chart to see details.</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Images</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 max-h-[320px] overflow-auto">
            {selectedArea && selectedAreaTickets.length > 0 && selectedRow !== null ? (
              selectedAreaTickets[selectedRow].images.map((src, i) => (
                <img key={i} src={src} alt="ticket" className="w-full h-28 object-cover rounded" />
              ))
            ) : (
              <div className="text-sm text-muted-foreground col-span-2">No image selected</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horizontal bar: top assignees by count, filter by period/year */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Top Assignees by Period</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Period" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assigneeData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="user" width={100} />
              <Tooltip />
              <Bar dataKey="count" name="Tickets" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
