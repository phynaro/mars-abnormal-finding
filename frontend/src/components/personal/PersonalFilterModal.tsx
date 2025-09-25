import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PersonalFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeFilter: string;
  setTimeFilter: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
  selectedPeriod: number;
  setSelectedPeriod: (value: number) => void;
}

const PersonalFilterModal: React.FC<PersonalFilterModalProps> = ({
  open,
  onOpenChange,
  timeFilter,
  setTimeFilter,
  selectedYear,
  setSelectedYear,
  selectedPeriod,
  setSelectedPeriod,
}) => {
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('personalFilter.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t('personalFilter.timeRange')}</Label>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('personalFilter.selectTimeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-year">{t('personalFilter.thisYear')}</SelectItem>
                <SelectItem value="last-year">{t('personalFilter.lastYear')}</SelectItem>
                <SelectItem value="this-period">{t('personalFilter.thisPeriod')}</SelectItem>
                <SelectItem value="select-period">{t('personalFilter.selectPeriod')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {timeFilter === 'select-period' && (
            <>
              <div className="space-y-2">
                <Label>{t('personalFilter.year')}</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('personalFilter.period')}</Label>
                <Select value={selectedPeriod.toString()} onValueChange={(value) => setSelectedPeriod(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>P{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              {t('personalFilter.applyFilters')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalFilterModal;
