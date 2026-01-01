import type { Request, Response, NextFunction } from "express";
import { getFirestore } from "firebase-admin/firestore";
import type { ResolvedVenue } from "../types/resolvedVenue";

const db = getFirestore();

export async function resolveVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const raw =
      (req.params?.slug as string | undefined) ||
      (req.params?.venueid as string | undefined) ||
      (req.params?.venueId as string | undefined);

    if (!raw) {
      res.status(400).json({ error: "Missing venue identifier (slug/venueId)" });
      return;
    }

    const key = String(raw).trim().toLowerCase();
    if (!key) {
      res.status(400).json({ error: "Invalid venue identifier" });
      return;
    }

    // 1) slug
    const snap = await db.collection("venues").where("slug", "==", key).limit(1).get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const v = doc.data() as any;

      const venue: ResolvedVenue = {
        id: doc.id,
        slug: (v?.slug ?? key) as string | null,
        name: (v?.name ?? null) as string | null,
        enabled: Boolean(v?.enabled ?? true),
        service_active: Boolean(v?.service_active ?? true), // ✅ agregado
    };

      if (venue.enabled === false) {
        res.status(403).json({ error: "Venue disabled" });
        return;
      }

      req.venue = venue;
      next();
      return;
    }

    // 2) id directo
    const byId = await db.collection("venues").doc(raw).get();
    if (!byId.exists) {
      res.status(404).json({ error: "Venue not found" });
      return;
    }

    const v = byId.data() as any;

    const venue: ResolvedVenue = {
      id: byId.id,
      slug: (v?.slug ?? null) as string | null,
      name: (v?.name ?? null) as string | null,
      enabled: Boolean(v?.enabled ?? true),
      service_active: Boolean(v?.service_active ?? true), // ✅ agregado
    };

    if (venue.enabled === false) {
      res.status(403).json({ error: "Venue disabled" });
      return;
    }

    req.venue = venue;
    next();
    return;
  } catch (err) {
    console.error("resolveVenue error:", err);
    res.status(500).json({ error: "Failed to resolve venue" });
    return;
  }
}