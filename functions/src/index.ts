import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getNextRefOrderId } from "./utils/utils";
import type { OrderItem } from "./types/orderItem";
import type { ResolvedVenue } from "./types/resolvedVenue";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { bumpMenuUpdatedAtByVenueId } from "./triggers/menuMeta";

export { adminCreateVenue } from "./adminCreateVenue";
export { adminUpdateVenue } from "./adminUpdateVenue";
export { adminSetVenueEnabled } from './admin'


admin.initializeApp();

/* =======================
   Utils
   ======================= */
function slugFromHost(host?: string | null) {
  if (!host) return null;

  const clean = host.split(":")[0].toLowerCase();

  // ✅ soportar subdominio.localhost en dev
  if (clean.endsWith(".localhost")) {
    const parts = clean.split(".");
    return parts[0] || null; // cafeprueba.localhost -> cafeprueba
  }

  // localhost o IP -> no subdominio
  if (clean === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return null;

  const parts = clean.split(".");
  if (parts.length < 3) return null;

  return parts[0];
}

function safeString(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOrderItems(items: any[]): OrderItem[] {
  return items.map((it) => ({
    product_id: safeString(it.product_id),
    name: safeString(it.name) ?? "",
    description: safeString(it.description) ?? "",
    quantity: safeNumber(it.quantity, 0),
  }));
}

/* =======================
   Venue resolver middleware
   ======================= */
async function resolveVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const db = admin.firestore();

    // ✅ 1) slug por ruta: /public/:slug/...
    const routeSlug = (req.params?.slug ? String(req.params.slug) : "")
      .trim()
      .toLowerCase();

    // ✅ 2) slug por query: ?slug=...
    const slugOverride = (req.query.slug ? String(req.query.slug) : "")
      .trim()
      .toLowerCase();

    // ✅ 3) slug por subdominio (web)
    const hostSlug = slugFromHost(req.headers.host);

    const slug = routeSlug || slugOverride || hostSlug;

    if (!slug) {
      return res.status(400).json({
        error: "No se pudo resolver el venue (falta /:slug, subdominio o ?slug=...)",
      });
    }

    const snap = await db
      .collection("venues")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "Venue no encontrado" });
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data() as any;

    req.venue = {
      id: docSnap.id,
      slug: data.slug ?? null,
      name: data.name ?? null,
      enabled: Boolean(data.enabled ?? true),
      service_active: Boolean(data.service_active),
    } satisfies ResolvedVenue;

    return next();
  } catch (e) {
    console.error("resolveVenue error:", e);
    return res.status(500).json({ error: "Error resolviendo venue" });
  }
}

/* =======================
   Express App
   ======================= */
const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/public/:slug/health", (_req, res) => res.json({ ok: true }));

app.use("/public/:slug", resolveVenue);

/* =======================
   /public/:slug/venue
   ======================= */
