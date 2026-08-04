import React from 'react';
import { ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { resolveEquipmentImageSrc } from './equipmentImageUtils';
import { EQUIPMENT_THUMB_PX } from './equipmentImageConstants';

/** Fixed square (px) — must not grow inside flex layouts. */
interface EquipmentImageCardProps {
  imageUrl?: string | null;
  tagNo: string;
  className?: string;
}

const EquipmentImageCard: React.FC<EquipmentImageCardProps> = ({ imageUrl, tagNo, className }) => {
  const { t } = useLanguage();
  const src = resolveEquipmentImageSrc(imageUrl);

  return (
    <div
      className={cn(
        'equipment-thumb flex-none overflow-hidden rounded-md border border-dashed bg-muted/40',
        className,
      )}
      style={{
        width: EQUIPMENT_THUMB_PX.base,
        height: EQUIPMENT_THUMB_PX.base,
        minWidth: EQUIPMENT_THUMB_PX.base,
        maxWidth: EQUIPMENT_THUMB_PX.base,
        minHeight: EQUIPMENT_THUMB_PX.base,
        maxHeight: EQUIPMENT_THUMB_PX.base,
        flexShrink: 0,
      }}
      aria-hidden={!src}
    >
      {src ? (
        <img
          src={src}
          alt={tagNo}
          className="block h-full w-full object-cover"
          width={EQUIPMENT_THUMB_PX.base}
          height={EQUIPMENT_THUMB_PX.base}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-muted-foreground">
          <ImageIcon className="h-6 w-6 opacity-40" aria-hidden />
          <span className="text-[10px] text-center leading-tight">{t('ems.equipment.noImage')}</span>
        </div>
      )}
    </div>
  );
};

export default EquipmentImageCard;
