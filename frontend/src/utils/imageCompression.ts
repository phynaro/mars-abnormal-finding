/**
 * Client-side image compression utilities
 * Helps reduce file sizes before upload to prevent 413 errors
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compress an image file using canvas
 * @param file - Input image file
 * @param options - Compression options
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Check if canvas is supported
    if (!HTMLCanvasElement.prototype.toBlob) {
      console.warn('Canvas toBlob not supported, returning original file');
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 
                        format === 'webp' ? 'image/webp' : 'image/png';
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Compress an image file for ticket uploads (higher quality than avatars)
 * @param file - Input image file
 * @param options - Compression options
 * @returns Promise<File> - Compressed image file
 */
export async function compressTicketImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.9,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Check if canvas is supported
    if (!HTMLCanvasElement.prototype.toBlob) {
      console.warn('Canvas toBlob not supported, returning original file');
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 
                        format === 'webp' ? 'image/webp' : 'image/png';
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if file size is within acceptable limits
 * @param file - File to check
 * @param maxSizeMB - Maximum size in MB
 * @returns boolean - Whether file is within limits
 */
export function isFileSizeValid(file: File, maxSizeMB: number = 20): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
