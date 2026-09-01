import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsEquipmentListItem } from '@/services/emsService';
import { EmsStatusBadge, emsStatusLabel } from './equipmentStatus';
import { displayEffectiveDue } from './formatEmsValues';
import { emsListReturnState } from '@/components/ems/shared/emsListReturn';
import { cn } from '@/lib/utils';

interface EquipmentCardListProps {
  items: EmsEquipmentListItem[];
  className?: string;
}

const EquipmentCardList: React.FC<EquipmentCardListProps> = ({ items, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div className={cn('md:hidden space-y-3 px-4 py-4', className)}>
      {items.map((item) => (
        <button
          key={item.tagNo}
          type="button"
          className="w-full rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/60"
          onClick={() =>
            navigate(`/ems/equipment/${encodeURIComponent(item.tagNo)}`, {
              state: emsListReturnState(location),
            })
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{item.tagNo}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
            </div>
            <EmsStatusBadge
              status={item.status}
              label={emsStatusLabel(item.status, t)}
              className="shrink-0"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('ems.equipment.col.effectiveDue')}</span>
            <span className="font-medium text-foreground">{displayEffectiveDue(item)}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default EquipmentCardList;
