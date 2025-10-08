import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from './button';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
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
  placeholder = "Choose Files"
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }));

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.files);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        disabled={disabled}
      />
      
      {/* Custom styled button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={disabled}
        className="w-full justify-center gap-2"
      >
        <Upload className="h-4 w-4" />
        {placeholder}
      </Button>
    </div>
  );
});
