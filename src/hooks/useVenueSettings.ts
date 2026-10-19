import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/firebase/client";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";

import {
  normalizeReservationsConfig,
  type ReservationsConfig,
} from "@/lib/reservationEngine";

export type { ReservationsConfig };

export const DEFAULT_RESERVATIONS_CONFIG: ReservationsConfig = normalizeReservationsConfig({});

export interface VenueFeatureSettings {
  coupons_enabled: boolean;
  reservations_enabled: boolean;
  reservations_config: ReservationsConfig;
  show_ratings: boolean;
}

/**
 * Flags de funciones opcionales del comercio (cupones, reservas),
 * escuchadas en tiempo real desde el documento del venue.
 */
export function useVenueSettings() {
  const { venue } = useAuth();
  const [settings, setSettings] = useState<VenueFeatureSettings>({
    coupons_enabled: false,
    reservations_enabled: false,
    reservations_config: DEFAULT_RESERVATIONS_CONFIG,
    show_ratings: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue?.id) return;

    const unsub = onSnapshot(
      doc(db, "venues", venue.id),
      (snap) => {
        const data = (snap.data() ?? {}) as any;
        setSettings({
          coupons_enabled: Boolean(data.coupons_enabled ?? false),
          reservations_enabled: Boolean(data.reservations_enabled ?? false),
          reservations_config: normalizeReservationsConfig(data.reservations_config),
          show_ratings: data.show_ratings !== false,
        });
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  const updateSettings = async (patch: Partial<VenueFeatureSettings>) => {
    if (!venue?.id) throw new Error("No venue");
    await updateDoc(doc(db, "venues", venue.id), {
      ...patch,
      updated_at: serverTimestamp(),
    });
  };

  return { settings, loading, updateSettings };
}
