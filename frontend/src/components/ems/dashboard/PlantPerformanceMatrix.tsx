import React, { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsKpiData, type EmsPlantMatrixItem } from '@/services/emsService';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';
import {
  formatTimeTravelSelectionLabel,
  getTimeTravelDateRange,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';

import PlantPerformanceCard from './PlantPerformanceCard';
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
    completionRate: 0,
  }));
}

const PlantPerformanceMatrix: React.FC<Props> = ({ timeTravel }) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
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
    setError(null);

    emsService
      .getPlantMatrix({
        mode: timeTravel.mode,
        year: timeTravel.year,
        month: timeTravel.month,
        period: timeTravel.period,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .then((data) => {
        if (cancelled) return;
        setPlants(data.plants);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('common.error'));
        setPlants(emptyPlants());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.endDate, dateRange.startDate, t, timeTravel.mode, timeTravel.month, timeTravel.period, timeTravel.year]);

  useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);

    const plantCodes = PM_CALIBRATION_PLANT_OPTIONS.map((p) => p.code);
    Promise.all(
      plantCodes.map((code) =>
        emsService.getDashboardKpi({ plant: code }).then((data) => ({ code, data }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, EmsKpiData> = {};
        for (const { code, data } of results) {
          next[code] = data;
        }
        setKpiByPlant(next);
      })
      .catch(() => {
        if (!cancelled) setKpiByPlant({});
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneB')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('ems.dashboard.v2.plantMatrixForRange', { label: rangeLabel })}
            </p>
          </div>
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value === 'table' ? 'table' : 'card')}
            className="shrink-0"
          >
            <TabsList className="h-9">
              <TabsTrigger value="card" className="text-xs sm:text-sm">
                {t('ems.dashboard.v2.matrixViewCard')}
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs sm:text-sm">
                {t('ems.dashboard.v2.matrixViewTable')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {plants.map((plant) => (
                <PlantPerformanceCard
                  key={plant.plant}
                  plant={plant}
                  kpi={kpiByPlant[plant.plant] ?? null}
                  kpiLoading={kpiLoading}
                  rangeLabel={rangeLabel}
                />
              ))}
            </div>
          ) : (
            <PlantPerformanceTable plants={plants} kpiByPlant={kpiByPlant} kpiLoading={kpiLoading} />
          )}
        </>
      )}
    </section>
  );
};

export default PlantPerformanceMatrix;
