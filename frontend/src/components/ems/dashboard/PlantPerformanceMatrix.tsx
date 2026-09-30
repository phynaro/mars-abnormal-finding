import React, { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsKpiData } from '@/services/emsService';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';

import PlantPerformanceTable from './PlantPerformanceTable';

function emptyKpiByPlant(): Record<string, EmsKpiData> {
  return Object.fromEntries(
    PM_CALIBRATION_PLANT_OPTIONS.map((p) => [
      p.code,
      {
        totalEquipment: 0,
        overdue: 0,
        overdueNoWo: 0,
        dueThisWeek: 0,
        dueThisWeekNoWo: 0,
        dueSoon: 0,
        dueSoonNoWo: 0,
        ok: 0,
        noWo: 0,
      },
    ])
  );
}

const PlantPerformanceMatrix: React.FC = () => {
  const { t } = useLanguage();
  const [kpiByPlant, setKpiByPlant] = useState<Record<string, EmsKpiData>>(emptyKpiByPlant);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    emsService
      .getDashboardKpiByPlant()
      .then((kpiPlants) => {
        if (cancelled) return;
        setKpiByPlant(kpiPlants);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setKpiByPlant(emptyKpiByPlant());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneA')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('ems.dashboard.v2.zoneADesc')}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      ) : (
        <PlantPerformanceTable kpiByPlant={kpiByPlant} kpiLoading={loading} />
      )}
    </section>
  );
};

export default PlantPerformanceMatrix;
