import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { AlertTriangle, Loader2 } from 'lucide-react';
import hierarchyService from '@/services/hierarchyService';
import problemDictionaryService, {
  type RepeatProblemItem,
  type RepeatProblemsResponse,
} from '@/services/problemDictionaryService';
import { useLanguage } from '@/contexts/LanguageContext';
import { openRepeatProblemTicketList } from '@/utils/repeatProblemDrilldown';

const MONTH_KEYS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const CHART_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#ea580c', '#4f46e5', '#db2777', '#0f766e',
];

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  fontSize: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  opacity: 1,
};

const formatProblemLabel = (item: RepeatProblemItem) => {
  const pos = item.pucode || `PU ${item.puno}`;
  return `${pos} · ${item.partCode} · ${item.symptomCode}`;
};

const RepeatProblemDashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [plant, setPlant] = useState<string>('all');
  const [plants, setPlants] = useState<Array<{ code: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RepeatProblemsResponse['data'] | null>(null);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= 2025; y -= 1) years.push(y);
    return years;
  }, [currentYear]);

  useEffect(() => {
    hierarchyService
      .getDistinctPlants()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setPlants(res.data);
      })
      .catch(() => setPlants([]));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await problemDictionaryService.getRepeatProblems({
        year,
        plant: plant === 'all' ? undefined : plant,
      });
      setPayload(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [year, plant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const topProblems = payload?.topProblems || [];
  const summary = payload?.summary;

  const lineData = useMemo(() => {
    return MONTH_KEYS.map((label, index) => {
      const point: Record<string, string | number> = { month: label };
      topProblems.forEach((item, seriesIndex) => {
        point[`s${seriesIndex}`] = item.monthly[index] || 0;
      });
      return point;
    });
  }, [topProblems]);

  const barData = useMemo(
    () =>
      topProblems.map((item, index) => ({
        name: formatProblemLabel(item),
        tickets: item.ticketCount,
        index,
        puno: item.puno,
        partCode: item.partCode,
        symptomCode: item.symptomCode,
      })),
    [topProblems],
  );

  const leading = topProblems[0];

  const openProblemTickets = (item: RepeatProblemItem, month?: number) => {
    openRepeatProblemTicketList({
      puno: item.puno,
      partCode: item.partCode,
      symptomCode: item.symptomCode,
      year,
      month,
      plant: plant === 'all' ? undefined : plant,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('dashboard.repeatProblems.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.repeatProblems.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5 min-w-[140px]">
            <Label>{t('dashboard.repeatProblems.plant')}</Label>
            <Select value={plant} onValueChange={setPlant}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.repeatProblems.allPlants')}</SelectItem>
                {plants.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.name || p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[120px]">
            <Label>{t('dashboard.repeatProblems.year')}</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </div>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-2 pt-6 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {!loading && !error && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.repeatProblems.highestRepeat')}</CardDescription>
                <CardTitle className="text-3xl">{summary.topRepeatTickets}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.repeatProblems.repeatingProblems')}</CardDescription>
                <CardTitle className="text-3xl">{summary.repeatingProblems}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.repeatProblems.ticketsInRepeats')}</CardDescription>
                <CardTitle className="text-3xl">{summary.ticketsInRepeats}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('dashboard.repeatProblems.distinctProblems')}</CardDescription>
                <CardTitle className="text-3xl">{summary.distinctProblems}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {leading && (
            <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-base">
                  {t('dashboard.repeatProblems.leadingTitle')}
                </CardTitle>
                <CardDescription>
                  {leading.puname || leading.pucode} — {leading.partCode} / {leading.symptomCode}:{' '}
                  {leading.ticketCount} {t('dashboard.repeatProblems.tickets')}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.repeatProblems.monthlyTrend')}</CardTitle>
              <CardDescription>
                {t('dashboard.repeatProblems.monthlyTrendHint')} ({year}).{' '}
                {t('dashboard.repeatProblems.drilldownHint')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProblems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.repeatProblems.empty')}</p>
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip
                          contentStyle={TOOLTIP_STYLE}
                          wrapperStyle={{ outline: 'none', zIndex: 20 }}
                          itemSorter={(item) => -Number(item.value ?? 0)}
                        />
                        {topProblems.map((item, index) => (
                          <Line
                            key={formatProblemLabel(item)}
                            type="monotone"
                            dataKey={`s${index}`}
                            name={formatProblemLabel(item)}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3, cursor: 'pointer' }}
                            activeDot={{
                              r: 6,
                              cursor: 'pointer',
                              onClick: (dotProps: { payload?: { month?: string } }) => {
                                const monthLabel = dotProps?.payload?.month;
                                const monthIndex = MONTH_KEYS.indexOf(
                                  monthLabel as (typeof MONTH_KEYS)[number],
                                );
                                if (monthIndex < 0) return;
                                const count = item.monthly[monthIndex] || 0;
                                if (count <= 0) return;
                                openProblemTickets(item, monthIndex + 1);
                              },
                            }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {topProblems.map((item, index) => (
                      <button
                        key={formatProblemLabel(item)}
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground hover:underline"
                        onClick={() => openProblemTickets(item)}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="truncate max-w-[220px]">{formatProblemLabel(item)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.repeatProblems.ranked')}</CardTitle>
              <CardDescription>{t('dashboard.repeatProblems.drilldownHint')}</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {barData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.repeatProblems.empty')}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={TOOLTIP_STYLE}
                      wrapperStyle={{ outline: 'none', zIndex: 20 }}
                    />
                    <Bar
                      dataKey="tickets"
                      fill="#2563eb"
                      name={t('dashboard.repeatProblems.tickets')}
                      cursor="pointer"
                      onClick={(data: { payload?: { index?: number }; index?: number }) => {
                        const row = data?.payload ?? data;
                        const item = topProblems[row?.index ?? -1];
                        if (item) openProblemTickets(item);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.repeatProblems.tableTitle')}</CardTitle>
              <CardDescription>{t('dashboard.repeatProblems.drilldownHint')}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">{t('dashboard.repeatProblems.position')}</th>
                    <th className="py-2 pr-3">{t('dashboard.repeatProblems.problem')}</th>
                    <th className="py-2 pr-3 text-right">{t('dashboard.repeatProblems.tickets')}</th>
                    <th className="py-2 pr-3">{t('dashboard.repeatProblems.span')}</th>
                    <th className="py-2">{t('dashboard.repeatProblems.peak')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topProblems.map((item, index) => (
                    <tr
                      key={`${item.puno}-${item.partCode}-${item.symptomCode}`}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                      onClick={() => openProblemTickets(item)}
                      title={t('dashboard.repeatProblems.openTickets')}
                    >
                      <td className="py-2 pr-3">{index + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{item.puname || item.pucode || item.puno}</div>
                        <div className="text-xs text-muted-foreground">{item.pucode}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {item.partCode} / {item.symptomCode}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-primary underline-offset-2 hover:underline">
                        {item.ticketCount}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {item.firstSeen ? new Date(item.firstSeen).toLocaleDateString() : '—'}
                        {' – '}
                        {item.lastSeen ? new Date(item.lastSeen).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 text-xs">
                        <button
                          type="button"
                          className="hover:underline text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProblemTickets(item, item.peakMonth);
                          }}
                        >
                          {MONTH_KEYS[item.peakMonth - 1]} ({item.peakCount})
                        </button>
                      </td>
                    </tr>
                  ))}
                  {topProblems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        {t('dashboard.repeatProblems.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
};

export default RepeatProblemDashboardPage;
