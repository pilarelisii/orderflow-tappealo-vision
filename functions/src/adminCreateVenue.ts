import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

type Payload = {
  email: string;
  password: string;
  slug: string;
  name: string;

  phone?: string | null;
  location_link?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  social_link?: string | null;
};

function normSlug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/--+/g, "-");
}

function cleanNullable(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : null;
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

export const adminCreateVenue = onCall(async (request) => {
  // ✅ auth viene en request.auth
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required");

  await assertAdmin(uid);

  // ✅ data viene en request.data
  const p = request.data as Payload;

  const email = String(p.email || "").trim().toLowerCase();
  const password = String(p.password || "");
  const slug = normSlug(String(p.slug || ""));
  const name = String(p.name || "").trim();

  if (!email) throw new HttpsError("invalid-argument", "email required");
  if (password.length < 6) throw new HttpsError("invalid-argument", "password min 6");
  if (!slug) throw new HttpsError("invalid-argument", "slug required");
  if (!name) throw new HttpsError("invalid-argument", "name required");

  const db = admin.firestore();

  // slug único
  const exists = await db.collection("venues").where("slug", "==", slug).limit(1).get();
  if (!exists.empty) throw new HttpsError("already-exists", "slug already exists");

  // crear user auth
  let authUser: admin.auth.UserRecord;
  try {
    authUser = await admin.auth().createUser({ email, password });
  } catch (e: any) {
    throw new HttpsError("already-exists", e?.message || "Auth create failed");
  }

  // crear doc venue
  const venueRef = db.collection("venues").doc();
  await venueRef.set({
    auth_id: authUser.uid,
    slug,
    name,

    phone: cleanNullable(p.phone),
    location_link: cleanNullable(p.location_link),
    address_1: cleanNullable(p.address_1),
    address_2: cleanNullable(p.address_2),
    social_link: cleanNullable(p.social_link),

    enabled: true,
    service_active: true,

    logo_url: null,
    logo_path: null,

    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: null,
  });

  return { ok: true, venueId: venueRef.id, authId: authUser.uid, slug };
});