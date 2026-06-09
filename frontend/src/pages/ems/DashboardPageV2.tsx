import React, { useCallback, useEffect, useState } from 'react';
import { startOfMonth } from 'date-fns';

import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsKpiData } from '@/services/emsService';
import DashboardTimeTravelBar from '@/components/ems/dashboard/DashboardTimeTravelBar';
import {
  createDashboardTimeTravelValue,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
import DashboardKpiCards from '@/components/ems/dashboard/DashboardKpiCards';
import PlantPerformanceMatrix from '@/components/ems/dashboard/PlantPerformanceMatrix';
import DashboardMasterCalendar from '@/components/ems/dashboard/DashboardMasterCalendar';
import { EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const DashboardPageV2: React.FC = () => {
  const { t } = useLanguage();
  const [timeTravel, setTimeTravel] = useState<DashboardTimeTravelValue>(() =>
    createDashboardTimeTravelValue()
  );
  const [kpi, setKpi] = useState<EmsKpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);
    setKpiError(null);

    emsService
      .getDashboardKpi()
      .then((data) => {
        if (!cancelled) setKpi(data);
      })
      .catch((e) => {
        if (!cancelled) setKpiError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleTimeChange = useCallback((date: Date) => {
    setTimeTravel(createDashboardTimeTravelValue(date));
  }, []);

  const handleReturnToPresent = useCallback(() => {
    setTimeTravel(createDashboardTimeTravelValue(new Date()));
  }, []);

  return (
    <EmsPageStack>
      <DashboardTimeTravelBar
        value={timeTravel}
        onChange={handleTimeChange}
        onReturnToPresent={handleReturnToPresent}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneA')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('ems.dashboard.v2.zoneADesc')}</p>
        </div>
        {kpiError && <p className="text-sm text-destructive">{kpiError}</p>}
        <DashboardKpiCards data={kpi} loading={kpiLoading} />
      </section>

      <PlantPerformanceMatrix year={timeTravel.year} month={timeTravel.month} />

      <DashboardMasterCalendar selectedMonth={startOfMonth(timeTravel.selectedMonth)} />
    </EmsPageStack>
  );
};

export default DashboardPageV2;
