import React, { useCallback, useState } from 'react';

import DashboardTimeTravelBar from '@/components/ems/dashboard/DashboardTimeTravelBar';
import DashboardWoPeriodChart from '@/components/ems/dashboard/DashboardWoPeriodChart';
import {
  createDashboardTimeTravelValue,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import PlantPerformanceMatrix from '@/components/ems/dashboard/PlantPerformanceMatrix';
import DashboardMasterCalendar from '@/components/ems/dashboard/DashboardMasterCalendar';
import { EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const DashboardPageV2: React.FC = () => {
  const [timeTravel, setTimeTravel] = useState<DashboardTimeTravelValue>(() =>
    createDashboardTimeTravelValue()
  );

  const handleTimeChange = useCallback((next: DashboardTimeTravelValue) => {
    setTimeTravel(next);
  }, []);

  const handleReturnToPresent = useCallback(() => {
    setTimeTravel(createDashboardTimeTravelValue());
  }, []);

  return (
    <EmsPageStack>
      <DashboardTimeTravelBar
        value={timeTravel}
        onChange={handleTimeChange}
        onReturnToPresent={handleReturnToPresent}
      />

      {timeTravel.mode === 'year' && <DashboardWoPeriodChart timeTravel={timeTravel} />}

      <PlantPerformanceMatrix timeTravel={timeTravel} />

      <DashboardMasterCalendar timeTravel={timeTravel} />
    </EmsPageStack>
  );
};

export default DashboardPageV2;
