import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/product";
import { Star, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxFeatured?: number; // default 4
}

function formatARS(n?: number | null) {
  const val = Number(n ?? 0);
  if (!Number.isFinite(val)) return "";
  return `$${Math.round(val).toLocaleString("es-AR")}`;
}

export function FeaturedProductsModal({
  open,
  onOpenChange,
  maxFeatured = 4,
}: Props) {
  const { products, updateProduct } = useProducts();
  const [q, setQ] = useState("");
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const featuredCount = useMemo(() => {
    return products.filter((p: any) => Boolean((p as any).featured)).length;
  }, [products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...products];

    if (!term) return list;

    return list.filter((p) =>
      `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase().includes(term)
    );
  }, [products, q]);

  const toggleFeatured = async (p: Product) => {
    const isFeatured = Boolean((p as any).featured);
    const next = !isFeatured;

    if (next && featuredCount >= maxFeatured) {
      toast.error(`Solo podés destacar hasta ${maxFeatured} productos`);
      return;
    }

    setSavingIds((prev) => ({ ...prev, [p.id]: true }));
    try {
      await updateProduct(p.id, { featured: next } as any);
      toast.success(next ? "Producto destacado" : "Producto quitado de destacados");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar destacado");
    } finally {
      setSavingIds((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Star className="h-5 w-5" />
        Productos destacados
        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {featuredCount} / {maxFeatured}
        </span>
      </DialogTitle>
    </DialogHeader>

    {/* Descripción */}
    <div className="text-sm text-muted-foreground">
      Podés destacar hasta <b>{maxFeatured}</b> productos. Se muestran arriba del menú.
    </div>

    {/* Buscador */}
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Buscar producto</Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Café, medialuna, etc…"
          className="pl-8"
        />
      </div>
    </div>

    {/* Lista */}
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
      <div className="divide-y divide-border">
        {filtered.map((p) => {
          const isFeatured = Boolean((p as any).featured);
          const busy = Boolean(savingIds[p.id]);

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${
                busy ? "opacity-60" : ""
              }`}
            >
              {/* Izquierda */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{p.name}</p>
                  {isFeatured && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Destacado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {p.description}
                </p>
              </div>

              {/* Derecha */}
              <div className="flex flex-col items-end gap-1">
                <span className="font-semibold text-foreground">
                  ${Number(p.price).toLocaleString("es-AR")}
                </span>
                <Switch
                  checked={isFeatured}
                  disabled={busy}
                  onCheckedChange={() => toggleFeatured(p)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Footer */}
    <div className="flex justify-end pt-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cerrar
      </Button>
    </div>
  </DialogContent>
</Dialog>
  );
}