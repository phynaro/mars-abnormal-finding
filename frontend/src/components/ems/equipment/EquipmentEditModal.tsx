import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EmsLandscapeDialogBody,
  EmsLandscapeDialogContent,
  EmsLandscapeDialogFooter,
  EmsLandscapeDialogHeader,
  EmsLandscapeDialogSection,
} from '@/components/ems/EmsLandscapeDialog';
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
import { useToast } from '@/hooks/useToast';
import emsService, {
  type EmsEquipmentDetail,
  type EmsEquipmentUpdatePayload,
} from '@/services/emsService';
import { compressImage } from '@/utils/imageCompression';
import EquipmentImageCard, { EQUIPMENT_THUMB_PX } from './EquipmentImageCard';

interface EquipmentEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: EmsEquipmentDetail | null;
  equipmentTypes: string[];
  onSaved: (data: EmsEquipmentDetail) => void;
}

type FormState = EmsEquipmentUpdatePayload;

function numToInput(value?: number | null): string {
  return value != null && Number.isFinite(value) ? String(value) : '';
}

function inputToNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function detailToForm(detail: EmsEquipmentDetail): FormState {
  const { identity, specifications } = detail;
  const wr = specifications.workingRange;
  const cr = specifications.calRange;
  const mpe = specifications.mpe;

  return {
    description: identity.description ?? '',
    area: identity.area ?? '',
    manufacturer: identity.manufacturer ?? '',
    model: identity.model ?? '',
    serialNo: identity.serialNo ?? '',
    equipmentType: identity.equipmentType ?? '',
    workingRangeMin: wr?.min ?? null,
    workingRangeMax: wr?.max ?? null,
    workingRangeUnit: wr?.unit ?? '',
    workingRangePoints: wr?.points ?? null,
    calRangeMin: cr?.min ?? null,
    calRangeMax: cr?.max ?? null,
    calRangeUnit: cr?.unit ?? '',
    calRangePoints: cr?.points ?? null,
    mpeType: mpe?.type ?? '',
    mpeValue: mpe?.value ?? null,
    mpeUnit: mpe?.unit ?? '',
    mpeCondition: mpe?.condition ?? '',
    ccpCode: specifications.ccpCode ?? identity.ccpCode ?? '',
    calRefWi: specifications.calRefWi ?? identity.calRefWi ?? '',
    calRefForm: specifications.calRefForm ?? identity.calRefForm ?? '',
    calInterval: specifications.calInterval ?? identity.calInterval ?? '',
    calIntervalWeeks: specifications.calIntervalWeeks ?? identity.calIntervalWeeks ?? null,
  };
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1.5 sm:gap-3 items-center">
      <Label className="text-xs text-muted-foreground sm:text-right">{label}</Label>
      {children}
    </div>
  );
}

