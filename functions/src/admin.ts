import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();

async function assertAdmin(uid: string) {
  const snap = await admin
    .firestore()
    .collection("users")
    .where("auth_id", "==", uid)
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("permission-denied", "Not admin");
  }
}

type Payload = {
  venueId: string;
  enabled: boolean;
};

export const adminSetVenueEnabled = onCall(async (request) => {
  // ✅ en v2 es request.auth, no context.auth
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  await assertAdmin(request.auth.uid);

  // ✅ en v2 el payload viene en request.data
  const p = request.data as Payload;

  const venueId = String(p.venueId || "").trim();
  const enabled = !!p.enabled;

  if (!venueId) throw new HttpsError("invalid-argument", "venueId required");

  await admin.firestore().collection("venues").doc(venueId).update({
    enabled,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

/** Opiniones sobre Tappealo que dejan los clientes desde el menú (solo admins). */
export const adminListAppReviews = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  await assertAdmin(request.auth.uid);

  const limit = Math.min(500, Math.max(1, Number(request.data?.limit ?? 200)));
  const snap = await admin
    .firestore()
    .collection("app_reviews")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return {
    reviews: snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        venue_id: x.venue_id ?? null,
        venue_name: x.venue_name ?? null,
        venue_slug: x.venue_slug ?? null,
        stars: Number(x.stars ?? 0),
        comment: x.comment ?? null,
        created_at: x.created_at?.toDate?.().toISOString() ?? null,
      };
    }),
  };
});
