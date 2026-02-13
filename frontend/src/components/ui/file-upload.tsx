import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from './button';
import { Upload, Camera } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showCamera?: boolean;
}

export interface FileUploadRef {
  reset: () => void;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({
  accept = "*/*",
  multiple = false,
  onChange,
  className = "",
  disabled = false,
  placeholder = "Choose Files",
  showCamera = false
}, ref) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  useImperativeHandle(ref, () => ({
    reset: resetInputs
  }));

  const triggerFileInput = (capture?: boolean) => {
    if (disabled) return;
    if (capture && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange && event.target.files) {
      onChange(event.target.files);
    }
    resetInputs();
  };

  const isImageAccept = accept.startsWith('image');
  const showTwoButtons = showCamera && isImageAccept;

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input (gallery / files) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      {/* Hidden file input for camera (when showCamera) */}
      {showTwoButtons && (
        <input
          ref={cameraInputRef}
          type="file"
          accept={accept}
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      )}

      {showTwoButtons ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => triggerFileInput(true)}
            disabled={disabled}
            className="w-full justify-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {t('ticket.wizardTakePhoto')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => triggerFileInput(false)}
            disabled={disabled}
            className="w-full justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t('ticket.wizardChooseFromGallery')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => triggerFileInput(false)}
          disabled={disabled}
          className="w-full justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {placeholder}
        </Button>
      )}
    </div>
  );
});
