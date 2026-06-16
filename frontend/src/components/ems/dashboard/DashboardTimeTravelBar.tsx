import React, { useEffect, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import {
  getTimeTravelDateRange,
  setTimeTravelMonth,
  setTimeTravelPeriod,
  setTimeTravelYear,
  stepTimeTravel,
  switchTimeTravelMode,
  type DashboardTimeRangeMode,
  type DashboardTimeTravelValue,
} from '@/utils/emsDashboardTimeTravel';
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

const MODE_OPTIONS: DashboardTimeRangeMode[] = ['month', 'period', 'year'];

interface Props {
  value: DashboardTimeTravelValue;
  onChange: (next: DashboardTimeTravelValue) => void;
  onReturnToPresent: () => void;
}

const DashboardTimeTravelBar: React.FC<Props> = ({ value, onChange, onReturnToPresent }) => {
  const { t } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(value.year);
  const selectedRange = getTimeTravelDateRange(value);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearMin = currentYear - 3;
  const yearMax = currentYear + 3;
  const yearOptions = useMemo(
    () => Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i),
    [yearMin, yearMax]
  );
  const periodOptions = useMemo(() => Array.from({ length: 13 }, (_, i) => i + 1), []);

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

  const modeLabel = (mode: DashboardTimeRangeMode) => {
    if (mode === 'month') return t('ems.dashboard.v2.modeMonth');
    if (mode === 'period') return t('ems.dashboard.v2.modePeriod');
    return t('ems.dashboard.v2.modeYear');
  };

  const selectionLabel = () => {
    if (value.mode === 'year') return String(value.year);
    if (value.mode === 'period') return `${value.year} P${value.period}`;
    return `${monthLabel(value.month - 1)} ${value.year}`;
  };

  const handlePrev = () => {
    onChange(stepTimeTravel(value, -1));
  };

  const handleNext = () => {
    onChange(stepTimeTravel(value, 1));
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange(setTimeTravelMonth(startOfMonth(new Date(pickerYear, monthIndex, 1))));
    setPickerOpen(false);
  };

  const handleSelectPeriod = (period: number) => {
    onChange(setTimeTravelPeriod(pickerYear, period));
    setPickerOpen(false);
  };

  const handleSelectYear = (year: number) => {
    onChange(setTimeTravelYear(year));
    setPickerOpen(false);
  };

  const handleModeChange = (mode: DashboardTimeRangeMode) => {
    onChange(switchTimeTravelMode(value, mode));
  };

  return (
    <EmsFilterCard>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
            <CalendarClock className="h-4 w-4" />
            {t('ems.dashboard.v2.timeTravel')}
          </div>

          <div className="flex p-1 bg-muted rounded-lg shrink-0">
            {MODE_OPTIONS.map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={value.mode === mode ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => handleModeChange(mode)}
              >
                {modeLabel(mode)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handlePrev}
              aria-label={t('ems.dashboard.v2.prevPeriod')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {value.mode === 'month' && (
              <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-w-[148px] gap-1.5 px-3 font-medium tabular-nums"
                    aria-label={t('ems.dashboard.v2.openMonthPicker')}
                  >
                    {selectionLabel()}
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
            )}

            {value.mode === 'period' && (
              <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 min-w-[148px] gap-1.5 px-3 font-medium tabular-nums"
                      aria-label={t('ems.dashboard.v2.openPeriodPicker')}
                    >
                      {selectionLabel()}
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
                    <div className="grid grid-cols-4 gap-1.5">
                      {periodOptions.map((period) => {
                        const isSelected =
                          pickerYear === value.year && period === value.period;
                        return (
                          <button
                            key={period}
                            type="button"
                            onClick={() => handleSelectPeriod(period)}
                            className={cn(
                              'rounded-md px-2 py-2 text-sm transition-colors tabular-nums',
                              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                          >
                            P{period}
                          </button>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}

            {value.mode === 'year' && (
              <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 min-w-[100px] gap-1.5 px-3 font-medium tabular-nums"
                      aria-label={t('ems.dashboard.v2.openYearPicker')}
                    >
                      {selectionLabel()}
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-[200px] p-2">
                    <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                      {yearOptions.map((year) => {
                        const isSelected = year === value.year;
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => handleSelectYear(year)}
                            className={cn(
                              'rounded-md px-2 py-2 text-sm transition-colors tabular-nums',
                              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                            )}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleNext}
              aria-label={t('ems.dashboard.v2.nextPeriod')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!value.isPresent && (
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
        <p className="text-xs text-muted-foreground tabular-nums">
          {t('ems.dashboard.v2.rangeHint')}: {selectedRange.startDate} - {selectedRange.endDate}
        </p>
      </div>
    </EmsFilterCard>
  );
};

export default DashboardTimeTravelBar;
