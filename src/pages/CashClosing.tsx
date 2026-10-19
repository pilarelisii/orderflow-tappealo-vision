import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Lock, Printer, Wallet, Receipt, Ticket, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import PanelPage from "@/components/PanelPage";
import { useAuth } from "@/hooks/useAuth";
import { useCashClosing, closingMath } from "@/hooks/useCashClosing";
import { formatCurrency } from "@/lib/formatters";
import { printCashClosing } from "@/lib/printCashClosing";
import { CashClosing as CashClosingType, PAYMENT_BUCKET_LABEL, PaymentBucket } from "@/types/cashClosing";

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmtDateTime = (v: string | number) =>
  new Date(v).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const DiffBadge = ({ value }: { value: number }) => {
  if (Math.abs(value) < 0.5)
    return <span className="text-emerald-700 font-semibold">Sin diferencia</span>;
  return value > 0 ? (
    <span className="text-amber-700 font-semibold">Sobrante {formatCurrency(value)}</span>
  ) : (
    <span className="text-red-700 font-semibold">Faltante {formatCurrency(Math.abs(value))}</span>
  );
};

const CashClosing = () => {
  const { venue } = useAuth();
  const { closings, totals, periodStart, loading, closeRegister } = useCashClosing();

  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [countedCards, setCountedCards] = useState("");
  const [expenses, setExpenses] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const input = {
    opening_cash: num(openingCash),
    counted_cash: num(countedCash),
    counted_cards: num(countedCards),
    expenses: num(expenses),
  };
  const math = closingMath(totals, input);

  const avgTicket = totals.orders_count ? totals.gross_sales / totals.orders_count : 0;
  const buckets = useMemo(
    () => (Object.keys(PAYMENT_BUCKET_LABEL) as PaymentBucket[]).filter(
      (b) => b !== "otro" || totals.by_payment.otro.count > 0
    ),
    [totals]
  );

  const doClose = async () => {
    setSaving(true);
    try {
      await closeRegister({ ...input, notes: notes.trim() || null });
      toast.success("Caja cerrada. Arranca un nuevo turno.");
      setOpeningCash("");
      setCountedCash("");
      setCountedCards("");
      setExpenses("");
      setNotes("");
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cerrar la caja");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelPage
      title="Cierre de caja"
      subtitle={`Turno en curso desde ${fmtDateTime(periodStart)}`}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Resumen del turno */}
            <div className="lg:col-span-3 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <TrendingUp className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Ventas cobradas</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totals.gross_sales)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <Receipt className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-xl font-bold text-foreground">{totals.orders_count}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <Wallet className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Ticket promedio</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(avgTicket)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <Ticket className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Desc. cupones</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(totals.coupons_discount)}
                  </p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Ventas por medio de pago</h2>
                <div className="divide-y divide-border">
                  {buckets.map((b) => (
                    <div key={b} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-foreground">{PAYMENT_BUCKET_LABEL[b]}</p>
                        <p className="text-xs text-muted-foreground">
                          {totals.by_payment[b].count}{" "}
                          {totals.by_payment[b].count === 1 ? "pedido" : "pedidos"}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(totals.by_payment[b].amount)}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <p className="font-bold text-foreground">Total cobrado</p>
                    <p className="font-bold text-primary text-lg">{formatCurrency(totals.gross_sales)}</p>
                  </div>
                </div>

                {totals.pending_count > 0 && (
                  <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">
                      Hay <strong>{totals.pending_count}</strong>{" "}
                      {totals.pending_count === 1 ? "pedido sin terminar" : "pedidos sin terminar"} por{" "}
                      <strong>{formatCurrency(totals.pending_amount)}</strong>. No se cuentan como
                      cobrados hasta que pasen a “Terminadas”.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Arqueo */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Arqueo</h2>
                  <p className="text-sm text-muted-foreground">
                    Contá lo que hay en la caja y compará con lo que registró Tappealo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fondo inicial</Label>
                    <Input inputMode="decimal" placeholder="$0" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Efectivo contado</Label>
                    <Input inputMode="decimal" placeholder="$0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarjetas / posnet</Label>
                    <Input inputMode="decimal" placeholder="$0" value={countedCards} onChange={(e) => setCountedCards(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gastos / retiros</Label>
                    <Input inputMode="decimal" placeholder="$0" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: se pagó al proveedor de bebidas con efectivo de la caja"
                    maxLength={300}
                  />
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Esperado en el local (mesa + caja)</span>
                    <span className="font-medium">{formatCurrency(math.expected_in_store)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Declarado</span>
                    <span className="font-medium">{formatCurrency(math.declared_in_store)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-semibold">Diferencia</span>
                    <DiffBadge value={math.difference} />
                  </div>
                </div>

                <Button className="w-full" onClick={() => setConfirmOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar caja
                </Button>
              </div>
            </div>
          </div>

          {/* Historial */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Cierres anteriores</h2>
            {closings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hiciste ningún cierre de caja.</p>
            ) : (
              <div className="divide-y divide-border">
                {closings.map((c: CashClosingType) => (
                  <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {fmtDateTime(c.period_start)} → {fmtDateTime(c.closed_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.totals?.orders_count ?? 0} pedidos · {formatCurrency(c.totals?.gross_sales ?? 0)}{" "}
                        cobrado{c.closed_by ? ` · ${c.closed_by}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <DiffBadge value={c.difference} />
                      </span>
                      <Button variant="outline" size="sm" onClick={() => printCashClosing(c, venue?.name)}>
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se guarda el cierre con {totals.orders_count} pedidos por {formatCurrency(totals.gross_sales)} y
              una diferencia de {formatCurrency(math.difference)}. Los próximos pedidos van a contar para un
              nuevo turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                doClose();
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cerrar caja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelPage>
  );
};

export default CashClosing;
