import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsEquipmentSpecifications } from '@/services/emsService';
import { formatNum, formatRange } from './formatEmsValues';

interface SpecSectionProps {
  specifications: EmsEquipmentSpecifications;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-1 sm:gap-3 py-1.5 border-b last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

const SpecSection: React.FC<SpecSectionProps> = ({ specifications }) => {
  const { t } = useLanguage();
  const wr = specifications.workingRange;
  const cr = specifications.calRange;
  const mpe = specifications.mpe;

  const mpeText = [
    mpe?.value != null ? formatNum(mpe.value) : null,
    mpe?.unit,
    mpe?.condition,
  ]
    .filter(Boolean)
    .join(' ') || '—';

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold">{t('ems.equipment.spec.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <dl>
          <SpecRow
            label={t('ems.equipment.spec.workingRange')}
            value={formatRange(wr?.min, wr?.max, wr?.unit)}
          />
          <SpecRow
            label={t('ems.equipment.spec.workingRangePoints')}
            value={wr?.points != null ? String(wr.points) : '—'}
          />
          <SpecRow
            label={t('ems.equipment.spec.calRange')}
            value={formatRange(cr?.min, cr?.max, cr?.unit)}
          />
          <SpecRow
            label={t('ems.equipment.spec.calRangePoints')}
            value={cr?.points != null ? String(cr.points) : '—'}
          />
          <SpecRow label={t('ems.equipment.spec.mpe')} value={mpeText} />
          <SpecRow
            label={t('ems.equipment.spec.calInterval')}
            value={
              specifications.calInterval?.trim()
                ? specifications.calInterval
                : specifications.calIntervalWeeks != null
                  ? `${specifications.calIntervalWeeks} ${t('ems.equipment.spec.weeks')}`
                  : '—'
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
};

export default SpecSection;
