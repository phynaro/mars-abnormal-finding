import React, { useState } from 'react';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsEquipmentChangeBatch } from '@/services/emsService';
import { formatEmsDate } from './formatEmsValues';

interface EquipmentChangeHistorySectionProps {
  batches: EmsEquipmentChangeBatch[];
  onExpandHistory?: () => void;
  historyExpanded?: boolean;
  historyLoading?: boolean;
  hasMore?: boolean;
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  description: 'ems.equipment.col.description',
  area: 'ems.equipment.area',
  manufacturer: 'ems.equipment.manufacturer',
  model: 'ems.equipment.model',
  serialNo: 'ems.equipment.serialNo',
  equipmentType: 'ems.equipment.equipmentType',
  workingRangeMin: 'ems.equipment.changeHistory.field.workingRangeMin',
  workingRangeMax: 'ems.equipment.changeHistory.field.workingRangeMax',
  workingRangeUnit: 'ems.equipment.changeHistory.field.workingRangeUnit',
  workingRangePoints: 'ems.equipment.spec.workingRangePoints',
  calRangeMin: 'ems.equipment.changeHistory.field.calRangeMin',
  calRangeMax: 'ems.equipment.changeHistory.field.calRangeMax',
  calRangeUnit: 'ems.equipment.changeHistory.field.calRangeUnit',
  calRangePoints: 'ems.equipment.spec.calRangePoints',
  mpeType: 'ems.equipment.changeHistory.field.mpeType',
  mpeValue: 'ems.equipment.changeHistory.field.mpeValue',
  mpeUnit: 'ems.equipment.changeHistory.field.mpeUnit',
  mpeCondition: 'ems.equipment.changeHistory.field.mpeCondition',
  ccpCode: 'ems.equipment.spec.ccpCode',
  calRefWi: 'ems.equipment.spec.calRefWi',
  calRefForm: 'ems.equipment.spec.calRefForm',
  calInterval: 'ems.equipment.spec.calInterval',
  calIntervalWeeks: 'ems.equipment.spec.weeks',
  imageUrl: 'ems.equipment.changeHistory.field.imageUrl',
};

function displayValue(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return '—';
  return value;
}

const EquipmentChangeHistorySection: React.FC<EquipmentChangeHistorySectionProps> = ({
  batches,
  onExpandHistory,
  historyExpanded = false,
  historyLoading = false,
  hasMore = false,
}) => {
  const { t } = useLanguage();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = historyExpanded || localExpanded;

  const fieldLabel = (fieldKey: string) => {
    const key = FIELD_LABEL_KEYS[fieldKey];
    return key ? t(key) : fieldKey;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          {t('ems.equipment.changeHistory.title')}
        </CardTitle>
        {hasMore && onExpandHistory && !expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalExpanded(true);
              onExpandHistory();
            }}
          >
            {t('common.seeMore')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('ems.equipment.changeHistory.empty')}</p>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.changeGroup} className="border-l-2 border-muted pl-3 space-y-1.5">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {batch.changedByName || batch.changedBy}
                  </span>
                  {' · '}
                  {formatEmsDate(batch.changedAt)}
                </div>
                <ul className="space-y-1 text-sm">
                  {batch.changes.map((change) => (
                    <li key={`${batch.changeGroup}-${change.fieldKey}`}>
                      <span className="text-muted-foreground">{fieldLabel(change.fieldKey)}:</span>{' '}
                      <span className="line-through text-muted-foreground/80">
                        {displayValue(change.oldValue)}
                      </span>
                      {' → '}
                      <span className="font-medium">{displayValue(change.newValue)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {historyLoading && (
          <p className="text-xs text-muted-foreground mt-2">{t('common.loading')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentChangeHistorySection;
