import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { db } from "@/integrations/firebase/client";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { DeliveryType, QRLocation } from "@/types/qrLocation";


const mapDocToQr = (id: string, data: any): QRLocation => ({
  id,
  venue_id: data.venue_id ?? "",
  name: data.name ?? "",
  delivery_type: (data.delivery_type ?? "en_lugar") as DeliveryType,
  enabled: data.enabled ?? true,
  created_at: data.created_at ?? "",
});

const sortByName = (list: QRLocation[]) =>
  [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

export function useQrs() {
  const { venue } = useAuth();
  const { toast } = useToast();

  const [qrs, setQrs] = useState<QRLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const currentVenueId = useRef<string | null>(null);

  useEffect(() => {
    if (!venue?.id) {
      setQrs([]);
      setLoading(false);
      currentVenueId.current = null;
      return;
    }

    const venueChanged = currentVenueId.current !== venue.id;
    currentVenueId.current = venue.id;
    if (venueChanged) setLoading(true);

    const q = query(collection(db, "qr_locations"), where("venue_id", "==", venue.id));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => mapDocToQr(d.id, d.data()));
        setQrs(sortByName(list));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching QRs:", error);
        toastRef.current?.({
          title: "Error",
          description: "No se pudieron cargar los QRs",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [venue?.id]);

  const createQR = async (input: { name: string; delivery_type: DeliveryType; enabled?: boolean }) => {
    if (!venue?.id) throw new Error("Venue no disponible");

    const name = String(input.name || "").trim();
    const delivery_type = input.delivery_type ?? "en_lugar";
    const enabled = input.enabled ?? true;

    if (!name) throw new Error("Nombre inválido");

    // opcional: evitar duplicados por (venue_id + name)
    const existing = await getDocs(
      query(collection(db, "qr_locations"), where("venue_id", "==", venue.id), where("name", "==", name))
    );
    if (!existing.empty) throw new Error("Ya existe un QR con ese nombre");

    const ref = await addDoc(collection(db, "qr_locations"), {
      venue_id: venue.id,
      name,
      delivery_type,
      enabled,
      created_at: serverTimestamp(),
    });

    return { id: ref.id, venue_id: venue.id, name, delivery_type, enabled } as QRLocation;
  };

  const updateQR = async (
    qrId: string,
    patch: Partial<{ name: string; delivery_type: DeliveryType; enabled: boolean }>
  ) => {
    if (!venue?.id) throw new Error("Venue no disponible");
    if (!qrId) throw new Error("QR inválido");

    const ref = doc(db, "qr_locations", qrId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("QR no encontrado");

    const data = snap.data() as any;
    if (data.venue_id !== venue.id) throw new Error("Forbidden");

    const next: any = {};

    if ("delivery_type" in patch) next.delivery_type = String(patch.delivery_type || "en_lugar");
    if ("enabled" in patch) next.enabled = !!patch.enabled;

    if ("name" in patch) {
      const newName = String(patch.name || "").trim();
      if (!newName) throw new Error("Nombre inválido");

      if (newName !== String(data.name || "")) {
        const existing = await getDocs(
          query(collection(db, "qr_locations"), where("venue_id", "==", venue.id), where("name", "==", newName))
        );
        if (!existing.empty) throw new Error("Ya existe un QR con ese nombre");
      }

      next.name = newName;
    }

    await updateDoc(ref, { ...next, updated_at: serverTimestamp() });
  };

  const deleteQR = async (qrId: string) => {
    if (!venue?.id) throw new Error("Venue no disponible");
    if (!qrId) throw new Error("QR inválido");

    const ref = doc(db, "qr_locations", qrId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("QR no encontrado");

    const data = snap.data() as any;
    if (data.venue_id !== venue.id) throw new Error("Forbidden");

    await deleteDoc(ref);
  };

  return { qrs, loading, createQR, updateQR, deleteQR };
}