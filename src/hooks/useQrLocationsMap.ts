// src/hooks/useQrLocationsMap.ts
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

type QrLocationDoc = {
  name?: string | null;
  label?: string | null;
  venue_id?: string | null;
};

export function useQrLocationsMap(venueId?: string | null) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!venueId) return;

    const q = query(
      collection(db, "qr_locations"),
      where("venue_id", "==", venueId),
    );

    const unsub = onSnapshot(q, (snap) => {
      const next: Record<string, string> = {};
      snap.forEach((doc) => {
        const data = doc.data() as QrLocationDoc;
        const name = (data.name ?? data.label ?? "").toString().trim();
        next[doc.id] = name || doc.id;
      });
      setMap(next);
    });

    return () => unsub();
  }, [venueId]);

  return useMemo(() => map, [map]);
}