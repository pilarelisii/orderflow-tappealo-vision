import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/firebase/client";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import type { ReservableTable } from "@/lib/reservationEngine";

/**
 * Mesas reservables = QRs "En el lugar" del comercio.
 * Cada una guarda su capacidad (`seats`) y si se ofrece para reservas (`reservable`).
 */
export function useReservationTables() {
  const { venue } = useAuth();
  const [tables, setTables] = useState<ReservableTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue?.id) return;

    const unsub = onSnapshot(
      query(collection(db, "qr_locations"), where("venue_id", "==", venue.id)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((x) => (x.delivery_type ?? "en_lugar") === "en_lugar" && x.enabled !== false)
          .map((x) => ({
            id: x.id,
            name: String(x.name ?? x.id),
            seats: Number.isFinite(Number(x.seats)) ? Number(x.seats) : 4,
            reservable: x.reservable !== false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
        setTables(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  const updateTable = async (id: string, patch: Partial<Pick<ReservableTable, "seats" | "reservable">>) => {
    await updateDoc(doc(db, "qr_locations", id), patch);
  };

  return { tables, loading, updateTable };
}
