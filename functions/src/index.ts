import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();

const corsHandler = cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// IMPORTANT: evitar el error de path-to-regexp usando regex
app.options(/.*/, corsHandler);
app.use(corsHandler);
app.use(express.json());

const ok = (res: any, body: any) => res.status(200).json(body);
const bad = (res: any, status: number, error: any) =>
  res.status(status).json({ error: String(error?.message || error) });

/**
 * VENUES
 */
app.get("/venues/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;
    const snap = await db.collection("venues").doc(venueId).get();
    if (!snap.exists) return bad(res, 404, "Venue not found");
    return ok(res, { id: snap.id, ...snap.data() });
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

app.patch("/venues/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;

    const allowed = ["service_active", "google_maps_url", "phone", "name", "slug"];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k];
    }

    await db.collection("venues").doc(venueId).set(
      {
        ...patch,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const fresh = await db.collection("venues").doc(venueId).get();
    return ok(res, { id: fresh.id, ...fresh.data() });
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

/**
 * QR LOCATIONS
 * Colección: qr_locations
 * Campos: venue_id, code, delivery_type, enabled, name, created_at
 */
app.get("/venues/:venueId/qrs", async (req, res) => {
  try {
    const { venueId } = req.params;

    // ✅ Sin orderBy para evitar índice compuesto.
    const qs = await db
      .collection("qr_locations")
      .where("venue_id", "==", venueId)
      .get();

    const data = qs.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")));

    return ok(res, data);
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

app.post("/venues/:venueId/qrs", async (req, res) => {
  try {
    const { venueId } = req.params;
    const code = String(req.body?.code || "").trim().toLowerCase();
    const delivery_type = String(req.body?.delivery_type || "en_lugar");

    if (!code) return bad(res, 400, "Missing code");

    // evitar duplicados por venue_id + code
    const existing = await db
      .collection("qr_locations")
      .where("venue_id", "==", venueId)
      .where("code", "==", code)
      .limit(1)
      .get();

    if (!existing.empty) return bad(res, 409, "QR code already exists");

    const docRef = await db.collection("qr_locations").add({
      venue_id: venueId,
      code,
      delivery_type,
      enabled: true,
      name: req.body?.name ?? "",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const fresh = await docRef.get();
    return ok(res, { id: fresh.id, ...fresh.data() });
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

app.patch("/venues/:venueId/qrs/:qrId", async (req, res) => {
  try {
    const { venueId, qrId } = req.params;

    const ref = db.collection("qr_locations").doc(qrId);
    const snap = await ref.get();
    if (!snap.exists) return bad(res, 404, "QR not found");

    const data = snap.data() as any;
    if (data.venue_id !== venueId) return bad(res, 403, "Forbidden");

    const patch: Record<string, any> = {};
    if ("code" in req.body) patch.code = String(req.body.code || "").trim().toLowerCase();
    if ("delivery_type" in req.body) patch.delivery_type = String(req.body.delivery_type || "");
    if ("enabled" in req.body) patch.enabled = !!req.body.enabled;
    if ("name" in req.body) patch.name = req.body.name ?? "";

    // si cambian code, chequear duplicado
    if (patch.code && patch.code !== data.code) {
      const existing = await db
        .collection("qr_locations")
        .where("venue_id", "==", venueId)
        .where("code", "==", patch.code)
        .limit(1)
        .get();

      if (!existing.empty) return bad(res, 409, "QR code already exists");
    }

    await ref.set(
      {
        ...patch,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const fresh = await ref.get();
    return ok(res, { id: fresh.id, ...fresh.data() });
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

app.delete("/venues/:venueId/qrs/:qrId", async (req, res) => {
  try {
    const { venueId, qrId } = req.params;

    const ref = db.collection("qr_locations").doc(qrId);
    const snap = await ref.get();
    if (!snap.exists) return bad(res, 404, "QR not found");

    const data = snap.data() as any;
    if (data.venue_id !== venueId) return bad(res, 403, "Forbidden");

    await ref.delete();
    return ok(res, { ok: true });
  } catch (e) {
    console.error(e);
    return bad(res, 500, e);
  }
});

app.get("/menu", async (req, res) => {
  try {
    const venueSlug = String(req.query.venue || "").trim().toLowerCase();
    if (!venueSlug) return res.status(400).json({ error: "Missing ?venue=slug" });

    const venueSnap = await db
      .collection("venues")
      .where("slug", "==", venueSlug)
      .limit(1)
      .get();

    if (venueSnap.empty) return res.status(404).json({ error: "Venue not found" });

    const venueDoc = venueSnap.docs[0];
    const venueId = venueDoc.id;

    // ✅ Evitamos índices: no usamos orderBy en Firestore, ordenamos en memoria
    const productsSnap = await db
      .collection("products")
      .where("venueId", "==", venueId)
      .where("enabled", "==", true)
      .get();

    const products = productsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")));

    return res.json({
      venue: { id: venueId, ...(venueDoc.data() as any) },
      products: products.map((p) => ({
        id: p.id,
        name: p.name ?? "",
        description: p.description ?? null,
        price: p.price ?? 0,
        category: p.category ?? "OTROS",
        quantity: p.quantity ?? 0,
        imageUrl: p.imageUrl ?? null,
      })),
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const venueSlug = String(req.body?.venueSlug || "").trim().toLowerCase();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const total = Number(req.body?.total || 0);

    if (!venueSlug) return res.status(400).json({ error: "Missing venueSlug" });
    if (!items.length) return res.status(400).json({ error: "Missing items" });
    if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ error: "Invalid total" });

    const venueSnap = await db
      .collection("venues")
      .where("slug", "==", venueSlug)
      .limit(1)
      .get();

    if (venueSnap.empty) return res.status(404).json({ error: "Venue not found" });

    const venueDoc = venueSnap.docs[0];
    const venueId = venueDoc.id;

    // (Opcional) si querés respetar “service_active”
    const venueData = venueDoc.data() as any;
    if (venueData?.service_active === false) {
      return res.status(403).json({ error: "Venue is closed" });
    }

    const orderData = {
      venueId,
      status: "entrante",
      items: items.map((i: any) => ({
        item: String(i.item || ""),
        cantidad: Number(i.cantidad || 0),
        descripcion: i.descripcion ? String(i.descripcion) : null,
      })),
      total,
      lugar_entrega: req.body?.lugar_entrega ? String(req.body.lugar_entrega) : "",
      telefono: req.body?.telefono ? String(req.body.telefono) : null,
      nombre: req.body?.nombre ? String(req.body.nombre) : null,
      comentarios_generales: req.body?.comentarios_generales ? String(req.body.comentarios_generales) : null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("orders").add(orderData);
    const saved = await ref.get();

    return res.status(201).json({ id: saved.id, ...(saved.data() as any) });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

export const api = onRequest({ region: "us-central1" }, app);