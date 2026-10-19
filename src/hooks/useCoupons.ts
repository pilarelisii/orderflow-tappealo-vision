import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Coupon, CouponDiscountType, CouponPayload } from "@/types/coupon";

const toIso = (v: any) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return null;
};

export function useCoupons() {
  const { venue } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue?.id) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(collection(db, "coupons"), where("venue_id", "==", venue.id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            venue_id: data.venue_id ?? venue.id,
            code: String(data.code ?? ""),
            discount_type: (data.discount_type ?? "percentage") as CouponDiscountType,
            discount_value: Number(data.discount_value ?? 0),
            enabled: Boolean(data.enabled),
            expires_at: toIso(data.expires_at),
            min_order: data.min_order != null ? Number(data.min_order) : null,
            max_uses: data.max_uses != null ? Number(data.max_uses) : null,
            uses: Number(data.uses ?? 0),
            created_at: toIso(data.created_at) ?? new Date().toISOString(),
            updated_at: toIso(data.updated_at) ?? new Date().toISOString(),
          } as Coupon;
        });

        list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setCoupons(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  const codeExists = (code: string, ignoreId?: string) =>
    coupons.some(
      (c) => c.id !== ignoreId && c.code.toUpperCase() === code.trim().toUpperCase()
    );

  const createCoupon = async (payload: CouponPayload) => {
    if (!venue?.id) throw new Error("No venue");

    await addDoc(collection(db, "coupons"), {
      venue_id: venue.id,
      code: payload.code.trim().toUpperCase(),
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      enabled: payload.enabled,
      expires_at: payload.expires_at ? Timestamp.fromDate(payload.expires_at) : null,
      min_order: payload.min_order,
      max_uses: payload.max_uses,
      uses: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateCoupon = async (
    id: string,
    payload: Partial<CouponPayload>
  ) => {
    const patch: any = { ...payload, updated_at: serverTimestamp() };

    if (payload.code !== undefined) patch.code = payload.code.trim().toUpperCase();
    if (payload.expires_at !== undefined) {
      patch.expires_at = payload.expires_at ? Timestamp.fromDate(payload.expires_at) : null;
    }

    await updateDoc(doc(db, "coupons", id), patch);
  };

  const removeCoupon = async (id: string) => {
    await deleteDoc(doc(db, "coupons", id));
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await updateDoc(doc(db, "coupons", id), {
      enabled: !enabled,
      updated_at: serverTimestamp(),
    });
  };

  return {
    coupons,
    loading,
    codeExists,
    createCoupon,
    updateCoupon,
    removeCoupon,
    toggleEnabled,
  };
}
