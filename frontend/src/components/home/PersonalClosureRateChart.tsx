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
import { Button } from "@/components/ui/button";
import { BarChart3, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPeriodDateRange } from "@/utils/periodCalculations";

export type PersonalClosureRateChartProps = {
  data: Array<{ period: string; rate: number; target?: number }>;
  loading: boolean;
  error: string | null;
  onKpiSetupClick: () => void;
  selectedYear: number;
};

const PersonalClosureRateChart: React.FC<PersonalClosureRateChartProps> = ({
  data,
  loading,
  error,
  onKpiSetupClick,
  selectedYear,
}) => {
  const { t } = useLanguage();

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

      const ratePct = typeof dataPoint.rate === "number" ? (dataPoint.rate <= 1 ? dataPoint.rate * 100 : dataPoint.rate) : 0;
      const targetPct = typeof dataPoint.target === "number" ? (dataPoint.target <= 1 ? dataPoint.target * 100 : dataPoint.target) : null;

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{period}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {`${dateRange.startDate} - ${dateRange.endDate}`}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-success font-medium">
                {t("homepage.closureRate")}:
              </span>{" "}
              {ratePct.toFixed(1)}%
            </p>
            {targetPct != null && (
              <p className="text-sm">
                <span className="text-destructive font-medium">{t("homepage.target")}:</span>{" "}
                {targetPct.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = data.map((d) => ({
    ...d,
    ratePct: typeof d.rate === "number" ? (d.rate <= 1 ? d.rate * 100 : d.rate) : 0,
    targetPct: typeof d.target === "number" ? (d.target <= 1 ? d.target * 100 : d.target) : undefined,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{t("homepage.myClosureRatePerPeriod")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onKpiSetupClick}
            className="flex items-center space-x-1"
          >
            <Settings className="h-4 w-4" />
            <span>{t("homepage.setupKPI")}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-red-600">
            <div className="text-center">
              <p className="font-medium">
                {t("homepage.errorLoadingChartData")}
              </p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="ratePct"
                fill="hsl(var(--accent))"
                name={t("homepage.closureRate")}
              />
              <Line
                type="monotone"
                dataKey="targetPct"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name={t("homepage.target")}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("homepage.noClosureRateData")}</p>
              <p className="text-sm">{t("homepage.closeTicketsOnTime")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalClosureRateChart;
