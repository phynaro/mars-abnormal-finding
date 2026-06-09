import React from 'react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { EmsEquipmentIdentity, EmsEquipmentSpecifications } from '@/services/emsService';
import EquipmentImageCard from './EquipmentImageCard';
import { EmsStatusBadge, emsStatusLabel } from './equipmentStatus';
import { formatEmsDate } from './formatEmsValues';

interface IdentitySectionProps {
  identity: EmsEquipmentIdentity;
  references?: Pick<EmsEquipmentSpecifications, 'ccpCode' | 'calRefWi' | 'calRefForm'>;
  className?: string;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

const IdentitySection: React.FC<IdentitySectionProps> = ({ identity, references, className }) => {
  const { t } = useLanguage();

  return (
    <Card className={cn('shadow-sm overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row items-start gap-4 p-4">
        <EquipmentImageCard
          imageUrl={identity.imageUrl}
          tagNo={identity.tagNo}
          className="self-center sm:self-start"
        />

        <div className="min-w-0 flex-1 space-y-3 lg:ml-5 sm:ml-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-base font-semibold leading-tight">{identity.tagNo}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2">{identity.description}</p>
            </div>
            <EmsStatusBadge
              status={identity.status}
              label={emsStatusLabel(identity.status, t)}
              className="shrink-0"
            />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Field label={t('ems.equipment.plant')} value={identity.plant} />
            <Field label={t('ems.equipment.area')} value={identity.area} />
            <Field label={t('ems.equipment.equipmentType')} value={identity.equipmentType} />
            <Field label={t('ems.equipment.manufacturer')} value={identity.manufacturer} />
            <Field label={t('ems.equipment.model')} value={identity.model} />
            <Field label={t('ems.equipment.serialNo')} value={identity.serialNo} />
            <Field label={t('ems.equipment.spec.ccpCode')} value={references?.ccpCode} />
            <Field label={t('ems.equipment.spec.calRefWi')} value={references?.calRefWi} />
            <Field label={t('ems.equipment.spec.calRefForm')} value={references?.calRefForm} />
          </dl>

          {identity.updatedByName && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              {t('ems.equipment.lastUpdated')}: {identity.updatedByName}
              {identity.updatedAt ? ` · ${formatEmsDate(identity.updatedAt)}` : ''}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default IdentitySection;
