import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/useToast';
import emsService, { type EmsManagerArea } from '@/services/emsService';
import type { Person } from '@/services/administrationService';
import {
  labelForPmCalibrationPlant,
  PM_CALIBRATION_PLANT_OPTIONS,
} from '@/utils/pmCalibrationPlantMap';
import PersonSearchCombobox from './PersonSearchCombobox';

interface ManagerAreaConfigProps {
  onChanged?: () => void;
}

const ALL_AREAS = '__all__';

const ManagerAreaConfig: React.FC<ManagerAreaConfigProps> = ({ onChanged }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<EmsManagerArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personNo, setPersonNo] = useState('');
  const [personLabel, setPersonLabel] = useState('');
  const [plant, setPlant] = useState('');
  const [area, setArea] = useState(ALL_AREAS);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emsService.listManagerAreas();
      setItems(res.data.items);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.loadAreasFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!plant) {
      setAreaOptions([]);
      setArea(ALL_AREAS);
      return;
    }
    let cancelled = false;
    setAreasLoading(true);
    emsService
      .getFilterOptions(plant)
      .then((res) => {
        if (!cancelled) setAreaOptions(res.data.areas || []);
      })
      .catch(() => {
        if (!cancelled) setAreaOptions([]);
      })
      .finally(() => {
        if (!cancelled) setAreasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plant]);

  const handleSelectPerson = (person: Person) => {
    setPersonNo(String(person.PERSONNO));
    setPersonLabel(person.PERSON_NAME || `${person.FIRSTNAME} ${person.LASTNAME}`.trim());
  };

  const handleAdd = async () => {
    if (!personNo || !plant) {
      toast({ title: t('ems.settings.selectPersonAndPlant'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const areaVal = area === ALL_AREAS ? undefined : area;
      await emsService.createManagerArea(personNo, plant, areaVal);
      toast({ title: t('ems.settings.areaAdded') });
      setPersonNo('');
      setPersonLabel('');
      setPlant('');
      setArea(ALL_AREAS);
      await load();
      onChanged?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.addAreaFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    try {
      await emsService.deleteManagerArea(id);
      toast({ title: t('ems.settings.areaRemoved') });
      await load();
      onChanged?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.removeAreaFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatScope = (row: EmsManagerArea) => {
    const plantLabel = row.plant ? labelForPmCalibrationPlant(row.plant) : t('ems.settings.allPlants');
    if (!row.area) return plantLabel;
    return `${plantLabel} · ${row.area}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_160px_160px_auto] gap-3 items-end">
        <PersonSearchCombobox
          label={t('ems.settings.person')}
          selectedPersonNo={personNo}
          selectedLabel={personLabel}
          onSelect={handleSelectPerson}
          onClear={() => {
            setPersonNo('');
            setPersonLabel('');
          }}
          disabled={saving}
        />
        <div>
          <Label className="text-xs">{t('ems.settings.plant')}</Label>
          <Select value={plant || undefined} onValueChange={setPlant}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder={t('ems.settings.selectPlant')} />
            </SelectTrigger>
            <SelectContent>
              {PM_CALIBRATION_PLANT_OPTIONS.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t('ems.settings.areaOptional')}</Label>
          <Select
            value={area}
            onValueChange={setArea}
            disabled={!plant || areasLoading || saving}
          >
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder={t('ems.settings.allAreasInPlant')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AREAS}>{t('ems.settings.allAreasInPlant')}</SelectItem>
              {areaOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving || !personNo || !plant}>
          {t('ems.settings.addMapping')}
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ems.settings.person')}</TableHead>
              <TableHead>{t('ems.settings.scope')}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-sm py-6 text-center">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-sm py-6 text-center">
                  {t('ems.settings.noManagerAreas')}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.personName}</div>
                    <div className="text-xs text-muted-foreground">#{row.personNo}</div>
                  </TableCell>
                  <TableCell className="text-sm">{formatScope(row)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={saving}
                      aria-label={t('ems.settings.removeMapping')}
                      onClick={() => handleDelete(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManagerAreaConfig;
