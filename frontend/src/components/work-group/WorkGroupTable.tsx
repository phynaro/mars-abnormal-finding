import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  workGroupService,
  type WorkGroup,
  type CreateWorkGroupRequest,
  type UpdateWorkGroupRequest,
} from '@/services/workGroupService';
import { userManagementService, type Department } from '@/services/userManagementService';
import { Edit2, Plus, Trash2 } from 'lucide-react';

type FormState = {
  name_en: string;
  name_th: string;
  description_en: string;
  description_th: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name_en: '',
  name_th: '',
  description_en: '',
  description_th: '',
  sort_order: '0',
  is_active: true,
};

const WorkGroupTable: React.FC = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptNos, setSelectedDeptNos] = useState<number[]>([]);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workGroupService.getAllWorkGroups();
      setGroups(data);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('workGroup.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadGroups();
    const loadDepartments = async () => {
      try {
        const data = await userManagementService.getDepartments();
        setDepartments(data);
      } catch (error) {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('workGroup.settings.departmentLoadFailed'),
          variant: 'destructive',
        });
      }
    };
    loadDepartments();
  }, [loadGroups, t, toast]);

  const openCreateDialog = () => {
    setEditingGroup(null);
    setFormData(emptyForm);
    setSelectedDeptNos([]);
    setDialogOpen(true);
  };

  const openEditDialog = async (group: WorkGroup) => {
    setEditingGroup(group);
    setFormData({
      name_en: group.name_en,
      name_th: group.name_th,
      description_en: group.description_en || '',
      description_th: group.description_th || '',
      sort_order: String(group.sort_order ?? 0),
      is_active: group.is_active !== false,
    });
    try {
      const mappedDepartments = await workGroupService.getWorkGroupDepartments(group.id);
      setSelectedDeptNos(mappedDepartments.map((item) => item.deptno));
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('workGroup.settings.departmentLoadFailed'),
        variant: 'destructive',
      });
      setSelectedDeptNos([]);
    }
    setDialogOpen(true);
  };

  const toggleDepartment = (deptNo: number) => {
    setSelectedDeptNos((prev) => (
      prev.includes(deptNo)
        ? prev.filter((item) => item !== deptNo)
        : [...prev, deptNo]
    ));
  };

  const handleSave = async () => {
    if (!formData.name_en.trim() || !formData.name_th.trim()) {
      toast({
        title: t('common.error'),
        description: t('workGroup.namesRequired'),
        variant: 'destructive',
      });
      return;
    }

    const sortOrder = parseInt(formData.sort_order, 10);
    const payload: CreateWorkGroupRequest | UpdateWorkGroupRequest = {
      name_en: formData.name_en.trim(),
      name_th: formData.name_th.trim(),
      description_en: formData.description_en.trim() || null,
      description_th: formData.description_th.trim() || null,
      sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      is_active: formData.is_active,
    };

    try {
      setSaving(true);
      let targetWorkGroupId: number | null = editingGroup?.id ?? null;
      if (editingGroup) {
        await workGroupService.updateWorkGroup(editingGroup.id, payload);
        targetWorkGroupId = editingGroup.id;
        toast({
          title: t('common.success'),
          description: t('workGroup.settings.updated'),
        });
      } else {
        const createResponse = await workGroupService.createWorkGroup(payload as CreateWorkGroupRequest);
        targetWorkGroupId = createResponse.data?.id ?? null;
        toast({
          title: t('common.success'),
          description: t('workGroup.settings.created'),
        });
      }

      if (targetWorkGroupId) {
        await workGroupService.updateWorkGroupDepartments(targetWorkGroupId, selectedDeptNos);
      }
      setDialogOpen(false);
      await loadGroups();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('workGroup.settings.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: WorkGroup) => {
    if (!window.confirm(t('workGroup.settings.deleteConfirm'))) return;

    try {
      await workGroupService.deleteWorkGroup(group.id);
      toast({
        title: t('common.success'),
        description: t('workGroup.settings.deleted'),
      });
      await loadGroups();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('workGroup.settings.deleteBlocked'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('workGroup.settings.add')}
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('workGroup.settings.sortOrder')}</TableHead>
                <TableHead>{language === 'en' ? 'Name (EN)' : 'ชื่อ (EN)'}</TableHead>
                <TableHead>{language === 'en' ? 'Name (TH)' : 'ชื่อ (TH)'}</TableHead>
                <TableHead>{t('workGroup.settings.departments')}</TableHead>
                <TableHead>{t('workGroup.description')}</TableHead>
                <TableHead>{t('workGroup.settings.status')}</TableHead>
                <TableHead className="text-right w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('workGroup.settings.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.sort_order ?? 0}</TableCell>
                    <TableCell className="font-medium">{group.name_en}</TableCell>
                    <TableCell>{group.name_th}</TableCell>
                    <TableCell>{group.department_count ?? 0}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {language === 'en' ? group.description_en : group.description_th}
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active !== false ? 'default' : 'secondary'}>
                        {group.is_active !== false
                          ? t('workGroup.settings.active')
                          : t('workGroup.settings.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void openEditDialog(group)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(group)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? t('workGroup.settings.edit') : t('workGroup.settings.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_en">Name (EN) *</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_th">Name (TH) *</Label>
                <Input
                  id="name_th"
                  value={formData.name_th}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name_th: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_en">{t('workGroup.description')} (EN)</Label>
              <Textarea
                id="description_en"
                value={formData.description_en}
                onChange={(e) => setFormData((prev) => ({ ...prev, description_en: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_th">{t('workGroup.description')} (TH)</Label>
              <Textarea
                id="description_th"
                value={formData.description_th}
                onChange={(e) => setFormData((prev) => ({ ...prev, description_th: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">{t('workGroup.settings.sortOrder')}</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="is_active">{t('workGroup.settings.active')}</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('workGroup.settings.departments')}</Label>
              <p className="text-xs text-muted-foreground">{t('workGroup.settings.departmentsHelper')}</p>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('workGroup.settings.departmentEmpty')}</p>
                ) : (
                  departments.map((department) => (
                    <label
                      key={department.deptNo}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeptNos.includes(department.deptNo)}
                        onChange={() => toggleDepartment(department.deptNo)}
                      />
                      <span>
                        {department.deptCode} - {department.deptName}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkGroupTable;
