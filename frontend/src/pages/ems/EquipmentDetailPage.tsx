import React, { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import emsService, { type EmsEquipmentDetail } from '@/services/emsService';
import IdentitySection from '@/components/ems/equipment/IdentitySection';
import SpecSection from '@/components/ems/equipment/SpecSection';
import WoStatusSection from '@/components/ems/equipment/WoStatusSection';
import EquipmentEditModal from '@/components/ems/equipment/EquipmentEditModal';
import { EQUIPMENT_THUMB_PX } from '@/components/ems/equipment/EquipmentImageCard';
import { EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const EquipmentDetailPage: React.FC = () => {
  const { tagNo } = useParams<{ tagNo: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState<EmsEquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);

  const loadDetail = useCallback(async (historyLimit = 5) => {
    if (!tagNo) return;
    const res = await emsService.getEquipmentDetail(tagNo, historyLimit);
    setData(res.data);
  }, [tagNo]);

  useEffect(() => {
    if (!tagNo) return;
    setLoading(true);
    setError(null);
    setHistoryExpanded(false);
    loadDetail(5)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [tagNo, loadDetail, t]);

  useEffect(() => {
    emsService.getMe()
      .then((me) => setCanEdit((me.emsRoles?.length ?? 0) > 0))
      .catch(() => setCanEdit(false));
    emsService.getFilterOptions()
      .then((res) => setEquipmentTypes(res.data.equipmentTypes || []))
      .catch(() => setEquipmentTypes([]));
  }, []);

  const expandHistory = async () => {
    setHistoryExpanded(true);
    setHistoryLoading(true);
    try {
      await loadDetail(50);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <EmsPageStack>
      <PageHeader
        title={tagNo || t('ems.nav.equipment')}
        showBackButton
        onBack={() => navigate('/ems/equipment')}
        rightContent={
          canEdit && data ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              {t('ems.equipment.edit')}
            </Button>
          ) : undefined
        }
      />

      {loading && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Skeleton
                className="shrink-0 rounded-md self-center sm:self-start"
                style={{ width: EQUIPMENT_THUMB_PX.base, height: EQUIPMENT_THUMB_PX.base }}
              />
              <Skeleton className="h-36 w-full sm:flex-1 min-w-0 rounded-md sm:ml-3" />
            </div>
          </div>
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <IdentitySection
            identity={data.identity}
            references={data.specifications}
          />

          <SpecSection specifications={data.specifications} />
          <WoStatusSection
            currentWo={data.currentWo}
            pmHistory={data.pmHistory}
            historyExpanded={historyExpanded}
            historyLoading={historyLoading}
            onExpandHistory={expandHistory}
          />
        </div>
      )}

      {data && (
        <EquipmentEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          detail={data}
          equipmentTypes={equipmentTypes}
          onSaved={(updated) => setData(updated)}
        />
      )}
    </EmsPageStack>
  );
};

export default EquipmentDetailPage;
