import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { uploadOptimizedImage } from "@/core/storage/uploadImage";

type ImageUploadType = "product" | "promotion" | "logo";

interface ImageUploadBoxProps {
  label?: string;
  venueId: string;
  type: ImageUploadType;

  /** productId | promoId | "venue" */
  entityId: string;

  /** preview inicial (image_url existente) */
  initialImage?: string | null;

  /** path anterior para borrar */
  previousPath?: string | null;

  /** callback al subir */
  onUploaded: (data: { url: string; path: string }) => void;
}

export function ImageUploadBox({
  label = "Imagen",
  venueId,
  type,
  entityId,
  initialImage,
  previousPath,
  onUploaded,
}: ImageUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImage ?? null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSelect = async (file: File) => {
    setLoading(true);
    setProgress(0);

    // preview inmediata
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const { url, path } = await uploadOptimizedImage(file, {
        venueId,
        kind: type,
        entityId,
        onProgress: setProgress,
        maxSize: type === "logo" ? 900 : 1400,
        maxMB: type === "logo" ? 0.6 : 0.9,
      });

      onUploaded({ url, path });
    } catch (e) {
      console.error(e);
      setPreview(initialImage ?? null);
    } finally {
      setLoading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <label className="cursor-pointer block">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSelect(file);
          }}
        />

        <div className="relative w-full h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                Click para subir imagen
              </p>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-xs">{progress}%</span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}