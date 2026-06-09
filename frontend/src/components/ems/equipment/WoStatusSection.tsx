import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsCurrentWo, EmsPmHistoryItem } from '@/services/emsService';
import { formatEmsDate } from './formatEmsValues';

interface WoStatusSectionProps {
  currentWo: EmsCurrentWo | null;
  pmHistory: EmsPmHistoryItem[];
  onExpandHistory?: () => void;
  historyExpanded?: boolean;
  historyLoading?: boolean;
}

const WoStatusSection: React.FC<WoStatusSectionProps> = ({
  currentWo,
  pmHistory,
  onExpandHistory,
  historyExpanded = false,
  historyLoading = false,
}) => {
  const { t } = useLanguage();
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = historyExpanded || localExpanded;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">{t('ems.equipment.wo.currentTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {!currentWo ? (
            <p className="text-sm text-muted-foreground">{t('ems.equipment.wo.noActive')}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('ems.equipment.wo.woNo')}</dt>
                <dd className="font-medium">{currentWo.woCode || currentWo.woNo || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('ems.equipment.wo.status')}</dt>
                <dd className="font-medium">{currentWo.woStatusNo ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('ems.equipment.wo.dueDate')}</dt>
                <dd className="font-medium">{formatEmsDate(currentWo.dueDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('ems.equipment.wo.assignee')}</dt>
                <dd className="font-medium text-right">{currentWo.assignedCalibrator || '—'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
          <CardTitle className="text-sm font-semibold">{t('ems.equipment.wo.historyTitle')}</CardTitle>
          {pmHistory.length >= 5 && onExpandHistory && !expanded && (
            <Button variant="ghost" size="sm" onClick={() => { setLocalExpanded(true); onExpandHistory(); }}>
              {t('common.seeMore')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {pmHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('ems.equipment.wo.noHistory')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ems.equipment.wo.woNo')}</TableHead>
                    <TableHead>{t('ems.equipment.wo.completed')}</TableHead>
                    <TableHead>{t('ems.equipment.wo.performedBy')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pmHistory.map((row) => (
                    <TableRow key={`${row.woNo}-${row.woCode}`}>
                      <TableCell>{row.woCode || row.woNo}</TableCell>
                      <TableCell>{formatEmsDate(row.completedDate as string)}</TableCell>
                      <TableCell>{row.performedBy || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {historyLoading && (
            <p className="text-xs text-muted-foreground mt-2">{t('common.loading')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WoStatusSection;
