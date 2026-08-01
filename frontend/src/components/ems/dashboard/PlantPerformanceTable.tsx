import React from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsKpiData, EmsPlantMatrixItem } from '@/services/emsService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  plants: EmsPlantMatrixItem[];
  kpiByPlant: Record<string, EmsKpiData>;
  kpiLoading?: boolean;
}

function renderKpiValue(value: number | undefined, loading?: boolean): string | number {
  if (typeof value === 'number') return value;
  return loading ? '...' : '—';
}

const PlantPerformanceTable: React.FC<Props> = ({ plants, kpiByPlant, kpiLoading }) => {
  const { t } = useLanguage();

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('ems.dashboard.v2.table.plant')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.completionPct')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.total')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.done')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.inProgress')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.noWo')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.overdue')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.kpiTotalEquipment')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.kpiOverdue')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.kpiDueThisWeek')}</TableHead>
              <TableHead className="text-right">{t('ems.dashboard.v2.table.kpiDueSoon')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plants.map((plant) => {
              const kpi = kpiByPlant[plant.plant];
              return (
                <TableRow key={plant.plant}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-xs uppercase text-muted-foreground">{plant.plant}</p>
                      <p className="font-medium">{plant.plantLabel}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{plant.total > 0 ? `${plant.completionRate}%` : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{plant.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{plant.done}</TableCell>
                  <TableCell className="text-right tabular-nums">{plant.inProgress}</TableCell>
                  <TableCell className="text-right tabular-nums">{plant.noWo}</TableCell>
                  <TableCell className="text-right tabular-nums">{plant.overdue}</TableCell>
                  <TableCell className="text-right tabular-nums">{renderKpiValue(kpi?.totalEquipment, kpiLoading)}</TableCell>
                  <TableCell className="text-right tabular-nums">{renderKpiValue(kpi?.overdue, kpiLoading)}</TableCell>
                  <TableCell className="text-right tabular-nums">{renderKpiValue(kpi?.dueThisWeek, kpiLoading)}</TableCell>
                  <TableCell className="text-right tabular-nums">{renderKpiValue(kpi?.dueSoon, kpiLoading)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PlantPerformanceTable;
