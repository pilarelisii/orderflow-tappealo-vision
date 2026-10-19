import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/firebase/client";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";

export interface DishReview {
  id: string;
  order_id: string;
  ref_order_id: string | null;
  product_id: string;
  product_name: string;
  stars: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
}

export interface DishSummary {
  product_id: string;
  product_name: string;
  count: number;
  avg: number;
  last_at: string;
}

const toIso = (v: any) => {
  if (!v) return new Date().toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return String(v);
};

/** Opiniones de los platos del comercio (las deja el cliente al recibir el pedido). */
export function useReviews() {
  const { venue } = useAuth();
  const [reviews, setReviews] = useState<DishReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue?.id) return;

    const unsub = onSnapshot(
      query(collection(db, "reviews"), where("venue_id", "==", venue.id)),
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            order_id: String(x.order_id ?? ""),
            ref_order_id: x.ref_order_id ?? null,
            product_id: String(x.product_id ?? ""),
            product_name: String(x.product_name ?? ""),
            stars: Number(x.stars ?? 0),
            comment: x.comment ?? null,
            customer_name: x.customer_name ?? null,
            created_at: toIso(x.created_at),
          } as DishReview;
        });
        list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setReviews(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  const dishes = useMemo<DishSummary[]>(() => {
    const map = new Map<string, DishSummary & { sum: number }>();
    reviews.forEach((r) => {
      const cur = map.get(r.product_id) ?? {
        product_id: r.product_id,
        product_name: r.product_name,
        count: 0,
        avg: 0,
        sum: 0,
        last_at: r.created_at,
      };
      cur.count++;
      cur.sum += r.stars;
      cur.avg = cur.sum / cur.count;
      if (r.created_at > cur.last_at) cur.last_at = r.created_at;
      map.set(r.product_id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reviews]);

  const overall = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;

  return { reviews, dishes, overall, loading };
}
