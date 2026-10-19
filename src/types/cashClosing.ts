export type PaymentBucket = "mesa" | "caja" | "mercado_pago" | "otro";

export const PAYMENT_BUCKET_LABEL: Record<PaymentBucket, string> = {
  mesa: "Efectivo / Tarjeta en mesa",
  caja: "Efectivo / Tarjeta en caja",
  mercado_pago: "Mercado Pago",
  otro: "Otros",
};

export interface CashClosingTotals {
  orders_count: number;
  gross_sales: number; // ventas cobradas
  by_payment: Record<PaymentBucket, { count: number; amount: number }>;
  coupons_count: number;
  coupons_discount: number;
  pending_count: number; // pedidos del período sin terminar (no cobrados)
  pending_amount: number;
}

export interface CashClosing {
  id: string;
  venue_id: string;
  period_start: string;
  closed_at: string;
  totals: CashClosingTotals;
  opening_cash: number; // fondo inicial
  counted_cash: number; // efectivo contado al cierre
  counted_cards: number; // cupones de posnet / tarjetas
  expenses: number; // gastos / retiros pagados con la caja
  expected_in_store: number; // mesa + caja
  declared_in_store: number; // (efectivo - fondo) + tarjetas + gastos
  difference: number; // declarado - esperado
  notes: string | null;
  closed_by: string | null;
}
