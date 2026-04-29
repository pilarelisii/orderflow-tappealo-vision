import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, fbFunctions } from "@/integrations/firebase/client";

export type VenuePlan = "basico" | "pro" | "premium" | "trial" | "demo";

export type AdminVenueRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  enabled: boolean;
  slug: string | null;
  plan: VenuePlan | null;
  service_active: boolean;
};

type UpdateVenuePayload = {
  venueId: string;
  name: string | null;
  phone: string | null;
  slug: string | null;
  plan: VenuePlan;
  email?: string | null;
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

          const rawPlan = String(data?.plan ?? "")
            .trim()
            .toLowerCase();

          const plan: VenuePlan | null =
            rawPlan === "basico" || rawPlan === "pro" || rawPlan === "premium" || rawPlan === "trial" || rawPlan === "demo"
              ? rawPlan
              : null;

          return {
            id: d.id,
            name: data?.name ? String(data.name) : null,
            phone: data?.phone ? String(data.phone) : null,
            email: data?.email ? String(data.email) : null,
            enabled: !!data?.enabled,
            slug: data?.slug ? String(data.slug) : null,
            plan,
            service_active: !!data?.service_active,
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

  const disabledCount = useMemo(
    () => venues.filter((v) => !v.enabled).length,
    [venues]
  );

  const serviceActiveCount = useMemo(
    () => venues.filter((v) => v.service_active).length,
    [venues]
  );

  const serviceInactiveCount = useMemo(
    () => venues.filter((v) => !v.service_active).length,
    [venues]
  );

  const planStats = useMemo(() => {
    return {
      basico: venues.filter((v) => v.plan === "basico").length,
      pro: venues.filter((v) => v.plan === "pro").length,
      premium: venues.filter((v) => v.plan === "premium").length,
      sinPlan: venues.filter((v) => !v.plan).length,
    };
  }, [venues]);

  const totalCount = venues.length;

  const setEnabled = async (venueId: string, enabled: boolean) => {
    const fn = httpsCallable(fbFunctions, "adminSetVenueEnabled");
    await fn({ venueId, enabled });
  };

  const updateVenue = async (payload: UpdateVenuePayload) => {
    const fn = httpsCallable(fbFunctions, "adminUpdateVenue");
    await fn(payload);
  };

  return {
    venues,
    loading,
    enabledCount,
    disabledCount,
    serviceActiveCount,
    serviceInactiveCount,
    totalCount,
    planStats,
    setEnabled,
    updateVenue,
  };
}