app.get("/public/:slug/venue", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const snap = await db.collection("venues").doc(venue.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Venue no encontrado" });

    const data = snap.data() as any;

    return res.json({
      id: snap.id,
      slug: data.slug ?? null,
      name: data.name ?? null,
      service_active: Boolean(data.service_active),
      menu_version: Number(data.menu_version ?? 1),
      logo_url: data.logo_url ?? null,
      phone: data.phone ?? null,
      location_link: data.location_link ?? null,
      social_link: data.social_link ?? null,
      address_1: data.address_1 ?? null,
      address_2: data.address_2 ?? null,
      plan: data.plan ?? "demo",
      enabled: Boolean(data.enabled ?? true),
      calls: Boolean(data.calls ?? true),
      phone_client: Boolean(data.phone_client ?? true),
      additional_content: data.additional_content ?? null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando venue" });
  }
});

/* =======================
   /public/:slug/:slug/menu/meta
   ======================= */
app.get("/public/:slug/:slug/menu/meta", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const snap = await db.collection("venues").doc(venue.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Venue no encontrado" });

    const data = snap.data() as any;

    const ts = data.menu_updated_at ?? data.menuUpdatedAt ?? data.updated_at ?? null;

    const ms =
      ts?.toMillis?.() ? ts.toMillis() : typeof ts === "number" ? ts : null;

    return res.json({
      venue_id: venue.id,
      slug: data.slug ?? null,
      menu_updated_at: ms,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando menu meta" });
  }
});

/* =======================
   /public/:slug/:slug/products/categories
   ======================= */
app.get("/public/:slug/products/categories", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();

    const snap = await db
      .collection("categories")
      .where("venue_id", "==", venue.id)
      .where("enabled", "==", true)
      .get();

    const list = snap.docs.map((d) => {
      const x = d.data() as any;

      return {
        id: d.id,
        venue_id: x.venue_id ?? null,
        name: x.name ?? null,
        enabled: Boolean(x.enabled),
        order: Number(x.order ?? 9999),
      };
    });

    list.sort((a, b) => {
      const orderA = Number(a.order ?? 9999);
      const orderB = Number(b.order ?? 9999);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando categorías" });
  }
});

/* =======================
   /public/:slug/products?category_id=
   ======================= */
app.get("/public/:slug/products", async (req, res) => {
  const venue = req.venue!;
  const categoryId = (req.query.category_id ? String(req.query.category_id) : "").trim();

  try {
    const db = admin.firestore();

    let q: FirebaseFirestore.Query = db
      .collection("products")
      .where("venue_id", "==", venue.id)
      .where("enabled", "==", true);

    if (categoryId) q = q.where("category_id", "==", categoryId);

    const snap = await q.get();

    const list = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        venue_id: x.venue_id ?? null,
        category_id: x.category_id ?? null,
        name: x.name ?? null,
        description: x.description ?? null,
        image_url: x.image_url ?? null,
        price: safeNumber(x.price, 0),
        quantity: safeNumber(x.quantity, 0),
        enabled: Boolean(x.enabled),
        created_at: x.created_at ?? null,
        updated_at: x.updated_at ?? null,
      };
    });

    list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando productos" });
  }
});

/* =======================
   /public/:slug/promotions?active=true
   ======================= */
app.get("/public/:slug/promotions", async (req, res) => {
  const venue = req.venue!;
  const active = String(req.query.active ?? "").toLowerCase() === "true";

  try {
    const db = admin.firestore();

    const snap = await db
      .collection("promotions")
      .where("venue_id", "==", venue.id)
      .where("enabled", "==", true)
      .get();

    const now = admin.firestore.Timestamp.now();

    let list = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        venue_id: x.venue_id ?? null,
        name: x.name ?? null,
        image_url: x.image_url ?? null,
        price: safeNumber(x.price, 0),
        discount: safeNumber(x.discount, 0),
        start_date: x.start_date ?? null,
        end_date: x.end_date ?? null,
        enabled: Boolean(x.enabled),
        items: Array.isArray(x.items) ? x.items : [],
        created_at: x.created_at ?? null,
        updated_at: x.updated_at ?? null,
      };
    });

    if (active) {
      list = list.filter((p) => {
        const sd: any = p.start_date;
        const ed: any = p.end_date;
        if (!sd || !ed) return false;
        try {
          const t = now.toMillis();
          return sd.toMillis() <= t && t <= ed.toMillis();
        } catch {
          return false;
        }
      });
    }

    list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando promociones" });
  }
});

/* =======================
   POST /public/:slug/orders
   ======================= */
