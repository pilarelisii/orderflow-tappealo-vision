import { Star } from "lucide-react";

/** Estrellas de solo lectura (admite medias, se redondea a la más cercana). */
export default function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}
