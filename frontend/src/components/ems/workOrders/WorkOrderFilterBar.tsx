import React, { useEffect, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsFilterOptions, type EmsWorkOrderStatus } from '@/services/emsService';
import { EmsFilterCard } from '@/components/ems/shared/emsLayoutPrimitives';

export interface WorkOrderFilters {
  plant: string;
  area: string;
  status: '' | EmsWorkOrderStatus;
  schFrom: string;
  schTo: string;
  q: string;
}

const ALL = '__all__';

interface WorkOrderFilterBarProps {
  filters: WorkOrderFilters;
  onChange: (next: WorkOrderFilters) => void;
  className?: string;
}

const WorkOrderFilterBar: React.FC<WorkOrderFilterBarProps> = ({ filters, onChange, className }) => {
  const { t } = useLanguage();
  const [options, setOptions] = useState<EmsFilterOptions | null>(null);
  const [searchInput, setSearchInput] = useState(filters.q);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    emsService.getFilterOptions(filters.plant || undefined).then((res) => setOptions(res.data));
  }, [filters.plant]);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChange({ ...filtersRef.current, q: searchInput.trim() });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, onChange]);

  return (
    <EmsFilterCard className={className}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          {t('ems.workOrders.filters')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.plant')}</Label>
            <Select
              value={filters.plant || ALL}
              onValueChange={(v) => onChange({ ...filters, plant: v === ALL ? '' : v, area: '' })}
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
            <Label className="text-xs text-muted-foreground">{t('ems.workOrders.status')}</Label>
            <Select
              value={filters.status || ALL}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  status: v === ALL ? '' : (v as EmsWorkOrderStatus),
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('ems.workOrders.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.workOrders.allStatuses')}</SelectItem>
                <SelectItem value="ontime">{t('ems.workOrders.statusOntime')}</SelectItem>
                <SelectItem value="late">{t('ems.workOrders.statusLate')}</SelectItem>
                <SelectItem value="not_finish">{t('ems.workOrders.statusNotFinish')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.workOrders.schFrom')}</Label>
            <Input
              type="date"
              className="h-9"
              value={filters.schFrom}
              onChange={(e) => onChange({ ...filters, schFrom: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.workOrders.schTo')}</Label>
            <Input
              type="date"
              className="h-9"
              value={filters.schTo}
              onChange={(e) => onChange({ ...filters, schTo: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.workOrders.search')}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('ems.workOrders.searchPlaceholder')}
              />
            </div>
          </div>
        </div>
      </div>
    </EmsFilterCard>
  );
};

export default WorkOrderFilterBar;