app.post("/public/:slug/orders", async (req, res) => {
  const venue = req.venue!;

  try {
    const db = admin.firestore();

    if (!venue.service_active) {
      return res.status(403).json({ error: "Servicio desactivado" });
    }

    const body = req.body ?? {};

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "items es requerido" });
    }

    const items = normalizeOrderItems(body.items);

    for (const it of items) {
      if (!it.name || it.quantity <= 0) {
        return res.status(400).json({ error: "Item inválido (name/quantity)" });
      }
    }

    let qrLocationId = safeString(body.qr_location_id) || "sin ubicacion";

    const paymentMethod = safeString(body.payment_method);

    if (!paymentMethod) {
      return res.status(400).json({ error: "payment_method es requerido" });
    }

    if (qrLocationId !== "sin ubicacion") {
      const qrSnap = await db.collection("qr_locations").doc(qrLocationId).get();

      if (!qrSnap.exists) {
        return res.status(404).json({ error: "QR no encontrado" });
      }

      const qrData = qrSnap.data() as any;
      if (qrData.venue_id !== venue.id) {
        return res.status(403).json({ error: "QR no pertenece al venue" });
      }
    }

    const refOrderId = await getNextRefOrderId(db, venue.id);

    // ✅ Validar límite para plan demo
    const venueSnap = await db.collection("venues").doc(venue.id).get();
    if (!venueSnap.exists) {
      return res.status(404).json({ error: "Venue no encontrado" });
    }

    const venueData = venueSnap.data() as any;
    const venuePlan = String(venueData?.plan ?? "").trim().toLowerCase();

    if (venuePlan === "demo") {
      const activeStatuses = ["entrante", "preparacion", "retirar", "falta-pagar"];

      const activeOrdersSnap = await db
        .collection("orders")
        .where("venue_id", "==", venue.id)
        .where("status", "in", activeStatuses)
        .get();

      if (activeOrdersSnap.size >= 5) {
        return res.status(403).json({
          error: "Límite de comandas alcanzado para el plan demo",
          code: "DEMO_ORDER_LIMIT_REACHED",
        });
      }
    }

    const payload: any = {
      venue_id: venue.id,
      qr_location_id: qrLocationId,
      payment_method: paymentMethod,
      ref_order_id: refOrderId,

      items,
      additional_comments: safeString(body.additional_comments),
      phone: safeString(body.phone),
      name: safeString(body.name),

      status: "entrante",
      total: safeNumber(body.total, 0),

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("orders").add(payload);

    return res.status(201).json({
      id: ref.id,
      ref_order_id: refOrderId,
    });
  } catch (e) {
    console.error("POST /public/:slug/orders error:", e);
    return res.status(500).json({ error: "Error creando orden" });
  }
});

/* =======================
   PATCH /public/:slug/orders/:id/status
======================= */
const ORDER_STATUSES = ["entrante", "preparacion", "retirar", "falta-pagar", "terminadas"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

app.get("/public/:slug/orders/:id/status", async (req, res) => {
  const venue = req.venue!;
  const orderId = String(req.params.id || "").trim();
  if (!orderId) return res.status(400).json({ error: "id es requerido" });

  try {
    const db = admin.firestore();
    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: "Orden no encontrada" });

    const data = snap.data() as any;
    if (data.venue_id !== venue.id) return res.status(403).json({ error: "No autorizado" });

    return res.json({
      id: snap.id,
      status: (data.status ?? "entrante") as OrderStatus,
      qr_location_id: data.qr_location_id ?? "sin-ubicacion",
      ref_order_id: data.ref_order_id ?? null,
      updated_at: data.updated_at ?? null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error obteniendo status" });
  }
});

/* =======================
   GET /public/:slug/payment_methods
   ======================= */
app.get("/public/:slug/payment_methods", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();

    const snap = await db.collection("payment_types").where("venue_id", "==", venue.id).get();

    const list = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? null,
        type: x.type ?? null,
        enabled: Boolean(x.enabled),
        venue_id: x.venue_id ?? null,
        payment_data: x.payment_data ?? null,
        created_at: x.created_at ?? null,
        updated_at: x.updated_at ?? null,
      };
    });

    list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando payment_methods" });
  }
});

/* =======================
   GET /public/:slug/products/featured
   ======================= */
