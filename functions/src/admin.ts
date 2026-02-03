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