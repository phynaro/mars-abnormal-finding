import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPeriodDateRange } from "@/utils/periodCalculations";
import type { DepartmentUserKPIUserData } from "@/types/departmentUserKPI";

export type UserKPICardProps = {
  user: DepartmentUserKPIUserData;
  selectedYear: number;
  kpiType: 'created' | 'assigned' | 'closure';
};

const UserKPICard: React.FC<UserKPICardProps> = ({
  user,
  selectedYear,
  kpiType,
}) => {
  const { t } = useLanguage();

  const isClosure = kpiType === 'closure';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const period = dataPoint.period;
      const periodNumber = parseInt(period.replace("P", ""), 10);
      const { startDate, endDate } = getPeriodDateRange(selectedYear, periodNumber);
      const dateRange = {
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
      };

      if (isClosure) {
        const onTime = dataPoint.onTime ?? 0;
        const closedLate = dataPoint.closedLate ?? 0;
        const open = dataPoint.open ?? 0;
        const total = dataPoint.total ?? 0;
        const ratePct = Number(dataPoint.tickets ?? 0);
        const targetPct = Number(dataPoint.target ?? 0);
        return (
          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <p className="font-medium text-foreground">{period}</p>
            <p className="text-sm text-muted-foreground mb-2">
              {`${dateRange.startDate} - ${dateRange.endDate}`}
            </p>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="text-success font-medium">{t("homepage.closedOnTime")}:</span> {onTime}
              </p>
              <p className="text-sm">
                <span className="text-destructive font-medium">{t("homepage.closedLate")}:</span> {closedLate}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground font-medium">{t("homepage.open")}:</span> {open}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t("homepage.totalAssigned")}:</span> {total}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t("dashboard.departmentUserKPI.closureRate")}:</span> {ratePct.toFixed(1)}%
              </p>
              <p className="text-sm">
                <span className="text-destructive font-medium">{t("dashboard.departmentUserKPI.target")}:</span> {targetPct.toFixed(1)}%
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{period}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {`${dateRange.startDate} - ${dateRange.endDate}`}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-brand font-medium">
                {kpiType === 'created'
                  ? t("dashboard.departmentUserKPI.ticketsCreated")
                  : t("dashboard.departmentUserKPI.ticketsAssigned")}:
              </span>{" "}
              {dataPoint.tickets}
            </p>
            <p className="text-sm">
              <span className="text-destructive font-medium">{t("dashboard.departmentUserKPI.target")}:</span>{" "}
              {dataPoint.target}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Sort periods numerically (P1, P2, ..., P13) instead of alphabetically
  const sortedPeriods = [...user.periods].sort((a, b) => {
    const aNum = parseInt(a.period.replace("P", ""), 10);
    const bNum = parseInt(b.period.replace("P", ""), 10);
    return aNum - bNum;
  });

  // For closure: build chart data with onTime, closedLate, open; use stacked bar + line with dual Y-axis
  const closureChartData = isClosure
    ? sortedPeriods.map((p) => {
        const onTime = p.on_time_count ?? 0;
        const closedLate = p.closed_late_count ?? 0;
        const total = p.total ?? 0;
        const open = Math.max(0, total - onTime - closedLate);
        return {
          period: p.period,
          tickets: p.tickets,
          target: p.target,
          total,
          onTime,
          closedLate,
          open,
          ratePct: Number(p.tickets ?? 0),
          targetPct: Number(p.target ?? 0),
        };
      })
    : null;

  const chartData = isClosure ? closureChartData : sortedPeriods;
  const maxCount = isClosure && chartData.length > 0
    ? Math.max(...chartData.map((d: { total?: number }) => d.total ?? 0), 1)
    : 1;

  const totalTickets = user.periods.reduce((sum, period) => sum + period.tickets, 0);
  const totalTarget = user.periods.reduce((sum, period) => sum + period.target, 0);
  const avgPerPeriod = isClosure ? totalTickets / 13 : totalTickets / 13;
  const targetAchievement = totalTarget > 0 ? (totalTickets / totalTarget) * 100 : 0;

  return (
    <Card className="h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          <span className="truncate">{user.personName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chart */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                fontSize={10}
                tick={{ fontSize: 10 }}
              />
              {isClosure ? (
                <>
                  <YAxis yAxisId="left" fontSize={10} tick={{ fontSize: 10 }} domain={[0, maxCount]} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" fontSize={10} tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                
                  <Legend />
                  <Bar yAxisId="left" dataKey="onTime" stackId="closure" fill="hsl(var(--success))" name={t("homepage.closedOnTime")} radius={[2, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="closedLate" stackId="closure" fill="hsl(var(--destructive))" name={t("homepage.closedLate")} radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="open" stackId="closure" fill="hsl(var(--muted-foreground))" name={t("homepage.open")} radius={[0, 2, 2, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="ratePct" stroke="hsl(var(--primary))" strokeWidth={2} name={t("dashboard.departmentUserKPI.closureRate")} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="targetPct" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" name={t("dashboard.departmentUserKPI.target")} dot={false} />
                  <Tooltip content={<CustomTooltip />} />
                </>
              ) : (
                <>
                  <YAxis fontSize={10} tick={{ fontSize: 10 }} domain={undefined} tickFormatter={undefined} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" name={kpiType === 'created' ? t("dashboard.departmentUserKPI.ticketsCreated") : t("dashboard.departmentUserKPI.ticketsAssigned")} radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" strokeWidth={2} name={t("dashboard.departmentUserKPI.target")} dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        {/* <div className="grid grid-cols-2 gap-2 text-xs ml-10">
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {isClosure ? t("dashboard.departmentUserKPI.avgClosureRate") : t("dashboard.departmentUserKPI.totalTickets")}:
            </span>
            <span className="font-medium">{isClosure ? `${avgPerPeriod.toFixed(1)}%` : totalTickets}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{t("dashboard.departmentUserKPI.avgPerPeriod")}:</span>
            <span className="font-medium">{isClosure ? `${avgPerPeriod.toFixed(1)}%` : avgPerPeriod.toFixed(1)}</span>
          </div>
          <div className="col-span-2 flex items-center space-x-1">
            <span className="text-muted-foreground">{t("dashboard.departmentUserKPI.targetAchievement")}:</span>
            <span className={`font-medium ${targetAchievement >= 100 ? 'text-green-600' : targetAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {targetAchievement.toFixed(1)}%
            </span>
          </div>
        </div> */}
      </CardContent>
    </Card>
  );
};

export default UserKPICard;
