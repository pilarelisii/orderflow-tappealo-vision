import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { PromotionItem } from "@/types/promotion";

type Props = {
  open: boolean;
  onClose: () => void;
  products: Product[];
  value: PromotionItem[];
  onChange: (items: PromotionItem[]) => void;
};

export function PromotionItemsModal({ open, onClose, products, value, onChange }: Props) {
  const map = useMemo(() => {
    const m = new Map<string, number>();
    value.forEach((i) => m.set(i.product_id, i.quantity));
    return m;
  }, [value]);

  const emit = (m: Map<string, number>) => {
    onChange(
      Array.from(m.entries()).map(([product_id, quantity]) => ({
        product_id,
        quantity,
      }))
    );
  };

  const toggleProduct = (productId: string) => {
    const next = new Map(map);
    if (next.has(productId)) next.delete(productId);
    else next.set(productId, 1);
    emit(next);
  };

  const changeQty = (productId: string, qty: number) => {
    const next = new Map(map);
    if (qty <= 0) next.delete(productId);
    else next.set(productId, qty);
    emit(next);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar productos</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {products.map((p) => {
            const qty = map.get(p.id) || 0;
            const selected = qty > 0;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  selected ? "border-primary" : "border-border"
                }`}
              >
                <Switch checked={selected} onCheckedChange={() => toggleProduct(p.id)} />

                <div className="flex-1">
                  <p className="font-medium">{p.name ?? ""}</p>
                  <p className="text-xs text-muted-foreground">${p.price}</p>
                </div>

                {selected && (
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => changeQty(p.id, Number(e.target.value))}
                    className="w-20 text-center"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>Listo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}