import React, { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsKpiData, type EmsPlantMatrixItem } from '@/services/emsService';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';
import {
  formatTimeTravelSelectionLabel,
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';

import PlantPerformanceTable from './PlantPerformanceTable';

interface Props {
  timeTravel: DashboardTimeTravelValue;
}

function emptyPlants(): EmsPlantMatrixItem[] {
  return PM_CALIBRATION_PLANT_OPTIONS.map((p) => ({
    plant: p.code,
    plantLabel: p.label,
    total: 0,
    done: 0,
    overdue: 0,
    inProgress: 0,
    noWo: 0,
    wo_postpone: 0,
    completionRate: 0,
  }));
}

const PlantPerformanceMatrix: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const [plants, setPlants] = useState<EmsPlantMatrixItem[]>(emptyPlants);
  const [kpiByPlant, setKpiByPlant] = useState<Record<string, EmsKpiData>>({});
  const [loading, setLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateRange = getTimeTravelDateRange(timeTravel);
  const rangeLabel = formatTimeTravelSelectionLabel(timeTravel, t);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setKpiLoading(true);
    setError(null);

    Promise.all([
      emsService.getPlantMatrix({
        mode: timeTravel.mode,
        year: timeTravel.year,
        month: timeTravel.month,
        period: timeTravel.period,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
      emsService.getDashboardKpiByPlant(),
    ])
      .then(([matrix, kpiPlants]) => {
        if (cancelled) return;
        setPlants(matrix.plants);
        setKpiByPlant(kpiPlants);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setPlants(emptyPlants());
        setKpiByPlant({});
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setKpiLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.endDate, dateRange.startDate, t, timeTravel.mode, timeTravel.month, timeTravel.period, timeTravel.year]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneB')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('ems.dashboard.v2.plantMatrixForRange', { label: rangeLabel })}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      ) : (
        <PlantPerformanceTable
          plants={plants}
          kpiByPlant={kpiByPlant}
          kpiLoading={kpiLoading}
          rangeLabel={rangeLabel}
        />
      )}
    </section>
  );
};

export default PlantPerformanceMatrix;
