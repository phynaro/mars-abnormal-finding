import React from 'react';
import { Check } from 'lucide-react';

import { Label } from '@/components/ui/label';
import {
  DEFAULT_USER_EVENT_COLOR,
  USER_EVENT_COLORS,
  normalizeUserEventColorHex,
} from '@/constants/userEventColors';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  className?: string;
}

export function UserEventColorSwatch({
  color,
  className,
  title,
}: {
  color: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn('inline-block h-4 w-4 shrink-0 rounded-full border border-black/10', className)}
      style={{ backgroundColor: color }}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

const UserEventColorPicker: React.FC<Props> = ({ value, onChange, label, className }) => {
  const selected = normalizeUserEventColorHex(value || DEFAULT_USER_EVENT_COLOR);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {USER_EVENT_COLORS.map((color) => {
          const isSelected = selected === color.hex.toUpperCase();
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={color.id}
              title={color.hex}
              onClick={() => onChange(color.hex)}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected ? 'border-foreground scale-105' : 'border-transparent',
              )}
              style={{ backgroundColor: color.hex }}
            >
              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-white drop-shadow-sm" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UserEventColorPicker;
