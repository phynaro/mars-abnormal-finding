import React from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsWorkOrderItem } from '@/services/emsService';
import { formatEmsDate } from '@/components/ems/equipment/formatEmsValues';
import { WorkOrderStatusBadge } from './workOrderStatus';

interface WorkOrderTableProps {
  items: EmsWorkOrderItem[];
}

const WorkOrderTable: React.FC<WorkOrderTableProps> = ({ items }) => {
  const { t } = useLanguage();

  return (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ems.equipment.col.tagNo')}</TableHead>
            <TableHead className="min-w-[180px]">{t('ems.equipment.col.description')}</TableHead>
            <TableHead>{t('ems.equipment.plant')}</TableHead>
            <TableHead>{t('ems.equipment.area')}</TableHead>
            <TableHead>{t('ems.equipment.wo.woNo')}</TableHead>
            <TableHead>{t('ems.workOrders.status')}</TableHead>
            <TableHead>{t('ems.workOrders.schFinish')}</TableHead>
            <TableHead>{t('ems.workOrders.actFinish')}</TableHead>
            <TableHead>{t('ems.equipment.wo.assignee')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={`${row.woNo ?? 'na'}-${row.tagNo}`} className="hover:bg-muted/30">
              <TableCell>
                <Link
                  to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.tagNo}
                </Link>
              </TableCell>
              <TableCell className="max-w-[220px] truncate" title={row.description || ''}>
                {row.description || '—'}
              </TableCell>
              <TableCell>{row.plant || '—'}</TableCell>
              <TableCell>{row.area || '—'}</TableCell>
              <TableCell>{row.woCode || row.woNo || '—'}</TableCell>
              <TableCell>
                <WorkOrderStatusBadge status={row.status} t={t} />
              </TableCell>
              <TableCell>{formatEmsDate(row.schFinishDate)}</TableCell>
              <TableCell>{formatEmsDate(row.actFinishDate)}</TableCell>
              <TableCell>{row.assigneeName?.trim() || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkOrderTable;
