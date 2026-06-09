import React, { useEffect, useState } from 'react';
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

export interface DashboardFilters {
  plant: string;
  area: string;
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  plant: '',
  area: '',
};

const ALL = '__all__';

interface DashboardFilterBarProps {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  className?: string;
}

const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
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
          {t('ems.dashboard.filters')}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1 sm:flex-none sm:max-w-[220px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.plant')}</Label>
            <Select
              value={filters.plant || ALL}
              onValueChange={(v) => onChange({ plant: v === ALL ? '' : v, area: '' })}
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

          <div className="min-w-[160px] flex-1 sm:flex-none sm:max-w-[220px] space-y-1.5">
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
        </div>
      </div>
    </EmsFilterCard>
  );
};

export default DashboardFilterBar;
