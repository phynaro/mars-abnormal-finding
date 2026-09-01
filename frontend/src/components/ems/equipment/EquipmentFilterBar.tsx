import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, Filter } from 'lucide-react';
import type { EmsKpiBucket } from '@/services/emsService';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsFilterOptions } from '@/services/emsService';
import { EmsFilterCard } from '@/components/ems/shared/emsLayoutPrimitives';
import { cn } from '@/lib/utils';

export interface EquipmentFilters {
  plant: string;
  area: string;
  equipmentType: string;
  status: string[];
  search: string;
  kpiBucket: EmsKpiBucket | '';
}

// Shared filter defaults are intentionally exported for feature state initialization.
// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_EQUIPMENT_FILTERS: EquipmentFilters = {
  plant: '',
  area: '',
  equipmentType: '',
  status: [],
  search: '',
  kpiBucket: '',
};

interface EquipmentFilterBarProps {
  filters: EquipmentFilters;
  onChange: (next: EquipmentFilters) => void;
  className?: string;
}

const ALL = '__all__';

const DUE_WINDOW_OPTIONS: { value: EmsKpiBucket; labelKey: string }[] = [
  { value: 'overdue', labelKey: 'ems.status.overdue' },
  { value: 'due_this_week', labelKey: 'ems.dashboard.dueThisWeek' },
  { value: 'due_soon', labelKey: 'ems.status.dueSoon' },
];

const EquipmentFilterBar: React.FC<EquipmentFilterBarProps> = ({
  filters,
  onChange,
  className,
}) => {
  const { t } = useLanguage();
  const [options, setOptions] = useState<EmsFilterOptions | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    emsService.getFilterOptions(filters.plant || undefined).then((res) => setOptions(res.data));
  }, [filters.plant]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === filtersRef.current.search) return;
      onChange({ ...filtersRef.current, search: searchInput });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, onChange]);

  const statusOptions = options?.statuses ?? ['OVERDUE', 'DUE SOON', 'OK', 'NO WO'];

  const statusSummary = useMemo(() => {
    if (!filters.status.length) return t('ems.equipment.filter.allStatuses');
    if (filters.status.length === 1) return filters.status[0];
    return `${filters.status.length} ${t('ems.equipment.filter.selected')}`;
  }, [filters.status, t]);

  const toggleStatus = (status: string) => {
    const set = new Set(filters.status);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    onChange({ ...filters, status: Array.from(set), kpiBucket: '' });
  };

  return (
    <EmsFilterCard className={cn('sticky top-0 z-10', className)}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          {t('ems.equipment.filters')}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.plant')}</Label>
            <Select
              value={filters.plant || ALL}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  plant: v === ALL ? '' : v,
                  area: '',
                })
              }
            >
              <SelectTrigger>
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
            >
              <SelectTrigger>
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
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.equipmentType')}</Label>
            <Select
              value={filters.equipmentType || ALL}
              onValueChange={(v) =>
                onChange({ ...filters, equipmentType: v === ALL ? '' : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('ems.equipment.filter.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.equipment.filter.allTypes')}</SelectItem>
                {(options?.equipmentTypes ?? []).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.filter.dueWindow')}</Label>
            <Select
              value={filters.kpiBucket || ALL}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  kpiBucket: v === ALL ? '' : (v as EmsKpiBucket),
                  status: [],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('ems.equipment.filter.allDueWindows')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('ems.equipment.filter.allDueWindows')}</SelectItem>
                {DUE_WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('ems.equipment.status')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">{statusSummary}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{t('ems.equipment.status')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('ems.equipment.searchPlaceholder')}
              />
            </div>
          </div>
        </div>
      </div>
    </EmsFilterCard>
  );
};

export default EquipmentFilterBar;