const EquipmentEditModal: React.FC<EquipmentEditModalProps> = ({
  open,
  onOpenChange,
  detail,
  equipmentTypes,
  onSaved,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !detail) return;
    setForm(detailToForm(detail));
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  }, [detail, open]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const typeOptions = useMemo(() => {
    const set = new Set(equipmentTypes.filter(Boolean));
    if (form.equipmentType?.trim()) set.add(form.equipmentType.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [equipmentTypes, form.equipmentType]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1024, quality: 0.85 });
      setImageFile(compressed);
      setError(null);
    } catch {
      setError(t('ems.equipment.imageUploadError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    try {
      setSaving(true);
      setError(null);
      const res = await emsService.updateEquipment(detail.identity.tagNo, form, imageFile ?? undefined);
      toast({
        title: t('common.success'),
        description: t('ems.equipment.saveSuccess'),
      });
      onOpenChange(false);
      onSaved(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error');
      setError(message);
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EmsLandscapeDialogContent>
        <EmsLandscapeDialogHeader>
          <DialogTitle>{t('ems.equipment.editTitle')}</DialogTitle>
          <DialogDescription>{detail?.identity.tagNo}</DialogDescription>
        </EmsLandscapeDialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <EmsLandscapeDialogBody>
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
              <div className="space-y-6">
                <EmsLandscapeDialogSection title={t('ems.equipment.editSectionIdentity')}>
                  <FieldRow label={t('ems.equipment.col.description')}>
                    <Input
                      value={form.description ?? ''}
                      onChange={(e) => setField('description', e.target.value)}
                    />
                  </FieldRow>
                  <FieldRow label={t('ems.equipment.area')}>
                    <Input value={form.area ?? ''} onChange={(e) => setField('area', e.target.value)} />
                  </FieldRow>
                  <FieldRow label={t('ems.equipment.equipmentType')}>
                    <Select
                      value={form.equipmentType || undefined}
                      onValueChange={(v) => setField('equipmentType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('ems.equipment.filter.allTypes')} />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label={t('ems.equipment.manufacturer')}>
                    <Input
                      value={form.manufacturer ?? ''}
                      onChange={(e) => setField('manufacturer', e.target.value)}
                    />
                  </FieldRow>
                  <FieldRow label={t('ems.equipment.model')}>
                    <Input value={form.model ?? ''} onChange={(e) => setField('model', e.target.value)} />
                  </FieldRow>
                  <FieldRow label={t('ems.equipment.serialNo')}>
                    <Input
                      value={form.serialNo ?? ''}
                      onChange={(e) => setField('serialNo', e.target.value)}
                    />
                  </FieldRow>
                </EmsLandscapeDialogSection>

                <EmsLandscapeDialogSection title={t('ems.equipment.image')}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {imagePreview ? (
                      <div
                        className="equipment-thumb flex-none overflow-hidden rounded-md border border-dashed bg-muted/40"
                        style={{
                          width: EQUIPMENT_THUMB_PX.base,
                          height: EQUIPMENT_THUMB_PX.base,
                          minWidth: EQUIPMENT_THUMB_PX.base,
                          maxWidth: EQUIPMENT_THUMB_PX.base,
                          minHeight: EQUIPMENT_THUMB_PX.base,
                          maxHeight: EQUIPMENT_THUMB_PX.base,
                        }}
                      >
                        <img
                          src={imagePreview}
                          alt=""
                          className="block h-full w-full object-cover"
                          width={EQUIPMENT_THUMB_PX.base}
                          height={EQUIPMENT_THUMB_PX.base}
                        />
                      </div>
                    ) : (
                      <EquipmentImageCard
                        imageUrl={detail?.identity.imageUrl}
                        tagNo={detail?.identity.tagNo ?? ''}
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <FileUpload
                        accept="image/*"
                        onChange={handleImageChange}
                        placeholder={t('ems.equipment.uploadImage')}
                        className="w-full"
                      />
                      {imageFile && (
                        <p className="truncate text-xs text-muted-foreground">{imageFile.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{t('ems.equipment.uploadImageHint')}</p>
                    </div>
                  </div>
                </EmsLandscapeDialogSection>
              </div>

              <EmsLandscapeDialogSection title={t('ems.equipment.spec.title')}>
                <FieldRow label={t('ems.equipment.spec.workingRange')}>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <Input
                      placeholder="Min"
                      value={numToInput(form.workingRangeMin)}
                      onChange={(e) => setField('workingRangeMin', inputToNum(e.target.value))}
                    />
                    <Input
                      placeholder="Max"
                      value={numToInput(form.workingRangeMax)}
                      onChange={(e) => setField('workingRangeMax', inputToNum(e.target.value))}
                    />
                    <Input
                      placeholder={t('ems.equipment.editUnit')}
                      value={form.workingRangeUnit ?? ''}
                      onChange={(e) => setField('workingRangeUnit', e.target.value)}
                    />
                    <Input
                      placeholder={t('ems.equipment.spec.workingRangePoints')}
                      value={numToInput(form.workingRangePoints)}
                      onChange={(e) => setField('workingRangePoints', inputToNum(e.target.value))}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.calRange')}>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <Input
                      placeholder="Min"
                      value={numToInput(form.calRangeMin)}
                      onChange={(e) => setField('calRangeMin', inputToNum(e.target.value))}
                    />
                    <Input
                      placeholder="Max"
                      value={numToInput(form.calRangeMax)}
                      onChange={(e) => setField('calRangeMax', inputToNum(e.target.value))}
                    />
                    <Input
                      placeholder={t('ems.equipment.editUnit')}
                      value={form.calRangeUnit ?? ''}
                      onChange={(e) => setField('calRangeUnit', e.target.value)}
                    />
                    <Input
                      placeholder={t('ems.equipment.spec.calRangePoints')}
                      value={numToInput(form.calRangePoints)}
                      onChange={(e) => setField('calRangePoints', inputToNum(e.target.value))}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.mpe')}>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <Input
                      placeholder="Type"
                      value={form.mpeType ?? ''}
                      onChange={(e) => setField('mpeType', e.target.value)}
                    />
                    <Input
                      placeholder="Value"
                      value={numToInput(form.mpeValue)}
                      onChange={(e) => setField('mpeValue', inputToNum(e.target.value))}
                    />
                    <Input
                      placeholder={t('ems.equipment.editUnit')}
                      value={form.mpeUnit ?? ''}
                      onChange={(e) => setField('mpeUnit', e.target.value)}
                    />
                    <Input
                      placeholder="Condition"
                      value={form.mpeCondition ?? ''}
                      onChange={(e) => setField('mpeCondition', e.target.value)}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.ccpCode')}>
                  <Input value={form.ccpCode ?? ''} onChange={(e) => setField('ccpCode', e.target.value)} />
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.calRefWi')}>
                  <Input value={form.calRefWi ?? ''} onChange={(e) => setField('calRefWi', e.target.value)} />
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.calRefForm')}>
                  <Input
                    value={form.calRefForm ?? ''}
                    onChange={(e) => setField('calRefForm', e.target.value)}
                  />
                </FieldRow>
                <FieldRow label={t('ems.equipment.spec.calInterval')}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={form.calInterval ?? ''}
                      onChange={(e) => setField('calInterval', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder={t('ems.equipment.spec.weeks')}
                      value={numToInput(form.calIntervalWeeks)}
                      onChange={(e) => setField('calIntervalWeeks', inputToNum(e.target.value))}
                    />
                  </div>
                </FieldRow>
              </EmsLandscapeDialogSection>
            </div>
          </EmsLandscapeDialogBody>

          <EmsLandscapeDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('ems.equipment.saving') : t('ems.equipment.save')}
            </Button>
          </EmsLandscapeDialogFooter>
        </form>
      </EmsLandscapeDialogContent>
    </Dialog>
  );
};

export default EquipmentEditModal;
