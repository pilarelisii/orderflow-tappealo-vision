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
import { Reservation, ReservationPayload, ReservationStatus } from "@/types/reservation";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import { useReservationTables } from "@/hooks/useReservationTables";
import { findAssignment, slotOffsetMinutes, type Assignment } from "@/lib/reservationEngine";

const toIso = (v: any) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return new Date().toISOString();
};

export const todayYMD = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function useReservations() {
  const { venue } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useVenueSettings();
  const { tables } = useReservationTables();
  const config = settings.reservations_config;

  useEffect(() => {
    if (!venue?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(collection(db, "reservations"), where("venue_id", "==", venue.id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            venue_id: data.venue_id ?? venue.id,
            name: String(data.name ?? ""),
            phone: String(data.phone ?? ""),
            date: String(data.date ?? ""),
            time: String(data.time ?? ""),
            people: Number(data.people ?? 1),
            notes: data.notes ?? null,
            status: (data.status ?? "pendiente") as ReservationStatus,
            source: data.source === "panel" ? "panel" : "menu",
            duration_minutes: Number(data.duration_minutes ?? 0),
            table_ids: Array.isArray(data.table_ids) ? data.table_ids.map(String) : [],
            table_names: Array.isArray(data.table_names) ? data.table_names.map(String) : [],
            created_at: toIso(data.created_at),
            updated_at: toIso(data.updated_at),
          } as Reservation;
        });

        list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        setReservations(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  /** Sugerencia automática de mesa(s). Desde el panel no se aplican límites de horario. */
  const suggestTables = (
    date: string,
    time: string,
    people: number,
    ignoreReservationId?: string
  ): Assignment =>
    findAssignment(config, tables, reservations, date, time, people, {
      ignoreReservationId,
      ignoreLimits: true,
    });

  const tableNamesFor = (ids: string[]) =>
    ids.map((id) => tables.find((t) => t.id === id)?.name ?? id);

  const createReservation = async (payload: ReservationPayload) => {
    if (!venue?.id) throw new Error("No venue");
    await addDoc(collection(db, "reservations"), {
      venue_id: venue.id,
      ...payload,
      table_names: tableNamesFor(payload.table_ids),
      duration_minutes: config.duration_minutes,
      status: "confirmada",
      source: "panel",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updateReservation = async (id: string, payload: Partial<ReservationPayload>) => {
    await updateDoc(doc(db, "reservations", id), {
      ...payload,
      ...(payload.table_ids ? { table_names: tableNamesFor(payload.table_ids) } : {}),
      updated_at: serverTimestamp(),
    });
  };

  // ✅ Automático: marcar "No vino" las confirmadas que pasaron la tolerancia
  useEffect(() => {
    const tolerance = config.auto_no_show_minutes;
    if (!tolerance) return;

    const startsAt = (r: Reservation) =>
      new Date(`${r.date}T00:00:00`).getTime() + slotOffsetMinutes(config, r.date, r.time) * 60_000;

    const check = () => {
      const now = Date.now();
      reservations
        .filter((r) => {
          if (r.status !== "confirmada") return false;
          const late = now - startsAt(r);
          // solo reservas recientes, para no tocar el historial viejo
          return late > tolerance * 60_000 && late < 24 * 60 * 60_000;
        })
        .forEach((r) =>
          updateDoc(doc(db, "reservations", r.id), {
            status: "no_show",
            auto_no_show: true,
            updated_at: serverTimestamp(),
          }).catch(console.error)
        );
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [reservations, config]);

  const setStatus = async (id: string, status: ReservationStatus) => {
    await updateDoc(doc(db, "reservations", id), { status, updated_at: serverTimestamp() });
  };

  const removeReservation = async (id: string) => {
    await deleteDoc(doc(db, "reservations", id));
  };

  const pendingCount = reservations.filter(
    (r) => r.status === "pendiente" && r.date >= todayYMD()
  ).length;

  return {
    reservations,
    loading,
    tables,
    config,
    suggestTables,
    pendingCount,
    createReservation,
    updateReservation,
    setStatus,
    removeReservation,
  };
}
