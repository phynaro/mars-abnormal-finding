import React, { useEffect, useMemo, useState } from 'react';
import { addMonths, startOfMonth, subMonths } from 'date-fns';
import type { DashboardTimeTravelValue } from '@/utils/emsDashboardTimeTravel';
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmsFilterCard } from '@/components/ems/shared/emsLayoutPrimitives';
import { cn } from '@/lib/utils';

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

interface Props {
  value: DashboardTimeTravelValue;
  onChange: (next: Date) => void;
  onReturnToPresent: () => void;
}

const DashboardTimeTravelBar: React.FC<Props> = ({ value, onChange, onReturnToPresent }) => {
  const { t } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(value.year);

  const yearMin = useMemo(() => new Date().getFullYear() - 3, []);
  const yearMax = useMemo(() => new Date().getFullYear() + 3, []);

  useEffect(() => {
    if (pickerOpen) {
      setPickerYear(value.year);
    }
  }, [pickerOpen, value.year]);

  const monthLabel = (monthIndex: number) =>
    t(`ems.dashboard.v2.month.${MONTH_KEYS[monthIndex]}`);

  const shortMonthLabel = (monthIndex: number) => {
    const full = monthLabel(monthIndex);
    return full.length > 4 ? full.slice(0, 3) : full;
  };

  const handlePrevMonth = () => {
    onChange(startOfMonth(subMonths(value.selectedMonth, 1)));
  };

  const handleNextMonth = () => {
    onChange(startOfMonth(addMonths(value.selectedMonth, 1)));
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange(startOfMonth(new Date(pickerYear, monthIndex, 1)));
    setPickerOpen(false);
  };

  return (
    <EmsFilterCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
            <CalendarClock className="h-4 w-4" />
            {t('ems.dashboard.v2.timeTravel')}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handlePrevMonth}
              aria-label={t('ems.dashboard.v2.prevMonth')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-w-[148px] gap-1.5 px-3 font-medium tabular-nums"
                  aria-label={t('ems.dashboard.v2.openMonthPicker')}
                >
                  {monthLabel(value.month - 1)} {value.year}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[280px] p-3">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pickerYear <= yearMin}
                    onClick={() => setPickerYear((y) => y - 1)}
                    aria-label={t('ems.dashboard.v2.prevYear')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold tabular-nums">{pickerYear}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pickerYear >= yearMax}
                    onClick={() => setPickerYear((y) => y + 1)}
                    aria-label={t('ems.dashboard.v2.nextYear')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_KEYS.map((_, monthIndex) => {
                    const isSelected =
                      pickerYear === value.year && monthIndex + 1 === value.month;
                    return (
                      <button
                        key={monthIndex}
                        type="button"
                        onClick={() => handleSelectMonth(monthIndex)}
                        className={cn(
                          'rounded-md px-2 py-2 text-sm transition-colors',
                          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                        title={monthLabel(monthIndex)}
                      >
                        {shortMonthLabel(monthIndex)}
                      </button>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleNextMonth}
              aria-label={t('ems.dashboard.v2.nextMonth')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!value.isCurrentMonth && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={onReturnToPresent}
          >
            <RotateCcw className="h-4 w-4" />
            {t('ems.dashboard.v2.returnToPresent')}
          </Button>
        )}
      </div>
    </EmsFilterCard>
  );
};

export default DashboardTimeTravelBar;
