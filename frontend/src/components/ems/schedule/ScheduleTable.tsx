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
import type { EmsScheduleItem } from '@/services/emsService';
import { formatEmsDate } from '@/components/ems/equipment/formatEmsValues';
import { EmsWoStatusBadge, formatScheduleDueDays } from './scheduleStatus';
import { cn } from '@/lib/utils';

interface ScheduleTableProps {
  items: EmsScheduleItem[];
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ items }) => {
  const { t } = useLanguage();

  return (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ems.equipment.col.tagNo')}</TableHead>
            <TableHead className="min-w-[180px]">{t('ems.equipment.col.description')}</TableHead>
            <TableHead>{t('ems.equipment.area')}</TableHead>
            <TableHead>{t('ems.equipment.wo.woNo')}</TableHead>
            <TableHead>{t('ems.schedule.woStatus')}</TableHead>
            <TableHead>{t('ems.dashboard.dueDate')}</TableHead>
            <TableHead>{t('ems.schedule.daysColumn')}</TableHead>
            <TableHead>{t('ems.equipment.wo.assignee')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const dueDays = formatScheduleDueDays(row.daysUntilDue, t);
            return (
              <TableRow key={row.pmSchNo || `${row.tagNo}-${row.dueDate}`} className="hover:bg-muted/30">
                <TableCell>
                  <Link
                    to={`/ems/equipment/${encodeURIComponent(row.tagNo)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.tagNo}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[220px] truncate" title={row.description}>
                  {row.description || '—'}
                </TableCell>
                <TableCell>{row.area || '—'}</TableCell>
                <TableCell>{row.woCode || row.woNo || '—'}</TableCell>
                <TableCell>
                  <EmsWoStatusBadge status={row.woStatus} />
                </TableCell>
                <TableCell>{formatEmsDate(row.dueDate)}</TableCell>
                <TableCell className={cn('whitespace-nowrap', dueDays.className)}>
                  {dueDays.text}
                </TableCell>
                <TableCell>{row.assignedCalibrator?.trim() || '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ScheduleTable;
