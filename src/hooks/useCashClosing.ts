import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db, fbAuth } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import {
  CashClosing,
  CashClosingTotals,
  PaymentBucket,
} from "@/types/cashClosing";

type LiteOrder = {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  created_at: number;
  coupon_code: string | null;
  discount_amount: number;
};

const toMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime();
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v?.toMillis === "function") return v.toMillis();
  return 0;
};

export const paymentBucket = (method: string | null): PaymentBucket => {
  if (method === "efectivo") return "mesa";
  if (method === "efectivo-counter") return "caja";
  if (method === "mercado_pago") return "mercado_pago";
  return "otro";
};

/** Pedido cobrado: terminado, o pagado online (MP ya está acreditado). */
const isPaid = (o: LiteOrder) => o.status === "terminadas" || o.payment_method === "mercado_pago";

export function computeTotals(orders: LiteOrder[]): CashClosingTotals {
  const by_payment: CashClosingTotals["by_payment"] = {
    mesa: { count: 0, amount: 0 },
    caja: { count: 0, amount: 0 },
    mercado_pago: { count: 0, amount: 0 },
    otro: { count: 0, amount: 0 },
  };

  let gross_sales = 0;
  let orders_count = 0;
  let coupons_count = 0;
  let coupons_discount = 0;
  let pending_count = 0;
  let pending_amount = 0;

  orders.forEach((o) => {
    if (!isPaid(o)) {
      pending_count++;
      pending_amount += o.total;
      return;
    }
    orders_count++;
    gross_sales += o.total;
    const b = paymentBucket(o.payment_method);
    by_payment[b].count++;
    by_payment[b].amount += o.total;
    if (o.coupon_code) {
      coupons_count++;
      coupons_discount += o.discount_amount;
    }
  });

  return {
    orders_count,
    gross_sales,
    by_payment,
    coupons_count,
    coupons_discount,
    pending_count,
    pending_amount,
  };
}

export type CloseInput = {
  opening_cash: number;
  counted_cash: number;
  counted_cards: number;
  expenses: number;
  notes: string | null;
};

export function closingMath(totals: CashClosingTotals, input: Omit<CloseInput, "notes">) {
  const expected_in_store = totals.by_payment.mesa.amount + totals.by_payment.caja.amount;
  const declared_in_store =
    input.counted_cash - input.opening_cash + input.counted_cards + input.expenses;
  return {
    expected_in_store,
    declared_in_store,
    difference: declared_in_store - expected_in_store,
  };
}

export function useCashClosing() {
  const { venue } = useAuth();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [orders, setOrders] = useState<LiteOrder[]>([]);
  const [loadingClosings, setLoadingClosings] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [now, setNow] = useState(Date.now());

  // refresca "ahora" para que el período en curso incluya pedidos nuevos
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!venue?.id) return;

    const unsubClosings = onSnapshot(
      query(collection(db, "cash_closings"), where("venue_id", "==", venue.id)),
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            venue_id: x.venue_id,
            period_start: new Date(toMs(x.period_start)).toISOString(),
            closed_at: new Date(toMs(x.closed_at)).toISOString(),
            totals: x.totals,
            opening_cash: Number(x.opening_cash ?? 0),
            counted_cash: Number(x.counted_cash ?? 0),
            counted_cards: Number(x.counted_cards ?? 0),
            expenses: Number(x.expenses ?? 0),
            expected_in_store: Number(x.expected_in_store ?? 0),
            declared_in_store: Number(x.declared_in_store ?? 0),
            difference: Number(x.difference ?? 0),
            notes: x.notes ?? null,
            closed_by: x.closed_by ?? null,
          } as CashClosing;
        });
        list.sort((a, b) => (a.closed_at < b.closed_at ? 1 : -1));
        setClosings(list);
        setLoadingClosings(false);
      },
      (err) => {
        console.error(err);
        setLoadingClosings(false);
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), where("venue_id", "==", venue.id)),
      (snap) => {
        setOrders(
          snap.docs.map((d) => {
            const x = d.data() as any;
            return {
              id: d.id,
              total: Number(x.total ?? 0),
              status: String(x.status ?? "entrante"),
              payment_method: x.payment_method ?? null,
              created_at: toMs(x.created_at),
              coupon_code: x.coupon_code ?? null,
              discount_amount: Number(x.discount_amount ?? 0),
            };
          })
        );
        setLoadingOrders(false);
      },
      (err) => {
        console.error(err);
        setLoadingOrders(false);
      }
    );

    return () => {
      unsubClosings();
      unsubOrders();
    };
  }, [venue?.id]);

  // El turno arranca en el último cierre; si nunca se cerró, al inicio del día.
  const periodStart = useMemo(() => {
    if (closings[0]) return new Date(closings[0].closed_at).getTime();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [closings]);

  const periodOrders = useMemo(
    () => orders.filter((o) => o.created_at >= periodStart && o.created_at <= now + 60_000),
    [orders, periodStart, now]
  );

  const totals = useMemo(() => computeTotals(periodOrders), [periodOrders]);

  const closeRegister = async (input: CloseInput) => {
    if (!venue?.id) throw new Error("No venue");
    const math = closingMath(totals, input);

    await addDoc(collection(db, "cash_closings"), {
      venue_id: venue.id,
      period_start: Timestamp.fromMillis(periodStart),
      closed_at: Timestamp.now(),
      totals,
      ...input,
      ...math,
      closed_by: fbAuth.currentUser?.email ?? null,
    });
  };

  return {
    closings,
    totals,
    periodStart,
    loading: loadingClosings || loadingOrders,
    closeRegister,
  };
}
