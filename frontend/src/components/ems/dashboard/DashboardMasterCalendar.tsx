import React, { useMemo } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import ScheduleCalendarPanel from '@/components/ems/schedule/ScheduleCalendarPanel';
import { EmsContentCard } from '@/components/ems/shared/emsLayoutPrimitives';
import {
  formatTimeTravelSelectionLabel,
  getTimeTravelAnchorDate,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';

interface Props {
  timeTravel: DashboardTimeTravelValue;
}

const DashboardMasterCalendar: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const anchorTime = useMemo(
    () => getTimeTravelAnchorDate(timeTravel).getTime(),
    [timeTravel.mode, timeTravel.month, timeTravel.period, timeTravel.year]
  );
  const anchorDate = useMemo(() => new Date(anchorTime), [anchorTime]);
  const rangeLabel = formatTimeTravelSelectionLabel(timeTravel, t);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneC')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('ems.dashboard.v2.masterCalendarForRange', { label: rangeLabel })}
        </p>
      </div>
      <EmsContentCard>
        <div className="p-4 sm:p-6">
          <ScheduleCalendarPanel
            anchorDate={anchorDate}
            controlledMonth={timeTravel.mode === 'month'}
            showHeader={false}
          />
        </div>
      </EmsContentCard>
    </section>
  );
};

export default DashboardMasterCalendar;