app.get("/public/:slug/products/featured", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();

    const snap = await db
      .collection("products")
      .where("venue_id", "==", venue.id)
      .where("enabled", "==", true)
      .where("featured", "==", true)
      .limit(4)
      .get();

    const list = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        venue_id: x.venue_id ?? null,
        category_id: x.category_id ?? null,
        name: x.name ?? null,
        description: x.description ?? null,
        image_url: x.image_url ?? null,
        price: safeNumber(x.price, 0),
        featured: Boolean(x.featured),
      };
    });

    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando destacados" });
  }
});

/* =======================
   POST /public/:slug/mp/preference
   ======================= */
app.post("/public/:slug/mp/preference", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();

    // 1) Buscar MP habilitado
    const snap = await db
      .collection("payment_types")
      .where("venue_id", "==", venue.id)
      .where("type", "==", "MP")
      .where("enabled", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return res.status(400).json({ error: "Mercado Pago no configurado" });

    const mpData = snap.docs[0].data().payment_data ?? {};
    const accessToken = mpData.mp_access_token;
    if (!accessToken) return res.status(400).json({ error: "Falta mp_access_token" });

    // 2) Body
    const body = req.body ?? {};
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total ?? 0);

    const qr_location_id = String(body.qr_location_id ?? "").trim();
    //const ref_order_id = String(body.ref_order_id ?? "").trim();

    const success_url = String(body.success_url ?? "").trim();
    const failure_url = String(body.failure_url ?? "").trim();
    const pending_url = String(body.pending_url ?? "").trim();
    const refOrderId = await getNextRefOrderId(db, venue.id);


    if (!qr_location_id) return res.status(400).json({ error: "Falta qr_location_id" });
    //if (!ref_order_id) return res.status(400).json({ error: "Falta ref_order_id" });
    if (!items.length) return res.status(400).json({ error: "Faltan items" });

    // obligatorias si usás auto_return
    if (!success_url) return res.status(400).json({ error: "Falta success_url" });
    if (!failure_url) return res.status(400).json({ error: "Falta failure_url" });
    if (!pending_url) return res.status(400).json({ error: "Falta pending_url" });

    // webhook público (ngrok o prod)
    const NOTIFICATION_BASE_URL = String(process.env.NOTIFICATION_BASE_URL || "").replace(/\/$/, "");
    if (!NOTIFICATION_BASE_URL) return res.status(400).json({ error: "Falta NOTIFICATION_BASE_URL" });

    const notificationUrl = `${NOTIFICATION_BASE_URL}/mp/webhook/${venue.id}`;

    const notes = body.notes ?? null;
    const phone_number = body.phone_number ?? null;
    const customer_name = body.customer_name ?? null;

    // 3) Preferencia MP (SIN orderId inexistente)
    const preferencePayload = {
      items: items.map((it: any) => ({
        title: String(it.name ?? "Producto"),
        quantity: Number(it.quantity ?? 1),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
      })),

      back_urls: {
        success: success_url,
        failure: failure_url,
        pending: pending_url,
      },
      auto_return: "approved",

      // webhook
      notification_url: notificationUrl,

      // referencia tuya (la usás para debug / conciliación)
      external_reference: refOrderId,

      // metadata completa para crear la orden al confirmar
      metadata: {
        venue_id: venue.id,
        venue_slug: venue.slug,
        refOrderId,
        qr_location_id,
        notes,
        phone_number,
        customer_name,
        total,
        items, // ✅ CLAVE: webhook crea orden con esto
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const json = await mpRes.json();

    if (!mpRes.ok) {
      return res.status(400).json({ error: "MP error", details: json });
    }

    return res.json({
      preferenceId: json.id,
      init_point: json.init_point,
      sandbox_init_point: json.sandbox_init_point,
      ref_order_id: refOrderId
    });
  } catch (e) {
    console.error("❌ MP preference error:", e);
    return res.status(500).json({ error: "Error creando preferencia MP" });
  }
});

