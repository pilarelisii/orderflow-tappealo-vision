import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, fbFunctions } from "@/integrations/firebase/client";

export type AdminVenueRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  enabled: boolean;
  slug: string | null;
};

export function useAdminVenues() {
  const [venues, setVenues] = useState<AdminVenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "venues"), orderBy("created_at", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: AdminVenueRow[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            name: (data?.name ?? null) ? String(data.name) : null,
            phone: (data?.phone ?? null) ? String(data.phone) : null,
            email: (data?.email ?? null) ? String(data.email) : null,
            enabled: !!data?.enabled,
            slug: (data?.slug ?? null) ? String(data.slug) : null,
          };
        });
        setVenues(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Error venues snapshot:", err);
        setVenues([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const enabledCount = useMemo(
    () => venues.filter((v) => v.enabled).length,
    [venues]
  );

  const totalCount = venues.length;

  const setEnabled = async (venueId: string, enabled: boolean) => {
    const fn = httpsCallable(fbFunctions, "adminSetVenueEnabled");
    await fn({ venueId, enabled });
  };

  return { venues, loading, enabledCount, totalCount, setEnabled };
}