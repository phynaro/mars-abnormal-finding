import React from "react";
import PersonalKPITiles from "./PersonalKPITiles";
import PersonalTicketCountChart from "./PersonalTicketCountChart";
import PersonalClosureRateChart from "./PersonalClosureRateChart";

export type PersonalKPISectionProps = {
  personalTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalTicketLoading: boolean;
  personalTicketError: string | null;
  personalClosureRateData: Array<{ period: string; rate: number; target?: number }>;
  personalClosureRateLoading: boolean;
  personalClosureRateError: string | null;
  personalKPIData: any;
  personalKPILoading: boolean;
  personalKPIError: string | null;
  selectedYear: number;
  onKpiSetupClick: (type: "report" | "closure") => void;
  dateRange?: { startDate: string; endDate: string };
  userId?: number;
};

const PersonalKPISection: React.FC<PersonalKPISectionProps> = ({
  personalTicketData,
  personalTicketLoading,
  personalTicketError,
  personalClosureRateData,
  personalClosureRateLoading,
  personalClosureRateError,
  personalKPIData,
  personalKPILoading,
  personalKPIError,
  selectedYear,
  onKpiSetupClick,
  dateRange,
  userId,
}) => (
  <div className="space-y-4">
    <PersonalKPITiles
      kpiData={personalKPIData}
      loading={personalKPILoading}
      error={personalKPIError}
      dateRange={dateRange}
      userId={userId}
    />
    {/* Charts section - side by side on large screens, stacked on smaller screens */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PersonalTicketCountChart
        data={personalTicketData}
        loading={personalTicketLoading}
        error={personalTicketError}
        onKpiSetupClick={() => onKpiSetupClick("report")}
        selectedYear={selectedYear}
      />
      <PersonalClosureRateChart
        data={personalClosureRateData}
        loading={personalClosureRateLoading}
        error={personalClosureRateError}
        onKpiSetupClick={() => onKpiSetupClick("closure")}
        selectedYear={selectedYear}
      />
    </div>
  </div>
);

export default PersonalKPISection;
