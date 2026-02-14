import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { 
  Copy,
  Target as TargetIcon,
  RefreshCw,
  Settings
} from 'lucide-react';
import personalTargetService, { type PersonalTarget, type CreatePersonalTargetRequest } from '@/services/personalTargetService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13'];
const TARGET_TYPES = ['report', 'fix', 'closure'] as const;
const UNITS = ['case', 'THB', 'percent'] as const;

interface PersonalKPISetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetsUpdated?: () => void;
  targetType: 'report' | 'fix' | 'closure';
  /** When set (admin flow), use this person instead of current user */
  personno?: number;
  /** Display name for the person when personno is set */
  personDisplayName?: string;
}

const PersonalKPISetupModal: React.FC<PersonalKPISetupModalProps> = ({
  open,
  onOpenChange,
  onTargetsUpdated,
  targetType,
  personno: adminPersonno,
  personDisplayName: adminPersonDisplayName
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdminMode = adminPersonno != null;
  const effectivePersonno = isAdminMode ? adminPersonno : user?.id ?? null;
  const displayName = isAdminMode ? (adminPersonDisplayName ?? `#${adminPersonno}`) : (user ? `${user.firstName} ${user.lastName}` : '');
  
  // State
  const [existingTargets, setExistingTargets] = useState<PersonalTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states: for closure, unit is locked to percent
  const isClosure = targetType === 'closure';
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUnit, setSelectedUnit] = useState<'case' | 'THB' | 'percent'>(isClosure ? 'percent' : 'case');
  const [periodValues, setPeriodValues] = useState<{ [period: string]: number }>({});

  // When opening as closure type, lock unit to percent
  useEffect(() => {
    if (open && isClosure) setSelectedUnit('percent');
  }, [open, isClosure]);

  // Fetch existing targets for the current user or selected person (admin)
  const fetchExistingTargets = async () => {
    if (effectivePersonno == null) return;

    try {
      setLoading(true);
      const response = await personalTargetService.getPersonalTargets({
        personno: effectivePersonno,
        year: selectedYear
      });
      
      if (response.success) {
        setExistingTargets(response.data);
        
        // Pre-populate form with existing data if available
        const existingForType = response.data.filter(t => t.type === targetType);
        if (existingForType.length > 0) {
          const values: { [period: string]: number } = {};
          existingForType.forEach(target => {
            values[target.period] = target.target_value;
          });
          setPeriodValues(values);
          setSelectedUnit(isClosure ? 'percent' : existingForType[0].unit);
        } else {
          setPeriodValues({});
        }
      }
    } catch (error) {
      console.error('Error fetching existing targets:', error);
      toast({
        title: t('personalKPI.error'),
        description: t('personalKPI.failedToFetchExistingTargets'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize data when modal opens
  useEffect(() => {
    if (open && effectivePersonno != null) {
      fetchExistingTargets();
    }
  }, [open, selectedYear, targetType, effectivePersonno]);

  // Handle save targets
  const handleSaveTargets = async () => {
    if (effectivePersonno == null) {
      toast({
        title: t('personalKPI.error'),
        description: t('personalKPI.userInformationNotAvailable'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validate that all periods have values
      const missingPeriods = PERIODS.filter(period => !periodValues[period] && periodValues[period] !== 0);
      if (missingPeriods.length > 0) {
        toast({
          title: t('personalKPI.validationError'),
          description: t('personalKPI.fillAllPeriods', { periods: missingPeriods.join(', ') }),
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);

      // Check if targets already exist for this type and year
      const existingForType = existingTargets.filter(t => t.type === targetType);
      
      if (existingForType.length > 0) {
        // Delete existing targets first
        await personalTargetService.deletePersonalTargets({
          PERSONNO: effectivePersonno,
          type: targetType,
          year: selectedYear
        });
      }

      const createdBy = user ? `${user.firstName} ${user.lastName}` : 'admin';
      const createRequest: CreatePersonalTargetRequest = {
        PERSONNO: effectivePersonno,
        type: targetType,
        year: selectedYear,
        target_values: periodValues,
        unit: isClosure ? 'percent' : selectedUnit,
        created_by: createdBy
      };

      await personalTargetService.createPersonalTargets(createRequest);

      const typeLabel = targetType === 'report' ? t('personalKPI.report') : targetType === 'fix' ? t('personalKPI.fix') : t('personalKPI.closure');
      toast({
        title: t('personalKPI.success'),
        description: t('personalKPI.targetsSavedSuccess', { 
          type: typeLabel,
          year: selectedYear 
        }),
      });

      onTargetsUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving targets:', error);
      toast({
        title: t('personalKPI.error'),
        description: t('personalKPI.failedToSavePersonalTargets'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Copy P1 value to all periods
  const copyP1ToAllPeriods = () => {
    const p1Value = periodValues['P1'];
    if (p1Value !== undefined) {
      const newValues = { ...periodValues };
      PERIODS.forEach(period => {
        newValues[period] = p1Value;
      });
      setPeriodValues(newValues);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedYear(new Date().getFullYear());
    setSelectedUnit(isClosure ? 'percent' : 'case');
    setPeriodValues({});
  };

  const hasExistingTargets = existingTargets.filter(t => t.type === targetType).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('personalKPI.title')} - {targetType === 'report' ? t('personalKPI.reportCases') : targetType === 'fix' ? t('personalKPI.fixCases') : t('personalKPI.closureCases')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>{t('personalKPI.user')}:</strong> {displayName}</p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">{t('personalKPI.year')}</Label>
              <Input
                id="year"
                type="number"
                value={selectedYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setSelectedYear(year);
                  setPeriodValues({});
                }}
                min="2020"
                max="2030"
              />
            </div>
            
            {!isClosure && (
              <div className="space-y-2">
                <Label htmlFor="unit">{t('personalKPI.unit')}</Label>
                <Select 
                  value={selectedUnit} 
                  onValueChange={(value) => setSelectedUnit(value as 'case' | 'THB' | 'percent')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case">{t('personalKPI.case')}</SelectItem>
                    <SelectItem value="THB">{t('personalKPI.thb')}</SelectItem>
                    <SelectItem value="percent">{t('personalKPI.percent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isClosure && (
              <div className="space-y-2">
                <Label htmlFor="unit">{t('personalKPI.unit')}</Label>
                <Input id="unit" value={t('personalKPI.percent')} readOnly className="bg-muted" />
              </div>
            )}
          </div>

          {/* Existing Targets Warning */}
          {hasExistingTargets && (
            <Alert>
              <AlertDescription>
                {t('personalKPI.existingTargetsWarning', { 
                  type: targetType === 'report' ? t('personalKPI.report') : targetType === 'fix' ? t('personalKPI.fix') : t('personalKPI.closure'),
                  year: selectedYear 
                })}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Period Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('personalKPI.periodValues')}</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={copyP1ToAllPeriods}
                  disabled={periodValues['P1'] === undefined}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('personalKPI.copyP1ToAll')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {PERIODS.map(period => (
                  <div key={period} className="space-y-2">
                    <Label htmlFor={period}>{period}</Label>
                    <Input
                      id={period}
                      type="number"
                      value={periodValues[period] || ''}
                      onChange={(e) => setPeriodValues({ 
                        ...periodValues, 
                        [period]: parseFloat(e.target.value) || 0 
                      })}
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetForm}>
              {t('personalKPI.resetForm')}
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('personalKPI.cancel')}
              </Button>
              <Button onClick={handleSaveTargets} disabled={saving || loading}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('personalKPI.saving')}
                  </>
                ) : (
                  <>
                    <TargetIcon className="h-4 w-4 mr-2" />
                    {t('personalKPI.saveTargets')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalKPISetupModal;
