import React from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import ScheduleCalendarPanel from '@/components/ems/schedule/ScheduleCalendarPanel';
import { EmsContentCard } from '@/components/ems/shared/emsLayoutPrimitives';

interface Props {
  selectedMonth: Date;
}

const DashboardMasterCalendar: React.FC<Props> = ({ selectedMonth }) => {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneC')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('ems.dashboard.v2.masterCalendar')}</p>
      </div>
      <EmsContentCard>
        <div className="p-4 sm:p-6">
          <ScheduleCalendarPanel
            anchorDate={selectedMonth}
            controlledMonth
            showHeader={false}
          />
        </div>
      </EmsContentCard>
    </section>
  );
};

export default DashboardMasterCalendar;
