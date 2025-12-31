import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { Product } from "@/types/product";
import { Promotion, PromotionItem } from "@/types/promotion";
import { PromotionItemsModal } from "./PromotionItemsModal";
import { ImageUploadBox } from "@/components/ImageUploadBox";

type Props = {
  open: boolean;
  onClose: () => void;

  // ✅ necesario para subir a storage por venue
  venueId: string;

  products: Product[];
  initial?: Promotion | null; // null => crear
  onSubmit: (payload: {
    name: string | null;
    price: number;
    discount: number;
    enabled: boolean;
    start_date: Timestamp;
    end_date: Timestamp;
    items: PromotionItem[];

    // ✅ guardamos URL/PATH (subida la hace ImageUploadBox)
    image_url?: string | null;
    image_path?: string | null;
  }) => Promise<void>;
};

const toDate = (t?: any) => (t?.toDate ? t.toDate() : new Date());

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function PromotionFormModal({ open, onClose, venueId, products, initial, onSubmit }: Props) {
  const [itemsOpen, setItemsOpen] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(Boolean(initial?.enabled ?? true));

  // precios
  const [price, setPrice] = useState<number>(Number(initial?.price ?? 0));
  const [discount, setDiscount] = useState<number>(Number(initial?.discount ?? 0));

  // fechas
  const [startDate, setStartDate] = useState<Date>(initial ? toDate(initial.start_date) : new Date());
  const [endDate, setEndDate] = useState<Date>(initial ? toDate(initial.end_date) : new Date());

  // items
  const [items, setItems] = useState<PromotionItem[]>(initial?.items ?? []);

  // ✅ imagen guardada (url/path)
  const [imageUrl, setImageUrl] = useState<string | null>((initial as any)?.image_url ?? null);
  const [imagePath, setImagePath] = useState<string | null>((initial as any)?.image_path ?? null);

  // para evitar loop infinito al “precio <-> descuento”
  const [lastEdited, setLastEdited] = useState<"price" | "discount" | null>(null);

  // total base (suma de productos seleccionados * quantity)
  const baseTotal = useMemo(() => {
    const priceById = new Map<string, number>();
    products.forEach((p) => priceById.set(p.id, Number(p.price ?? 0)));

    return items.reduce((acc, it) => {
      const unit = priceById.get(it.product_id) ?? 0;
      const qty = Number(it.quantity ?? 0);
      return acc + unit * qty;
    }, 0);
  }, [items, products]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "Producto";

  const itemsSummary = useMemo(() => {
    return items.map((i) => `${getProductName(i.product_id)} x${i.quantity}`).join(", ");
  }, [items, products]);

  // recalcular cuando cambia baseTotal o el campo que NO fue editado
  useEffect(() => {
    if (baseTotal <= 0) return;

    if (lastEdited === "price") {
      const nextDiscount = (1 - price / baseTotal) * 100;
      setDiscount(round2(clamp(nextDiscount, 0, 100)));
    } else if (lastEdited === "discount") {
      const nextPrice = baseTotal * (1 - discount / 100);
      setPrice(round2(clamp(nextPrice, 0, baseTotal)));
    } else {
      const nextPrice = baseTotal * (1 - discount / 100);
      setPrice(round2(clamp(nextPrice, 0, baseTotal)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTotal]);

  const onChangePrice = (v: string) => {
    const n = Number(v);
    setLastEdited("price");
    setPrice(Number.isFinite(n) ? n : 0);

    if (baseTotal > 0 && Number.isFinite(n)) {
      const nextDiscount = (1 - n / baseTotal) * 100;
      setDiscount(round2(clamp(nextDiscount, 0, 100)));
    }
  };

  const onChangeDiscount = (v: string) => {
    const n = Number(v);
    setLastEdited("discount");
    const safe = Number.isFinite(n) ? n : 0;
    setDiscount(safe);

    if (baseTotal > 0) {
      const nextPrice = baseTotal * (1 - safe / 100);
      setPrice(round2(clamp(nextPrice, 0, baseTotal)));
    }
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Nombre requerido");
    if (items.length === 0) return toast.error("Seleccioná al menos un producto");
    if (price <= 0) return toast.error("El precio debe ser mayor a 0");

    const finalBase = baseTotal;
    const finalDiscount =
      finalBase > 0
        ? round2(clamp((1 - price / finalBase) * 100, 0, 100))
        : round2(clamp(discount, 0, 100));

    await onSubmit({
      name: name.trim(),
      price: Number(price),
      discount: Number(finalDiscount),
      enabled,
      start_date: Timestamp.fromDate(startDate),
      end_date: Timestamp.fromDate(endDate),
      items,
      image_url: imageUrl ?? null,
      image_path: imagePath ?? null,
    });

    onClose();
  };

  // reset si cambia initial al abrir
  useEffect(() => {
    if (!open) return;

    setName(initial?.name ?? "");
    setEnabled(Boolean(initial?.enabled ?? true));

    const initItems = initial?.items ?? [];
    setItems(initItems);

    const initDiscount = Number(initial?.discount ?? 0);
    setDiscount(initDiscount);

    setStartDate(initial ? toDate(initial.start_date) : new Date());
    setEndDate(initial ? toDate(initial.end_date) : new Date());

    setImageUrl((initial as any)?.image_url ?? null);
    setImagePath((initial as any)?.image_path ?? null);

    const initPrice = Number(initial?.price ?? 0);
    setPrice(initPrice);

    setLastEdited(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const savingInfo =
    baseTotal > 0
      ? {
          baseTotal,
          finalPrice: price,
          savings: round2(clamp(baseTotal - price, 0, baseTotal)),
        }
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{initial ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">Habilitada</p>
                <p className="text-xs text-muted-foreground">Se muestra en el menú</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Productos */}
            <div className="space-y-2">
              <Label>Productos incluidos</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setItemsOpen(true)}>
                  Seleccionar productos
                </Button>
                <p className="text-sm text-muted-foreground truncate flex-1">
                  {itemsSummary || "Sin productos seleccionados"}
                </p>
              </div>

              {savingInfo && (
                <div className="text-xs text-muted-foreground">
                  Total productos: <b>${round2(savingInfo.baseTotal)}</b> · Ahorrás:{" "}
                  <b>${savingInfo.savings}</b>
                </div>
              )}
            </div>

            {/* Precio y descuento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio promo</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => onChangePrice(e.target.value)}
                  placeholder="0"
                />
                {baseTotal <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    Seleccioná productos para calcular descuento automáticamente.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => onChangeDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* ✅ Imagen con ImageUploadBox */}
            <div className="space-y-2">
              <ImageUploadBox
                label="Imagen"
                venueId={venueId}
                type="promotion"
                entityId={initial?.id ?? "new"} // si es nueva, queda "new"
                initialImage={imageUrl}
                previousPath={imagePath}
                onUploaded={({ url, path }) => {
                  setImageUrl(url);
                  setImagePath(path);
                }}
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

      <PromotionItemsModal
        open={itemsOpen}
        onClose={() => setItemsOpen(false)}
        products={products}
        value={items}
        onChange={(next) => {
          setItems(next);
          setLastEdited(null);
        }}
      />
    </>
  );
}