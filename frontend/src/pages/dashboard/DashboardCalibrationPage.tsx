import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import workorderVolumeService from '@/services/dashboard/workorderVolumeService';
import CalibrationPersonYearChart from '@/components/dashboard/calibration/CalibrationPersonYearChart';
import CalibrationIncomingList from '@/components/dashboard/calibration/CalibrationIncomingList';
import CalibrationLateNotification from '@/components/dashboard/calibration/CalibrationLateNotification';
import CalibrationDueSoonNotification from '@/components/dashboard/calibration/CalibrationDueSoonNotification';
import CalibrationOverdueNotification from '@/components/dashboard/calibration/CalibrationOverdueNotification';
import CalibrationJobList from '@/components/dashboard/calibration/CalibrationJobList';
import CalibrationPMPlanList from '@/components/dashboard/calibration/CalibrationPMPlanList';

const DashboardCalibrationPage: React.FC = () => {
  const { t } = useLanguage();
  const [companyYear, setCompanyYear] = useState<number | null>(null);
  const [yearOptions, setYearOptions] = useState<number[]>([]);

  useEffect(() => {
    workorderVolumeService
      .getCurrentCompanyYear()
      .then((res) => {
        const y = res?.data?.currentCompanyYear ?? new Date().getFullYear();
        setCompanyYear(y);
        setYearOptions(Array.from({ length: 10 }, (_, i) => y - i));
      })
      .catch(() => {
        const y = new Date().getFullYear();
        setCompanyYear(y);
        setYearOptions(Array.from({ length: 10 }, (_, i) => y - i));
      });
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={t('dashboard.calibration.title')}
        description={t('dashboard.calibration.description')}
      />

      {/* 1. Per-person year overview */}
      <section className="space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">{t('dashboard.calibration.personYearOverview')}</h2>
          {companyYear != null && (
            <Select
              value={String(companyYear)}
              onValueChange={(v) => setCompanyYear(parseInt(v, 10))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <CalibrationPersonYearChart companyYear={companyYear ?? undefined} />
      </section>

      {/* 2. Monitoring buckets (priority order): Overdue → Late (grace) → Due this week → Due soon; filtered by top year */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CalibrationOverdueNotification companyYear={companyYear ?? undefined} />
        <CalibrationLateNotification companyYear={companyYear ?? undefined} />
        <CalibrationIncomingList companyYear={companyYear ?? undefined} />
        <CalibrationDueSoonNotification companyYear={companyYear ?? undefined} />
      </div>

      {/* 5. Calibration job list (filterable, link to WO detail) */}
      <section>
        <CalibrationJobList />
      </section>

      {/* 6. PM plan list with frequency */}
      <section>
        <CalibrationPMPlanList />
      </section>
    </div>
  );
};

export default DashboardCalibrationPage;
