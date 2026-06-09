import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EmsPagination } from '@/services/emsService';

interface EquipmentListPaginationProps {
  pagination: EmsPagination;
  onPageChange: (page: number) => void;
}

const EquipmentListPagination: React.FC<EquipmentListPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { t } = useLanguage();
  const { page, limit, total, totalPages, hasPrev, hasNext } = pagination;

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
      <p className="text-sm text-muted-foreground">
        {t('ems.equipment.showing')} {from}–{to} {t('ems.equipment.of')} {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          {t('common.previous')}
        </Button>
        <span className="text-sm text-muted-foreground px-1">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          {t('common.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EquipmentListPagination;
