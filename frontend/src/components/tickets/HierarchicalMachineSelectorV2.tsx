import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { hierarchyService } from '@/services/hierarchyService';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

/** Same shape as V1 so consumers can swap without changes. */
export interface SelectedMachine {
  puno: number;
  pucode: string;
  plant: string;
  puname: string;
  pucriticalno?: number;
}

interface PUChildItem {
  puno?: number;
  PUNO?: number;
  code: string;
  name: string;
  pucriticalno?: number;
  PUCRITICALNO?: number;
  costcenter?: number;
}

interface HierarchicalMachineSelectorV2Props {
  onMachineSelect: (machine: SelectedMachine) => void;
  onClear: () => void;
  selectedMachineData: SelectedMachine | null;
  disabled?: boolean;
}

function buildSelectedMachine(item: PUChildItem): SelectedMachine {
  const parts = (item.code || '').split('-');
  const puno = item.puno ?? item.PUNO ?? 0;
  const pucriticalno = item.pucriticalno ?? item.PUCRITICALNO;
  return {
    puno,
    pucode: item.code,
    plant: parts[0] ?? '',
    puname: item.name ?? item.code,
    pucriticalno,
  };
}

const HierarchicalMachineSelectorV2: React.FC<HierarchicalMachineSelectorV2Props> = ({
  onMachineSelect,
  onClear,
  selectedMachineData,
  disabled = false,
}) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const [levels, setLevels] = useState<PUChildItem[][]>([]);
  const [selectedPath, setSelectedPath] = useState<PUChildItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChildren = async (parentPuno: number) => {
    setLoading(true);
    try {
      const response = await hierarchyService.getPUChildrenByParent(parentPuno);
      if (response.success && Array.isArray(response.data)) {
        return response.data as PUChildItem[];
      }
      return [];
    } catch (error) {
      console.error('Error loading PU children:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load hierarchy',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const roots = await loadChildren(0);
      if (!cancelled && roots.length > 0) {
        setLevels([roots]);
        setSelectedPath([]);
      } else if (!cancelled) {
        setLevels([]);
        setSelectedPath([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedMachineData) {
      setSelectedPath([]);
      setLevels((prev) => (prev.length > 0 ? [prev[0]] : prev));
    }
  }, [selectedMachineData]);

  const handleLevelSelect = async (levelIndex: number, item: PUChildItem) => {
    const newPath = selectedPath.slice(0, levelIndex).concat(item);
    setSelectedPath(newPath);

    const machine = buildSelectedMachine(item);
    onMachineSelect(machine);
    const children = await loadChildren(item.puno ?? item.PUNO ?? 0);
    if (children.length > 0) {
      const newLevels = levels.slice(0, levelIndex + 1).concat([children]);
      setLevels(newLevels);
    } else {
      setLevels(levels.slice(0, levelIndex + 1));
    }
  };

  const clearAll = () => {
    setSelectedPath([]);
    onClear();
    loadChildren(0).then((roots) => {
      if (roots.length > 0) setLevels([roots]);
      else setLevels([]);
    });
  };

  return (
    <div className="space-y-4">
      {levels.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">{t('ticket.noHierarchyAvailable') || 'No hierarchy available.'}</p>
      )}
      {levels.length === 0 && loading && (
        <p className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
      )}
      {levels.map((options, levelIndex) => (
        <div key={levelIndex} className="space-y-2">
          {/* <Label className="text-sm font-medium">
            {levelIndex === 0
              ? t('ticket.selectPlant') || 'Select level...'
              : `${t('ticket.selectLevel') || 'Select'} ${levelIndex + 1}`}
          </Label> */}
          <Select
            value={selectedPath[levelIndex] ? String(selectedPath[levelIndex].puno ?? selectedPath[levelIndex].PUNO ?? '') : ''}
            onValueChange={(value) => {
              const item = options.find((o) => o.puno.toString() === value);
              if (item) handleLevelSelect(levelIndex, item);
            }}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loading ? (t('common.loading') || 'Loading...') : (t('ticket.selectOption') || 'Select...')
                }
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((item) => (
                <SelectItem key={item.puno ?? item.PUNO} value={String(item.puno ?? item.PUNO)}>
                  <span>{item.name || item.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {levels.length > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={disabled || selectedPath.length === 0}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            {t('common.clear') || 'Clear'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('ticket.hierarchyHelpText') ||
              'Select from each level to drill down. Selection is saved at each step.'}
          </p>
        </>
      )}
    </div>
  );
};

export default HierarchicalMachineSelectorV2;
