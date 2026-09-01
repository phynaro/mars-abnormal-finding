import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsWorkOrderItem } from '@/services/emsService';
import { formatEmsDate } from '@/components/ems/equipment/formatEmsValues';
import { WorkOrderStatusBadge } from './workOrderStatus';
import { emsListReturnState } from '@/components/ems/shared/emsListReturn';

interface WorkOrderCardListProps {
  items: EmsWorkOrderItem[];
}

const WorkOrderCardList: React.FC<WorkOrderCardListProps> = ({ items }) => {
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <div className="md:hidden space-y-3 px-4 py-4">
      {items.map((row) => (
        <Link
          key={`${row.woNo ?? 'na'}-${row.tagNo}`}
          to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
          state={emsListReturnState(location)}
          className="block rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm">{row.tagNo}</p>
            <WorkOrderStatusBadge status={row.status} t={t} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{row.description || '—'}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>
              {t('ems.equipment.wo.woNo')}: {row.woCode || row.woNo || '—'}
            </p>
            <p>
              {t('ems.workOrders.schFinish')}: {formatEmsDate(row.schFinishDate)}
            </p>
            <p>
              {t('ems.workOrders.actFinish')}: {formatEmsDate(row.actFinishDate)}
            </p>
            {row.assigneeName && (
              <p>
                {t('ems.equipment.wo.assignee')}: {row.assigneeName}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default WorkOrderCardList;