// MP webhook
app.post("/mp/webhook/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;

    // MP manda id por body o por query
    const paymentId =
      req.body?.data?.id ||
      req.query?.["data.id"] ||
      req.query?.id ||
      null;

    if (!paymentId) return res.status(200).send("ok");

    const db = admin.firestore();

    // 1) buscar access token del venue
    const snap = await db
      .collection("payment_types")
      .where("venue_id", "==", venueId)
      .where("type", "==", "MP")
      .where("enabled", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return res.status(200).send("ok");

    const mpData = snap.docs[0].data().payment_data ?? {};
    const accessToken = mpData.mp_access_token;
    if (!accessToken) return res.status(200).send("ok");

    // 2) consultar pago real
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payment = await mpRes.json();

    // 3) SOLO approved crea orden
    if (payment?.status !== "approved") return res.status(200).send("ok");

    // 4) idempotencia fuerte: docId por paymentId (nunca duplica)
    const orderDocId = `mp_${String(paymentId)}`;
    const orderRef = db.collection("orders").doc(orderDocId);
    const exists = await orderRef.get();
    if (exists.exists) return res.status(200).send("ok");

    const meta = payment?.metadata || {};
    const items = Array.isArray(meta.items) ? meta.items : [];
    const total = Number(meta.total ?? payment?.transaction_amount ?? 0);

    // 5) crear orden FINAL (entrante)
    await orderRef.set({
      venue_id: String(meta.venue_id ?? venueId),
      venue_slug: meta.venue_slug ?? null,

      ref_order_id: meta.ref_order_id ?? payment?.external_reference ?? null,
      qr_location_id: meta.qr_location_id ?? "sin-ubicacion",

      payment_method: "mercado_pago",
      payment_status: "approved",
      mp_payment_id: String(paymentId),
      mp_status: payment?.status ?? null,
      mp_status_detail: payment?.status_detail ?? null,
      mp_preference_id: payment?.order?.id ?? null,

      total,
      name: meta.customer_name ?? null,
      phone: meta.phone_number ?? null,
      additional_comments: meta.notes ?? null,

      items,

      status: "entrante",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      paid_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).send("ok");
  } catch (e) {
    console.error("WEBHOOK ERROR:", e);
    return res.status(200).send("ok");
  }
});

/* =======================
   GET /public/:slug/orders/by-ref/:refOrderId
   ======================= */
app.get("/public/:slug/orders/by-ref/:refOrderId", async (req, res) => {
  const venue = req.venue!;

  try {
    const db = admin.firestore();

    const refOrderId = String(req.params.refOrderId || "").trim();

    if (!refOrderId) {
      return res.status(400).json({ error: "Falta refOrderId" });
    }

    const snap = await db
      .collection("orders")
      .where("venue_id", "==", venue.id)
      .where("ref_order_id", "==", refOrderId)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({
        found: false,
      });
    }

    const orderDoc = snap.docs[0];
    const data = orderDoc.data() as any;

    return res.json({
      found: true,
      id: orderDoc.id,
      ref_order_id: data.ref_order_id,
      qr_location_id: data.qr_location_id,
      status: data.status,
    });
  } catch (e) {
    console.error("GET order by ref error:", e);
    return res.status(500).json({ error: "Error buscando orden" });
  }
});

/* =======================
   GET /public/:slug/qr_locations/:id
   ======================= */
