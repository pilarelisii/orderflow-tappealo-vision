import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useCoupons } from "@/hooks/useCoupons";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import { Coupon } from "@/types/coupon";
import { CouponFormModal } from "@/components/CouponFormModal";

const formatDiscount = (c: Coupon) =>
  c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`;

const formatExpiry = (c: Coupon) => {
  if (!c.expires_at) return "Sin vencimiento";
  const d = new Date(c.expires_at);
  const expired = d.getTime() < Date.now();
  return `${expired ? "Venció" : "Vence"} el ${d.toLocaleDateString("es-AR")}`;
};

const formatUses = (c: Coupon) =>
  c.max_uses ? `${c.uses}/${c.max_uses} usos` : `${c.uses} ${c.uses === 1 ? "uso" : "usos"}`;

export default function CouponsManagement() {
  const {
    coupons,
    loading,
    codeExists,
    createCoupon,
    updateCoupon,
    removeCoupon,
    toggleEnabled,
  } = useCoupons();
  const { settings, loading: settingsLoading, updateSettings } = useVenueSettings();

  const toggleCouponsInMenu = async (enabled: boolean) => {
    try {
      await updateSettings({ coupons_enabled: enabled });
      toast.success(enabled ? "Cupones visibles en el menú" : "Cupones ocultos en el menú");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la configuración");
    }
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setOpen(true);
  };

  const onSubmit = async (payload: any) => {
    try {
      if (editing) await updateCoupon(editing.id, payload);
      else await createCoupon(payload);

      toast.success(editing ? "Cupón actualizado" : "Cupón creado");
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar el cupón");
    }
  };

  const onDelete = async (c: Coupon) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    try {
      await removeCoupon(c.id);
      toast.success("Cupón eliminado");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar el cupón");
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
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">Aceptar cupones en el menú público</p>
          <p className="text-xs text-muted-foreground">
            Tus clientes verán un campo para ingresar un código de descuento al confirmar el pedido.
          </p>
        </div>
        <Switch
          checked={settings.coupons_enabled}
          disabled={settingsLoading}
          onCheckedChange={toggleCouponsInMenu}
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cupones</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay cupones cargados</p>
        ) : (
          coupons.map((c) => (
            <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono font-medium truncate">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDiscount(c)} de descuento
                    {c.min_order ? ` · Mínimo $${c.min_order}` : ""} · {formatExpiry(c)} ·{" "}
                    {formatUses(c)} · {c.enabled ? "Activo" : "Desactivado"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={c.enabled}
                  onCheckedChange={() => toggleEnabled(c.id, c.enabled)}
                  aria-label={c.enabled ? "Desactivar cupón" : "Activar cupón"}
                />
                <Button variant="outline" size="icon" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CouponFormModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        codeExists={codeExists}
        onSubmit={onSubmit}
      />
    </div>
  );
}
