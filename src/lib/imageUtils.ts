/**
 * Convert an image file to WebP format and compress it
 * @param file - The original image file (JPG, PNG, etc.)
 * @param maxSizeKB - Maximum file size in KB (default 5MB = 5120KB)
 * @param maxWidth - Maximum width in pixels (default 1920)
 * @param maxHeight - Maximum height in pixels (default 1920)
 * @returns Promise<File> - The converted WebP file
 */
export async function convertToWebP(
  file: File,
  maxSizeKB: number = 5120,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small enough and is webp, return as-is
    if (file.type === 'image/webp' && file.size <= maxSizeKB * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to meet size requirement
      const tryCompress = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // If size is acceptable or quality is already minimum, use this
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              const newFileName = file.name.replace(/\.[^.]+$/, '.webp');
              const webpFile = new File([blob], newFileName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(webpFile);
            } else {
              // Try with lower quality
              tryCompress(quality - 0.1);
            }
          },
          'image/webp',
          quality
        );
      };

      // Start with high quality
      tryCompress(0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if image needs conversion (is JPG or PNG)
 */
export function needsConversion(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}
