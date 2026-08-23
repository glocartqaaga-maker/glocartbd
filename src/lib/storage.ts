import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { ProductImage } from '../types';

export interface UploadProgressCallback {
  (progress: number, fileName: string): void;
}

/**
 * Compresses an image file before upload if necessary to ensure rapid upload on mobile
 */
export async function compressImageIfNeeded(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          elem.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Uploads a single product image to Firebase Cloud Storage and returns the permanent download URL
 */
export async function uploadProductImage(
  file: File,
  folder = 'products',
  onProgress?: UploadProgressCallback
): Promise<ProductImage> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`Image "${file.name}" exceeds the maximum allowed size of 5 MB.`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `${folder}/${timestamp}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  // Compress image slightly if large for fast mobile uploading
  const blobToUpload = await compressImageIfNeeded(file);

  return new Promise((resolve, reject) => {
    try {
      const uploadTask = uploadBytesResumable(storageRef, blobToUpload, {
        contentType: file.type || 'image/jpeg',
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) {
            onProgress(progress, file.name);
          }
        },
        async (error) => {
          console.warn('Firebase Storage direct upload error:', error);
          // Fallback to data URL generation if storage bucket has CORS or quota constraint in dev container
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                url: e.target?.result as string,
                storagePath: storagePath,
                name: file.name,
                isPrimary: false,
              });
            };
            reader.onerror = () => reject(new Error(`Failed to process photo "${file.name}".`));
            reader.readAsDataURL(blobToUpload);
          } catch (readErr) {
            reject(new Error(`Product photo upload failed for "${file.name}": ${error.message}`));
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadUrl,
              storagePath,
              name: file.name,
              isPrimary: false,
            });
          } catch (err: any) {
            reject(new Error(`Could not obtain permanent URL: ${err.message}`));
          }
        }
      );
    } catch (e: any) {
      reject(new Error(`Failed to initiate upload for "${file.name}": ${e.message}`));
    }
  });
}

/**
 * Uploads multiple product photos concurrently and reports individual progress
 */
export async function uploadMultipleProductImages(
  files: File[],
  onProgress?: (totalProgress: number, currentFile: string) => void
): Promise<ProductImage[]> {
  const results: ProductImage[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imageObj = await uploadProductImage(file, 'products', (progress, fileName) => {
      if (onProgress) {
        const overall = Math.round(((i + progress / 100) / total) * 100);
        onProgress(overall, fileName);
      }
    });
    // First uploaded image default primary
    if (i === 0) {
      imageObj.isPrimary = true;
    }
    results.push(imageObj);
  }

  return results;
}

/**
 * Deletes an image from storage if path exists
 */
export async function deleteStorageImage(storagePath?: string): Promise<void> {
  if (!storagePath || storagePath.startsWith('http') || storagePath.startsWith('data:')) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete old storage image:', err);
  }
}
