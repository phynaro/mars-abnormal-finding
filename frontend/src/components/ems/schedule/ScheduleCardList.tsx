import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsScheduleItem } from '@/services/emsService';
import { displayEffectiveDue } from '@/components/ems/equipment/formatEmsValues';
import { cn } from '@/lib/utils';
import { EmsWoStatusBadge, formatScheduleDueDays } from './scheduleStatus';
import { emsListReturnState } from '@/components/ems/shared/emsListReturn';

interface ScheduleCardListProps {
  items: EmsScheduleItem[];
}

const ScheduleCardList: React.FC<ScheduleCardListProps> = ({ items }) => {
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <div className="md:hidden space-y-3 px-4 py-4">
      {items.map((row) => {
        const dueDays = formatScheduleDueDays(row.daysUntilDue, t);
        return (
          <Link
            key={row.pmSchNo || `${row.tagNo}-${row.dueDate}`}
            to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
            state={emsListReturnState(location)}
            className="block rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">{row.tagNo}</p>
              <EmsWoStatusBadge status={row.woStatus} />
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">{row.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {t('ems.due.effectiveDue')}: {displayEffectiveDue(row)}
              </span>
              {dueDays.text !== '—' && (
                <span className={cn('font-medium', dueDays.className)}>{dueDays.text}</span>
              )}
              {row.assignedCalibrator && (
                <span>
                  {t('ems.equipment.wo.assignee')}: {row.assignedCalibrator}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ScheduleCardList;
