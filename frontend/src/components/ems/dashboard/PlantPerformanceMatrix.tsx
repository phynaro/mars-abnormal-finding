import React, { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsPlantMatrixItem } from '@/services/emsService';
import { PM_CALIBRATION_PLANT_OPTIONS } from '@/utils/pmCalibrationPlantMap';

import PlantPerformanceCard from './PlantPerformanceCard';

interface Props {
  year: number;
  month: number;
}

function emptyPlants(): EmsPlantMatrixItem[] {
  return PM_CALIBRATION_PLANT_OPTIONS.map((p) => ({
    plant: p.code,
    plantLabel: p.label,
    total: 0,
    done: 0,
    inProgress: 0,
    noWo: 0,
    completionRate: 0,
  }));
}

const PlantPerformanceMatrix: React.FC<Props> = ({ year, month }) => {
  const { t } = useLanguage();
  const [plants, setPlants] = useState<EmsPlantMatrixItem[]>(emptyPlants);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    emsService
      .getPlantMatrix({ year, month })
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
  }, [year, month, t]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('ems.dashboard.v2.zoneB')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('ems.dashboard.v2.plantMatrix')}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plants.map((plant) => (
            <PlantPerformanceCard key={plant.plant} plant={plant} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PlantPerformanceMatrix;