app.get("/public/:slug/qr_locations/:id", async (req, res) => {
  const venue = req.venue!;
  const qrLocationId = String(req.params.id || "").trim();

  if (!qrLocationId) return res.status(400).json({ error: "id es requerido" });

  try {
    const db = admin.firestore();

    // 👇 tu colección real es "qr_locations" (según tu POST /orders)
    const snap = await db.collection("qr_locations").doc(qrLocationId).get();

    if (!snap.exists) {
      return res.status(404).json({ found: false, id: qrLocationId, name: qrLocationId });
    }

    const data = snap.data() as any;

    // 🔒 Asegurar que pertenece a este venue
    if (String(data.venue_id) !== String(venue.id)) {
      return res.status(403).json({ error: "QR no pertenece al venue" });
    }

    return res.json({
      found: true,
      id: snap.id,
      name: data.name ?? qrLocationId,
      type: data.delivery_type ?? null, // si lo tenés (en lugar/envio/etc)
      enabled: Boolean(data.enabled ?? true),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error cargando qr_location" });
  }
});

/* =======================
   POST /public/:slug/calls
   ======================= */
app.post("/public/:slug/calls", async (req, res) => {
  const venue = req.venue!;

  try {
    const db = admin.firestore();

    const qr_location_id = String(req.body?.qr_location_id ?? "").trim();
    if (!qr_location_id) {
      return res.status(400).json({ error: "Falta qr_location_id" });
    }

    const type = String(req.body?.type ?? "").trim();
    if (!["bill", "call"].includes(type)) {
    return res.status(400).json({ 
      error: "Tipo de llamada inválido",
      code: "INVALID_CALL_TYPE",
    });
  }

    // validar QR existe y pertenece al venue
    const qrRef = db.collection("qr_locations").doc(qr_location_id);
    const qrSnap = await qrRef.get();

    if (!qrSnap.exists) {
      return res.status(404).json({ error: "QR no encontrado" });
    }

    const qr = qrSnap.data() as any;
    if (String(qr.venue_id) !== String(venue.id)) {
      return res.status(403).json({ error: "QR no pertenece al venue" });
    }

    // ✅ Validar límite para plan demo
    const venueSnap = await db.collection("venues").doc(venue.id).get();
    if (!venueSnap.exists) {
      return res.status(404).json({ error: "Venue no encontrado" });
    }

    const venueData = venueSnap.data() as any;
    const venuePlan = String(venueData?.plan ?? "").trim().toLowerCase();

    if (venuePlan === "demo") {
      // activas = no resueltas
      const activeCallsSnap = await db
        .collection("calls")
        .where("venue_id", "==", venue.id)
        .where("resolved", "==", false)
        .get();

      if (activeCallsSnap.size >= 5) {
        return res.status(403).json({
          error: "Límite de llamadas alcanzado para el plan demo",
          code: "DEMO_CALL_LIMIT_REACHED",
        });
      }
    }

    // crear call
    const callRef = db.collection("calls").doc();
    
    await callRef.set({
      venue_id: venue.id,
      qr_location_id,
      qr_location_name: qr.name ?? null,

      seen: false,
      resolved: false,
      type,

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      seen_at: null,
      resolved_at: null,
    });

    return res.status(201).json({
      ok: true,
      call_id: callRef.id,
    });
  } catch (e) {
    console.error("create call error:", e);
    return res.status(500).json({ error: "Error creando llamada" });
  }
});


/* =======================
   Export Cloud Function
   ======================= */
export const publicApi = functions.https.onRequest(app);

export const onProductWrite = onDocumentWritten(
  { document: "products/{id}", region: "us-central1" },
  async (event) => {
    const after = event.data?.after?.data() as any;
    const before = event.data?.before?.data() as any;
    const venueId = (after?.venue_id ?? before?.venue_id) as string | undefined;
    if (!venueId) return;
    await bumpMenuUpdatedAtByVenueId(venueId);
  }
);

export const onCategoryWrite = onDocumentWritten(
  { document: "categories/{id}", region: "us-central1" },
  async (event) => {
    const after = event.data?.after?.data() as any;
    const before = event.data?.before?.data() as any;
    const venueId = (after?.venue_id ?? before?.venue_id) as string | undefined;
    if (!venueId) return;
    await bumpMenuUpdatedAtByVenueId(venueId);
  }
);