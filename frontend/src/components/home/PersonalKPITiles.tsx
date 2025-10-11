import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type PersonalKPITilesProps = {
  kpiData: any;
  loading: boolean;
  error: string | null;
};

const formatCurrencyDynamic = (
  amount: number,
): { display: string; tooltip: string } => {
  const tooltip = `฿${amount.toLocaleString("en-US")} THB`;

  if (amount >= 1_000_000) {
    return {
      display: `฿${(amount / 1_000_000).toFixed(1)}M`,
      tooltip,
    };
  }

  if (amount >= 1_000) {
    return {
      display: `฿${(amount / 1_000).toFixed(1)}K`,
      tooltip,
    };
  }

  return {
    display: `฿${amount.toFixed(0)}`,
    tooltip,
  };
};

const PersonalKPITiles: React.FC<PersonalKPITilesProps> = ({
  kpiData,
  loading,
  error,
}) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-brand" />
            {t("homepage.asReporter")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`reporter-skeleton-${index}`}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-success" />
            {t("homepage.asActionPerson")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`action-skeleton-${index}`}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-red-600">
            <p className="font-medium">{t("homepage.errorLoadingKPIData")}</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpiData) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <p>{t("homepage.noKPIDataAvailable")}</p>
            <p className="text-sm">{t("homepage.loadingPersonalMetrics")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userRole, reporterMetrics, actionPersonMetrics, summary } = kpiData;

  const reporterTiles = [
    {
      title: t("homepage.myReportsCreated"),
      value: reporterMetrics.totalReportsThisPeriod,
      change: summary.reporterComparisonMetrics.reportGrowthRate.percentage,
      changeDescription:
        summary.reporterComparisonMetrics.reportGrowthRate.description,
      changeType: summary.reporterComparisonMetrics.reportGrowthRate.type,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-brand",
    },
    {
      title: t("homepage.downtimeAvoidedByMyReports"),
      value: `${reporterMetrics.downtimeAvoidedByReportsThisPeriod.toFixed(
        1,
      )} hrs`,
      change:
        summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth
          .percentage,
      changeDescription:
        summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth
          .description,
      changeType:
        summary.reporterComparisonMetrics.downtimeAvoidedByReportsGrowth.type,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-accent",
    },
    {
      title: t("homepage.costAvoidedByMyReports"),
      value: formatCurrencyDynamic(
        reporterMetrics.costAvoidedByReportsThisPeriod,
      ).display,
      tooltip: formatCurrencyDynamic(
        reporterMetrics.costAvoidedByReportsThisPeriod,
      ).tooltip,
      change:
        summary.reporterComparisonMetrics.costAvoidedByReportsGrowth
          .percentage,
      changeDescription:
        summary.reporterComparisonMetrics.costAvoidedByReportsGrowth
          .description,
      changeType:
        summary.reporterComparisonMetrics.costAvoidedByReportsGrowth.type,
      icon: <DollarSign className="h-4 w-4" />,
      color: "text-info",
    },
  ];

  const actionPersonTiles = actionPersonMetrics
    ? [
        {
          title: t("homepage.casesIFixed"),
          value: actionPersonMetrics.totalCasesFixedThisPeriod,
          change:
            summary.actionPersonComparisonMetrics.casesFixedGrowthRate
              .percentage,
          changeDescription:
            summary.actionPersonComparisonMetrics.casesFixedGrowthRate
              .description,
          changeType:
            summary.actionPersonComparisonMetrics.casesFixedGrowthRate.type,
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-success",
        },
        {
          title: t("homepage.downtimeIFixed"),
          value: `${actionPersonMetrics.downtimeAvoidedByFixesThisPeriod.toFixed(
            1,
          )} hrs`,
          change:
            summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth
              .percentage,
          changeDescription:
            summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth
              .description,
          changeType:
            summary.actionPersonComparisonMetrics.downtimeAvoidedByFixesGrowth
              .type,
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-accent",
        },
        {
          title: t("homepage.costIFixed"),
          value: formatCurrencyDynamic(
            actionPersonMetrics.costAvoidedByFixesThisPeriod,
          ).display,
          tooltip: formatCurrencyDynamic(
            actionPersonMetrics.costAvoidedByFixesThisPeriod,
          ).tooltip,
          change:
            summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth
              .percentage,
          changeDescription:
            summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth
              .description,
          changeType:
            summary.actionPersonComparisonMetrics.costAvoidedByFixesGrowth.type,
          icon: <DollarSign className="h-4 w-4" />,
          color: "text-info",
        },
      ]
    : [];

  const renderKpiTile = (kpi: any, index: number) => (
    <Card key={`${kpi.title}-${index}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </p>
            {kpi.tooltip ? (
              <p
                className="text-2xl font-bold cursor-help"
                title={kpi.tooltip}
              >
                {kpi.value}
              </p>
            ) : (
              <p className="text-2xl font-bold">{kpi.value}</p>
            )}
            {kpi.change !== undefined && (
              <div className="flex items-center mt-1">
                {kpi.changeType === "increase" ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : kpi.changeType === "decrease" ? (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <div className="h-3 w-3 bg-muted rounded-full mr-1" />
                )}
                <span
                  className={`text-xs ${
                    kpi.changeType === "increase"
                      ? "text-green-500"
                      : kpi.changeType === "decrease"
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {kpi.changeType === "no_change"
                    ? t("homepage.noChange")
                    : `${Math.abs(kpi.change).toFixed(1)}%`}
                </span>
              </div>
            )}
            {kpi.changeDescription && (
              <div className="text-xs text-muted-foreground mt-1">
                {kpi.changeDescription}
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
            {kpi.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-brand" />
          {t("homepage.asReporter")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reporterTiles.map((kpi, index) => renderKpiTile(kpi, index))}
        </div>
      </div>
      {userRole === "L2+" && actionPersonTiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-success" />
            {t("homepage.asActionPerson")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionPersonTiles.map((kpi, index) => renderKpiTile(kpi, index))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalKPITiles;
