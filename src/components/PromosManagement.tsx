import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { usePromotions } from "@/hooks/usePromotions";
import { Promotion } from "@/types/promotion";
import { PromotionFormModal } from "@/components/PromotionFormModal";
import { useAuth } from "@/hooks/useAuth";

export default function PromosManagement() {
  const { venue } = useAuth();
  const { products } = useProducts();
  const { promotions, loading, createPromotion, updatePromotion, removePromotion, toggleEnabled } =
    usePromotions();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setOpen(true);
  };

  const onSubmit = async (payload: any) => {
    try {
      if (editing) await updatePromotion(editing.id, payload);
      else await createPromotion(payload);

      toast.success(editing ? "Promoción actualizada" : "Promoción creada");
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar promoción");
    }
  };

  const onDelete = async (p: Promotion) => {
    try {
      await removePromotion(p.id);
      toast.success("Promoción eliminada");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar promoción");
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Promociones</h3>
        <Button size="sm" onClick={openCreate} disabled={promotions.length >= 1 && venue?.plan === "demo"}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {promotions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay promociones</p>
        ) : (
          promotions.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name ?? "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground">
                  ${p.price} • items: {p.items?.length ?? 0} • {p.enabled ? "Activa" : "Desactivada"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => toggleEnabled(p.id, p.enabled)}>
                  {p.enabled ? "ON" : "OFF"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onDelete(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ modal */}
      {venue?.id ? (
        <PromotionFormModal
          open={open}
          onClose={() => setOpen(false)}
          venueId={venue.id}
          products={products}
          initial={editing}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}