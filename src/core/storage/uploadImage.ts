import imageCompression from "browser-image-compression";
import { storage } from "@/integrations/firebase/client";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

type UploadKind = "logo" | "product" | "promotion";

type UploadOptions = {
  venueId: string;
  kind: UploadKind;
  entityId?: string; // productId / promoId / "venue"
  maxMB?: number; // límite post compresión
  maxSize?: number; // lado mayor px
  onProgress?: (pct: number) => void;
  signal?: AbortSignal; // para cancelar
};

function extFromMime(mime: string) {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "jpg";
}

// Convert a File/Blob a WEBP via canvas (robusto en web)
async function toWebpBlob(file: File, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas");

  ctx.drawImage(bitmap, 0, 0);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality)
  );

  if (!blob) throw new Error("No se pudo convertir a webp");
  return blob;
}

export async function uploadOptimizedImage(
  file: File,
  opts: UploadOptions
): Promise<{ path: string; url: string; contentType: string }> {
  const {
    venueId,
    kind,
    entityId,
    maxMB = 0.9,
    maxSize = kind === "logo" ? 900 : 1400,
    onProgress,
    signal,
  } = opts;

  // ✅ Validaciones duras
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Imagen demasiado grande (máx 12MB)");
  }

  // 1) compresión/resize (mantiene ratio)
  const compressed = await imageCompression(file, {
    maxSizeMB: maxMB,
    maxWidthOrHeight: maxSize,
    useWebWorker: true,
    fileType: "image/jpeg", // compresión eficiente antes de pasar a webp
    initialQuality: 0.85,
  });

  // 2) convertir a webp para delivery (menor peso)
  const webpBlob = await toWebpBlob(
    compressed instanceof File ? compressed : file,
    0.82
  );

  const contentType = "image/webp";
  const ext = extFromMime(contentType);

  const safeEntity = entityId || (kind === "logo" ? "venue" : "unknown");
  const ts = Date.now();
  const rand = Math.random().toString(16).slice(2);
  const filename = `${ts}-${rand}.${ext}`;

  // 3) paths consistentes por tipo
  const base =
    kind === "logo"
      ? `venues/${venueId}/logo`
      : kind === "product"
      ? `venues/${venueId}/products/${safeEntity}`
      : `venues/${venueId}/promotions/${safeEntity}`;

  const path = `${base}/${filename}`;
  const fileRef = ref(storage, path);

  // 4) subida con progress
  const task = uploadBytesResumable(fileRef, webpBlob, {
    contentType,
    cacheControl: "public,max-age=31536000,immutable",
  });

  // abort (cancel)
  if (signal) {
    if (signal.aborted) task.cancel();
    signal.addEventListener("abort", () => task.cancel(), { once: true });
  }

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (!onProgress) return;
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress(Math.round(pct));
      },
      (err) => reject(err),
      () => resolve()
    );
  });

  const url = await getDownloadURL(fileRef);
  return { path, url, contentType };
}

// ✅ helper opcional para borrar una imagen anterior si guardás storage_path
export async function deleteImageByPath(path: string) {
  if (!path) return;
  await deleteObject(ref(storage, path));
}