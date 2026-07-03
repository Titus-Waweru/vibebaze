/**
 * Client-side image compression.
 * - Re-encodes via canvas which strips EXIF/GPS metadata automatically.
 * - Resizes to fit within maxDimension while preserving aspect ratio.
 * - Outputs WebP when supported, falls back to JPEG.
 */

const MAX_DIMENSION = 1920;
const QUALITY = 0.82;

let webpSupported: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Compress an image file. On any failure returns the original file unchanged.
 * GIFs and SVGs are returned untouched (animation/vector preservation).
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const maxDim = opts.maxDimension ?? MAX_DIMENSION;
  const quality = opts.quality ?? QUALITY;

  try {
    const img = await loadImage(file);
    let { width, height } = img;
    if (width <= 0 || height <= 0) return file;

    const largest = Math.max(width, height);
    if (largest > maxDim) {
      const scale = maxDim / largest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const useWebp = supportsWebp();
    const mime = useWebp ? "image/webp" : "image/jpeg";
    const ext = useWebp ? "webp" : "jpg";

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    );
    if (!blob) return file;

    // If compression made it larger (small images), keep original.
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Image compression failed, using original:", err);
    return file;
  }
}