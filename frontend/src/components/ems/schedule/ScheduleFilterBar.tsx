import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsFilterOptions } from '@/services/emsService';
import { EmsFilterCard } from '@/components/ems/shared/emsLayoutPrimitives';

export interface ScheduleFilters {
  plant: string;
  area: string;
  woStatus: string;
  dueFrom: string;
  dueTo: string;
}

// Shared filter defaults are intentionally exported for feature state initialization.
// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_SCHEDULE_FILTERS: ScheduleFilters = {
  plant: '',
  area: '',
  woStatus: '',
  dueFrom: '',
  dueTo: '',
};

const ALL = '__all__';

interface ScheduleFilterBarProps {
  filters: ScheduleFilters;
  onChange: (next: ScheduleFilters) => void;
  className?: string;
}

const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  filters,
  onChange,
  className,
}) => {
  const { t } = useLanguage();
  const [options, setOptions] = useState<EmsFilterOptions | null>(null);

  useEffect(() => {
    emsService.getFilterOptions(filters.plant || undefined).then((res) => setOptions(res.data));
  }, [filters.plant]);

  return (
    <EmsFilterCard className={className}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          {t('ems.schedule.filters')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.plant')}</Label>
            <Select
              value={filters.plant || ALL}
              onValueChange={(v) =>
                onChange({ ...filters, plant: v === ALL ? '' : v, area: '' })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('ems.equipment.filter.allPlants')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.equipment.filter.allPlants')}</SelectItem>
                {(options?.plants ?? []).map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.area')}</Label>
            <Select
              value={filters.area || ALL}
              onValueChange={(v) => onChange({ ...filters, area: v === ALL ? '' : v })}
              disabled={!options?.areas?.length}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('ems.equipment.filter.allAreas')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.equipment.filter.allAreas')}</SelectItem>
                {(options?.areas ?? []).map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.schedule.woStatus')}</Label>
            <Select
              value={filters.woStatus || ALL}
              onValueChange={(v) => onChange({ ...filters, woStatus: v === ALL ? '' : v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('ems.schedule.allWoStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.schedule.allWoStatuses')}</SelectItem>
                <SelectItem value="pending">{t('ems.schedule.statusPending')}</SelectItem>
                <SelectItem value="in-progress">{t('ems.schedule.statusInProgress')}</SelectItem>
                <SelectItem value="done">{t('ems.schedule.statusDone')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.schedule.dueFrom')}</Label>
            <Input
              type="date"
              className="h-9"
              value={filters.dueFrom}
              onChange={(e) => onChange({ ...filters, dueFrom: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.schedule.dueTo')}</Label>
            <Input
              type="date"
              className="h-9"
              value={filters.dueTo}
              onChange={(e) => onChange({ ...filters, dueTo: e.target.value })}
            />
          </div>
        </div>
      </div>
    </EmsFilterCard>
  );
};

export default ScheduleFilterBar;
