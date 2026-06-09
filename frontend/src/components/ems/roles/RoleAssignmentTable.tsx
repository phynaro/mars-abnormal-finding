import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import emsService, { type EmsRoleAssignment } from '@/services/emsService';
import type { Person } from '@/services/administrationService';
import type { EmsRole } from '@/utils/permissionChecker';
import PersonSearchCombobox from './PersonSearchCombobox';
import { EMS_ROLE_OPTIONS, emsRoleLabel } from './roleLabels';

interface RoleAssignmentTableProps {
  onChanged?: () => void;
}

const RoleAssignmentTable: React.FC<RoleAssignmentTableProps> = ({ onChanged }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<EmsRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personNo, setPersonNo] = useState('');
  const [personLabel, setPersonLabel] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmsRole>('calibrator');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emsService.listRoleAssignments();
      setItems(res.data.items);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.loadRolesFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectPerson = (person: Person) => {
    setPersonNo(String(person.PERSONNO));
    setPersonLabel(person.PERSON_NAME || `${person.FIRSTNAME} ${person.LASTNAME}`.trim());
  };

  const handleAdd = async () => {
    if (!personNo) {
      toast({ title: t('ems.settings.selectPersonFirst'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await emsService.assignRole(personNo, selectedRole);
      toast({ title: t('ems.settings.roleAssigned') });
      setPersonNo('');
      setPersonLabel('');
      await load();
      onChanged?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.assignFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setSaving(true);
    try {
      await emsService.removeRole(id);
      toast({ title: t('ems.settings.roleRemoved') });
      await load();
      onChanged?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('ems.settings.removeFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-end">
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
          <Label className="text-xs">{t('ems.settings.emsRole')}</Label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as EmsRole)}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMS_ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {emsRoleLabel(role, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving || !personNo}>
          {t('ems.settings.addRole')}
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ems.settings.person')}</TableHead>
              <TableHead>{t('ems.settings.rolesColumn')}</TableHead>
              <TableHead className="w-[80px]" />
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
                  {t('ems.settings.noRoles')}
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
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {emsRoleLabel(row.emsRole, t)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={saving}
                      aria-label={t('ems.settings.removeRole')}
                      onClick={() => handleRemove(row.id)}
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

export default RoleAssignmentTable;
