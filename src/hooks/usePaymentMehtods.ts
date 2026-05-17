import { useEffect, useMemo, useState } from "react";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { toast } from "sonner";

export type PaymentType = "MP" | "EF" | "TC" | "TD" | "EF_Counter";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType;
  enabled: boolean;
  venue_id: string;
  payment_data?: Record<string, any> | null;
}

const DEFAULTS: Record<PaymentType, { name: string }> = {
  EF: { name: "Efectivo/Tarjeta en mesa" },
  MP: { name: "Mercado Pago" },
  TD: { name: "Tarjeta Débito" },
  TC: { name: "Tarjeta Crédito" },
  EF_Counter: {name: "Efectivo/tarjeta en caja"}
};

function docId(venueId: string, type: PaymentType) {
  return `${venueId}_${type}`;
}

export function usePaymentMethods(venueId?: string) {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (!venueId) return;

    setLoading(true);
    const q = query(
      collection(db, "payment_types"),
      where("venue_id", "==", venueId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PaymentMethod[] = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            venue_id: x.venue_id,
            type: x.type,
            name: x.name ?? DEFAULTS[x.type as PaymentType]?.name ?? "Método",
            enabled: !!x.enabled,
            payment_data: x.payment_data ?? null,
          };
        });
        setMethods(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Error cargando métodos de pago");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venueId]);

  const getByType = useMemo(() => {
    const map = new Map<PaymentType, PaymentMethod>();
    methods.forEach((m) => map.set(m.type, m));
    return map;
  }, [methods]);

  const isEnabled = (type: PaymentType) => !!getByType.get(type)?.enabled;

  const toggle = async (type: PaymentType, enabled: boolean) => {
    if (!venueId) return;

    const id = docId(venueId, type);
    const ref = doc(db, "payment_types", id);

    // upsert
    await setDoc(
      ref,
      {
        venue_id: venueId,
        type,
        name: DEFAULTS[type].name,
        enabled,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const saveMPData = async (mp_public_key: string, mp_access_token: string) => {
    if (!venueId) return;

    const id = docId(venueId, "MP");
    const ref = doc(db, "payment_types", id);

    // si no existe, lo creamos enabled=true (porque si está cargando datos es porque lo quiere usar)
    const exists = await getDoc(ref);

    if (!exists.exists()) {
      await setDoc(
        ref,
        {
          venue_id: venueId,
          type: "MP",
          name: DEFAULTS.MP.name,
          enabled: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          payment_data: {
            mp_public_key: mp_public_key || null,
            mp_access_token: mp_access_token || null,
          },
        },
        { merge: true }
      );
      return;
    }

    await updateDoc(ref, {
      enabled: true,
      updated_at: serverTimestamp(),
      payment_data: {
        mp_public_key: mp_public_key || null,
        mp_access_token: mp_access_token || null,
      },
    });
  };

  return {
    loading,
    methods,
    getByType,
    isEnabled,
    toggle,
    saveMPData,
  };
}