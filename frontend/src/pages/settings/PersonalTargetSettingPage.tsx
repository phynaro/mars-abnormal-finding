import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import personnelService, { type Person, type Department } from '@/services/personnelService';
import personalTargetService, { type PersonalTarget } from '@/services/personalTargetService';
import PersonalKPISetupModal from '@/components/personal/PersonalKPISetupModal';
import { Target as TargetIcon, Search, RefreshCw } from 'lucide-react';

const TARGET_TYPES = ['report', 'closure'] as const;
type TargetType = (typeof TARGET_TYPES)[number];

const PersonalTargetSettingPage: React.FC = () => {
  const { t } = useLanguage();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [deptNo, setDeptNo] = useState<string>('all');
  const [persons, setPersons] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [targetsByPersonAndType, setTargetsByPersonAndType] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPersonno, setModalPersonno] = useState<number | null>(null);
  const [modalPersonDisplayName, setModalPersonDisplayName] = useState('');
  const [modalTargetType, setModalTargetType] = useState<TargetType>('report');

  const fetchDepartments = useCallback(async () => {
    try {
      setDepartmentsLoading(true);
      const res = await personnelService.getDepartments({ limit: 500 });
      if (res.success && res.data) setDepartments(res.data);
      else setDepartments([]);
    } catch (e) {
      console.error('Error fetching departments:', e);
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const fetchPersons = useCallback(async () => {
    try {
      setLoading(true);
      const params: { search?: string; deptNo?: number; limit: number } = { limit: 500 };
      if (search.trim()) params.search = search.trim();
      if (deptNo && deptNo !== 'all') params.deptNo = parseInt(deptNo, 10);
      const res = await personnelService.getPersons(params);
      if (res.success && res.data) setPersons(res.data);
      else setPersons([]);
    } catch (e) {
      console.error('Error fetching persons:', e);
      setPersons([]);
    } finally {
      setLoading(false);
    }
  }, [search, deptNo]);

  const fetchTargetsForYear = useCallback(async () => {
    try {
      const res = await personalTargetService.getPersonalTargets({ year });
      if (!res.success || !res.data) {
        setTargetsByPersonAndType(new Set());
        return;
      }
      const set = new Set<string>();
      (res.data as PersonalTarget[]).forEach((target) => {
        set.add(`${target.PERSONNO}-${target.type}`);
      });
      setTargetsByPersonAndType(set);
    } catch (e) {
      console.error('Error fetching targets for year:', e);
      setTargetsByPersonAndType(new Set());
    }
  }, [year]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  useEffect(() => {
    fetchTargetsForYear();
  }, [fetchTargetsForYear]);

  const hasTarget = (personno: number, type: TargetType) =>
    targetsByPersonAndType.has(`${personno}-${type}`);

  const openModal = (person: Person, type: TargetType) => {
    setModalPersonno(person.PERSONNO);
    setModalPersonDisplayName((person.PERSON_NAME ?? `${person.FIRSTNAME ?? ''} ${person.LASTNAME ?? ''}`.trim()) || `#${person.PERSONNO}`);
    setModalTargetType(type);
    setModalOpen(true);
  };

  const handleTargetsUpdated = () => {
    fetchTargetsForYear();
  };

  const typeLabels: Record<TargetType, string> = {
    report: t('personalTargetSetting.report'),
    closure: t('personalTargetSetting.closure'),
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <TargetIcon className="h-6 w-6" />
          {t('personalTargetSetting.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('personalTargetSetting.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('personalTargetSetting.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('personalTargetSetting.year')}</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                min={2020}
                max={2030}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('personalTargetSetting.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('personalTargetSetting.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('personalTargetSetting.department')}</Label>
              <Select value={deptNo} onValueChange={setDeptNo} disabled={departmentsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={t('personalTargetSetting.allDepartments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('personalTargetSetting.allDepartments')}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.DEPTNO} value={String(d.DEPTNO)}>
                      {d.DEPTNAME ?? d.DEPTCODE ?? String(d.DEPTNO)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { fetchPersons(); fetchTargetsForYear(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('personalTargetSetting.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('personalTargetSetting.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">{t('personalTargetSetting.loading')}</p>
          ) : persons.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">{t('personalTargetSetting.noEmployees')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('personalTargetSetting.name')}</TableHead>
                    <TableHead>{t('personalTargetSetting.code')}</TableHead>
                    <TableHead>{t('personalTargetSetting.departmentColumn')}</TableHead>
                    <TableHead className="text-center">{typeLabels.report}</TableHead>
                    <TableHead className="text-center">{typeLabels.closure}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persons.map((person) => (
                    <TableRow key={person.PERSONNO}>
                      <TableCell>{(person.PERSON_NAME ?? `${person.FIRSTNAME ?? ''} ${person.LASTNAME ?? ''}`.trim()) || `#${person.PERSONNO}`}</TableCell>
                      <TableCell>{person.PERSONCODE ?? person.PERSONNO}</TableCell>
                      <TableCell>{person.DEPTNAME ?? person.DEPTCODE ?? '—'}</TableCell>
                      {TARGET_TYPES.map((type) => (
                        <TableCell key={type} className="text-center">
                          <Button
                            variant={hasTarget(person.PERSONNO, type) ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => openModal(person, type)}
                          >
                            {hasTarget(person.PERSONNO, type) ? t('personalTargetSetting.editTargets') : t('personalTargetSetting.setTargets')}
                          </Button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PersonalKPISetupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTargetsUpdated={handleTargetsUpdated}
        targetType={modalTargetType}
        personno={modalPersonno ?? undefined}
        personDisplayName={modalPersonDisplayName}
      />
    </div>
  );
};

export default PersonalTargetSettingPage;
