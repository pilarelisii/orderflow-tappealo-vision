import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

type VenuePlan = "basico" | "pro" | "premium" | "trial" | "demo";

type Payload = {
  venueId: string;
  name: string | null;
  phone: string | null;
  slug: string | null;
  plan: VenuePlan;
  email?: string | null;
};

function cleanNullable(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normSlug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/--+/g, "-");
}

function normalizePlan(v: unknown): VenuePlan {
  const plan = String(v ?? "").trim().toLowerCase();

  if (plan === "basico" || plan === "pro" || plan === "premium" || plan === "trial" || plan === "demo") {
    return plan;
  }

  throw new HttpsError(
    "invalid-argument",
    "plan must be basico, pro or premium"
  );
}

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

export const adminUpdateVenue = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  await assertAdmin(uid);

  const p = request.data as Payload;

  const venueId = String(p.venueId || "").trim();
  const name = cleanNullable(p.name);
  const phone = cleanNullable(p.phone);
  const email = cleanNullable(p.email);
  const slugRaw = cleanNullable(p.slug);
  const slug = slugRaw ? normSlug(slugRaw) : null;
  const plan = normalizePlan(p.plan);

  if (!venueId) {
    throw new HttpsError("invalid-argument", "venueId required");
  }
  if (!name) {
    throw new HttpsError("invalid-argument", "name required");
  }
  if (!slug) {
    throw new HttpsError("invalid-argument", "slug required");
  }

  const db = admin.firestore();
  const venueRef = db.collection("venues").doc(venueId);
  const venueSnap = await venueRef.get();

  if (!venueSnap.exists) {
    throw new HttpsError("not-found", "Venue not found");
  }

  const exists = await db
    .collection("venues")
    .where("slug", "==", slug)
    .limit(10)
    .get();

  const slugTakenByAnother = exists.docs.some((d) => d.id !== venueId);
  if (slugTakenByAnother) {
    throw new HttpsError("already-exists", "slug already exists");
  }

  await venueRef.update({
    name,
    phone,
    email,
    slug,
    plan,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    venueId,
    slug,
    plan,
  };
});