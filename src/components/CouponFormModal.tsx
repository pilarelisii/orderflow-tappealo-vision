import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Coupon, CouponDiscountType, CouponPayload } from "@/types/coupon";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Coupon | null; // null => crear
  codeExists: (code: string, ignoreId?: string) => boolean;
  onSubmit: (payload: CouponPayload) => Promise<void>;
};

const toDateInputValue = (iso: string | null) => {
  if (!iso) return "";
  return iso.slice(0, 10);
};

export function CouponFormModal({ open, onClose, initial, codeExists, onSubmit }: Props) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    initial?.discount_type ?? "percentage"
  );
  const [discountValue, setDiscountValue] = useState<number>(Number(initial?.discount_value ?? 0));
  const [enabled, setEnabled] = useState(Boolean(initial?.enabled ?? true));
  const [expiresAt, setExpiresAt] = useState<string>(toDateInputValue(initial?.expires_at ?? null));
  const [minOrder, setMinOrder] = useState<string>(initial?.min_order ? String(initial.min_order) : "");
  const [maxUses, setMaxUses] = useState<string>(initial?.max_uses ? String(initial.max_uses) : "");

  useEffect(() => {
    if (!open) return;

    setCode(initial?.code ?? "");
    setDiscountType(initial?.discount_type ?? "percentage");
    setDiscountValue(Number(initial?.discount_value ?? 0));
    setEnabled(Boolean(initial?.enabled ?? true));
    setExpiresAt(toDateInputValue(initial?.expires_at ?? null));
    setMinOrder(initial?.min_order ? String(initial.min_order) : "");
    setMaxUses(initial?.max_uses ? String(initial.max_uses) : "");
  }, [open, initial?.id]);

  const save = async () => {
    const trimmedCode = code.trim();

    if (!trimmedCode) return toast.error("El código es requerido");
    if (codeExists(trimmedCode, initial?.id)) return toast.error("Ya existe un cupón con ese código");
    if (discountValue <= 0) return toast.error("El descuento debe ser mayor a 0");
    if (discountType === "percentage" && discountValue > 100) {
      return toast.error("El descuento no puede ser mayor a 100%");
    }

    await onSubmit({
      code: trimmedCode,
      discount_type: discountType,
      discount_value: Number(discountValue),
      enabled,
      expires_at: expiresAt ? new Date(`${expiresAt}T00:00:00`) : null,
      min_order: Number(minOrder) > 0 ? Number(minOrder) : null,
      max_uses: Number(maxUses) > 0 ? Math.floor(Number(maxUses)) : null,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cupón" : "Nuevo cupón"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BIENVENIDO10"
              className="font-mono uppercase"
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p className="font-medium">Habilitado</p>
              <p className="text-xs text-muted-foreground">El cliente puede usarlo</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de descuento</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as CouponDiscountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{discountType === "percentage" ? "Descuento (%)" : "Descuento ($)"}</Label>
              <Input
                type="number"
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pedido mínimo ($)</Label>
              <Input
                type="number"
                min={0}
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="Sin mínimo"
              />
            </div>
            <div className="space-y-2">
              <Label>Límite de usos</Label>
              <Input
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vencimiento (opcional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
