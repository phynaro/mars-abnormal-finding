import React from "react";
import PersonalKPITiles from "./PersonalKPITiles";
import PersonalTicketCountChart from "./PersonalTicketCountChart";
import PersonalFinishedTicketChart from "./PersonalFinishedTicketChart";

export type PersonalKPISectionProps = {
  personalTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalTicketLoading: boolean;
  personalTicketError: string | null;
  personalFinishedTicketData: Array<{ period: string; tickets: number; target: number }>;
  personalFinishedTicketLoading: boolean;
  personalFinishedTicketError: string | null;
  personalKPIData: any;
  personalKPILoading: boolean;
  personalKPIError: string | null;
  selectedYear: number;
  onKpiSetupClick: (type: "report" | "fix") => void;
};

const PersonalKPISection: React.FC<PersonalKPISectionProps> = ({
  personalTicketData,
  personalTicketLoading,
  personalTicketError,
  personalFinishedTicketData,
  personalFinishedTicketLoading,
  personalFinishedTicketError,
  personalKPIData,
  personalKPILoading,
  personalKPIError,
  selectedYear,
  onKpiSetupClick,
}) => (
  <div className="space-y-4">
    <PersonalKPITiles
      kpiData={personalKPIData}
      loading={personalKPILoading}
      error={personalKPIError}
    />
    <PersonalTicketCountChart
      data={personalTicketData}
      loading={personalTicketLoading}
      error={personalTicketError}
      onKpiSetupClick={() => onKpiSetupClick("report")}
      selectedYear={selectedYear}
    />
    <PersonalFinishedTicketChart
      data={personalFinishedTicketData}
      loading={personalFinishedTicketLoading}
      error={personalFinishedTicketError}
      onKpiSetupClick={() => onKpiSetupClick("fix")}
      selectedYear={selectedYear}
    />
  </div>
);

export default PersonalKPISection;
