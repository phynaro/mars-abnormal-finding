import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsEquipmentListItem, EmsEquipmentListSortOrder } from '@/services/emsService';
import { cn } from '@/lib/utils';
import { EmsStatusBadge, emsStatusLabel } from './equipmentStatus';
import { displayEffectiveDue, formatManufacturerModel } from './formatEmsValues';
import { emsListReturnState } from '@/components/ems/shared/emsListReturn';

interface EquipmentTableProps {
  items: EmsEquipmentListItem[];
  sortOrder: EmsEquipmentListSortOrder;
  onCcpCodeSortToggle: () => void;
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({ items, sortOrder, onCcpCodeSortToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const SortIcon = sortOrder === 'ASC' ? ArrowUp : ArrowDown;

  return (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ems.equipment.col.tagNo')}</TableHead>
            <TableHead className="min-w-[200px]">{t('ems.equipment.col.description')}</TableHead>
            <TableHead>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 font-medium hover:text-foreground',
                  'text-muted-foreground transition-colors'
                )}
                onClick={onCcpCodeSortToggle}
              >
                {t('ems.equipment.col.ccpCode')}
                <SortIcon className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">
                  {sortOrder === 'ASC' ? t('ems.equipment.sort.asc') : t('ems.equipment.sort.desc')}
                </span>
              </button>
            </TableHead>
            <TableHead>{t('ems.equipment.area')}</TableHead>
            <TableHead>{t('ems.equipment.equipmentType')}</TableHead>
            <TableHead>{t('ems.equipment.col.manufacturerModel')}</TableHead>
            <TableHead>{t('ems.equipment.col.calInterval')}</TableHead>
            <TableHead>{t('ems.equipment.status')}</TableHead>
            <TableHead>{t('ems.equipment.col.effectiveDue')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.tagNo}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() =>
                navigate(`/ems/equipment/${encodeURIComponent(item.tagNo)}`, {
                  state: emsListReturnState(location),
                })
              }
            >
              <TableCell className="font-medium whitespace-nowrap">{item.tagNo}</TableCell>
              <TableCell className="max-w-[280px] truncate" title={item.description}>
                {item.description}
              </TableCell>
              <TableCell className="whitespace-nowrap">{item.ccpCode || '—'}</TableCell>
              <TableCell className="max-w-[160px] truncate" title={item.area}>
                {item.area || '—'}
              </TableCell>
              <TableCell>{item.equipmentType || '—'}</TableCell>
              <TableCell className="max-w-[180px] truncate">
                {formatManufacturerModel(item.manufacturer, item.model)}
              </TableCell>
              <TableCell>{item.calInterval || '—'}</TableCell>
              <TableCell>
                <EmsStatusBadge
                  status={item.status}
                  label={emsStatusLabel(item.status, t)}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">{displayEffectiveDue(item)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EquipmentTable;
