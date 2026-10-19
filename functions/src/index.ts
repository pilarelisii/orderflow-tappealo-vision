import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getNextRefOrderId } from "./utils/utils";
import type { OrderItem } from "./types/orderItem";
import type { ResolvedVenue } from "./types/resolvedVenue";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { bumpMenuUpdatedAtByVenueId } from "./triggers/menuMeta";
import {
  ASSIGNMENT_ERROR,
  availability,
  findAssignment,
  isBookableNow,
  normalizeReservationsConfig,
  type BlockingReservation,
  type ReservableTable,
} from "./reservationEngine";

export { adminCreateVenue } from "./adminCreateVenue";
export { adminUpdateVenue } from "./adminUpdateVenue";
export { adminSetVenueEnabled, adminListAppReviews } from './admin'


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
    unit_price: safeNumber(it.unit_price, 0),
  }));
}

/* =======================
   Cupones
   ======================= */
type CouponResult =
  | { ok: false; error: string; code: string }
  | {
      ok: true;
      id: string;
      code: string;
      discount_type: "percentage" | "fixed";
      discount_value: number;
      discount_amount: number;
    };

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

async function resolveCoupon(
  db: FirebaseFirestore.Firestore,
  venueId: string,
  rawCode: any,
  subtotal: number
): Promise<CouponResult> {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Ingresá un código", code: "COUPON_EMPTY" };

  const venueSnap = await db.collection("venues").doc(venueId).get();
  if (!venueSnap.exists || !Boolean((venueSnap.data() as any)?.coupons_enabled)) {
    return { ok: false, error: "Este comercio no acepta cupones", code: "COUPONS_DISABLED" };
  }

  const snap = await db
    .collection("coupons")
    .where("venue_id", "==", venueId)
    .where("code", "==", code)
    .limit(1)
    .get();

  if (snap.empty) return { ok: false, error: "Cupón inválido", code: "COUPON_NOT_FOUND" };

  const d = snap.docs[0];
  const x = d.data() as any;

  if (!x.enabled) return { ok: false, error: "Cupón desactivado", code: "COUPON_DISABLED" };

  const expiresMs = x.expires_at?.toMillis?.() ?? null;
  // vence al final del día indicado
  if (expiresMs && Date.now() > expiresMs + 24 * 60 * 60 * 1000 - 1) {
    return { ok: false, error: "Cupón vencido", code: "COUPON_EXPIRED" };
  }

  const maxUses = x.max_uses != null ? safeNumber(x.max_uses, 0) : 0;
  if (maxUses > 0 && safeNumber(x.uses, 0) >= maxUses) {
    return { ok: false, error: "Cupón agotado", code: "COUPON_EXHAUSTED" };
  }

  const minOrder = safeNumber(x.min_order, 0);
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      ok: false,
      error: `El pedido mínimo para este cupón es $${minOrder}`,
      code: "COUPON_MIN_ORDER",
    };
  }

  const type = x.discount_type === "fixed" ? "fixed" : "percentage";
  const value = safeNumber(x.discount_value, 0);
  const raw = type === "percentage" ? (subtotal * value) / 100 : value;
  const discount_amount = roundMoney(Math.max(0, Math.min(raw, subtotal)));

  return { ok: true, id: d.id, code, discount_type: type, discount_value: value, discount_amount };
}

async function incrementCouponUses(db: FirebaseFirestore.Firestore, couponId: string) {
  await db
    .collection("coupons")
    .doc(couponId)
    .update({ uses: admin.firestore.FieldValue.increment(1) })
    .catch((e) => console.error("incrementCouponUses error:", e));
}

/* =======================
   Reservas (helpers)
   ======================= */
// Hora local del comercio (Argentina, UTC-3)
const VENUE_UTC_OFFSET_MIN = -180;

function venueNow() {
  const local = new Date(Date.now() + VENUE_UTC_OFFSET_MIN * 60000);
  return {
    ymd: local.toISOString().slice(0, 10),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

async function loadReservationContext(
  db: FirebaseFirestore.Firestore,
  venueId: string,
  date: string,
  tx?: FirebaseFirestore.Transaction
) {
  const get = (q: FirebaseFirestore.Query) => (tx ? tx.get(q) : q.get());

  const [tablesSnap, resSnap] = await Promise.all([
    get(db.collection("qr_locations").where("venue_id", "==", venueId)),
    get(db.collection("reservations").where("venue_id", "==", venueId).where("date", "==", date)),
  ]);

  const tables: ReservableTable[] = tablesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((x) => (x.delivery_type ?? "en_lugar") === "en_lugar" && x.enabled !== false)
    .map((x) => ({
      id: x.id,
      name: String(x.name ?? x.id),
      seats: safeNumber(x.seats, 4),
      reservable: x.reservable !== false,
    }));

  const reservations: BlockingReservation[] = resSnap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id,
      date: String(x.date ?? ""),
      time: String(x.time ?? ""),
      duration_minutes: safeNumber(x.duration_minutes, 0),
      people: safeNumber(x.people, 1),
      status: String(x.status ?? "pendiente"),
      table_ids: Array.isArray(x.table_ids) ? x.table_ids.map(String) : [],
    };
  });

  return { tables, reservations };
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
      coupons_enabled: Boolean(data.coupons_enabled ?? false),
      show_ratings: data.show_ratings !== false,
      reservations_enabled: Boolean(data.reservations_enabled ?? false),
      reservations_config: normalizeReservationsConfig(data.reservations_config),
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

    const [snap, venueSnap] = await Promise.all([q.get(), db.collection("venues").doc(venue.id).get()]);
    const showRatings = (venueSnap.data() as any)?.show_ratings !== false;

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
        complements: x.complements ?? null,
        updated_at: x.updated_at ?? null,
        rating_count: showRatings ? safeNumber(x.rating_count, 0) : 0,
        rating_avg:
          showRatings && safeNumber(x.rating_count, 0) > 0
            ? roundMoney(safeNumber(x.rating_sum, 0) / safeNumber(x.rating_count, 1))
            : null,
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

    // ✅ Cupón (se recalcula en el server, no se confía en el cliente)
    let total = safeNumber(body.total, 0);
    let couponFields: Record<string, any> = {};
    let couponId: string | null = null;

    if (safeString(body.coupon_code)) {
      const subtotal = safeNumber(body.subtotal, total);
      const coupon = await resolveCoupon(db, venue.id, body.coupon_code, subtotal);
      if (!coupon.ok) {
        return res.status(400).json({ error: coupon.error, code: coupon.code });
      }
      couponId = coupon.id;
      total = roundMoney(subtotal - coupon.discount_amount);
      couponFields = {
        subtotal,
        coupon_code: coupon.code,
        discount_amount: coupon.discount_amount,
      };
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
      total,
      ...couponFields,

      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("orders").add(payload);
    if (couponId) await incrementCouponUses(db, couponId);

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
      // para pedir opinión de los platos cuando se entrega
      items: Array.isArray(data.items)
        ? data.items.map((it: any) => ({
            product_id: it.product_id ?? null,
            name: it.name ?? "",
            quantity: safeNumber(it.quantity, 1),
          }))
        : [],
      reviewed: Boolean(data.reviewed),
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
        // ⚠️ solo datos públicos: el access token NUNCA sale del backend
        payment_data: x.payment_data?.mp_public_key
          ? { mp_public_key: x.payment_data.mp_public_key }
          : null,
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
   Mercado Pago (helpers)
   ======================= */
async function getMpAccessToken(db: FirebaseFirestore.Firestore, venueId: string) {
  const snap = await db
    .collection("payment_types")
    .where("venue_id", "==", venueId)
    .where("type", "==", "MP")
    .where("enabled", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const token = (snap.docs[0].data().payment_data ?? {}).mp_access_token;
  return token ? String(token) : null;
}

type MpSyncResult = {
  status: string; // estado del pago en MP (approved, rejected, in_process, ...)
  order_id: string | null;
  ref_order_id: string | null;
};

/**
 * Consulta el pago real en MP y, si está aprobado, crea la orden.
 * Idempotente: la orden usa el id del pago como id de documento y se crea con
 * `create()`, así dos notificaciones simultáneas nunca generan dos órdenes
 * ni cuentan dos veces el cupón.
 */
async function syncMpPayment(
  db: FirebaseFirestore.Firestore,
  venueId: string,
  paymentId: string
): Promise<MpSyncResult> {
  const accessToken = await getMpAccessToken(db, venueId);
  if (!accessToken) return { status: "not_configured", order_id: null, ref_order_id: null };

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 404: el id no es un pago (p. ej. notificación de merchant_order) o no es de esta cuenta
  if (mpRes.status === 404) return { status: "not_found", order_id: null, ref_order_id: null };
  if (!mpRes.ok) throw new Error(`MP payments ${mpRes.status}`);

  const payment = (await mpRes.json()) as any;
  const meta = payment?.metadata || {};
  const refOrderId = String(meta.ref_order_id ?? payment?.external_reference ?? "") || null;

  // el pago tiene que ser de este comercio
  if (meta.venue_id && String(meta.venue_id) !== String(venueId)) {
    return { status: "venue_mismatch", order_id: null, ref_order_id: null };
  }

  if (payment?.status !== "approved") {
    return { status: String(payment?.status ?? "unknown"), order_id: null, ref_order_id: refOrderId };
  }

  const orderRef = db.collection("orders").doc(`mp_${String(paymentId)}`);
  const items = Array.isArray(meta.order_items) && meta.order_items.length
    ? meta.order_items
    : Array.isArray(meta.items)
      ? meta.items
      : [];
  // lo que realmente se cobró
  const total = Number(payment?.transaction_amount ?? meta.total ?? 0);

  try {
    await orderRef.create({
      venue_id: String(venueId),
      venue_slug: meta.venue_slug ?? null,

      ref_order_id: refOrderId,
      qr_location_id: meta.qr_location_id ?? "sin-ubicacion",

      payment_method: "mercado_pago",
      payment_status: "approved",
      mp_payment_id: String(paymentId),
      mp_status: payment?.status ?? null,
      mp_status_detail: payment?.status_detail ?? null,
      mp_merchant_order_id: payment?.order?.id ? String(payment.order.id) : null,

      total,
      name: meta.customer_name ?? null,
      phone: meta.phone_number ?? null,
      additional_comments: meta.notes ?? null,

      items: normalizeOrderItems(items),

      ...(meta.coupon_code
        ? {
            coupon_code: String(meta.coupon_code),
            subtotal: Number(meta.subtotal ?? total),
            discount_amount: Number(meta.discount_amount ?? 0),
          }
        : {}),

      status: "entrante",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      paid_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (meta.coupon_id) await incrementCouponUses(db, String(meta.coupon_id));
  } catch (e: any) {
    // 6 = ALREADY_EXISTS: otra notificación ya creó la orden
    if (e?.code !== 6 && e?.code !== "already-exists") throw e;
  }

  return { status: "approved", order_id: orderRef.id, ref_order_id: refOrderId };
}

/* =======================
   POST /public/:slug/mp/preference
   ======================= */
app.post("/public/:slug/mp/preference", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();

    if (!venue.service_active) {
      return res.status(403).json({ error: "Servicio desactivado" });
    }

    // 1) Buscar MP habilitado
    const accessToken = await getMpAccessToken(db, venue.id);
    if (!accessToken) return res.status(400).json({ error: "Mercado Pago no configurado" });

    // 2) Body
    const body = req.body ?? {};
    const items = normalizeOrderItems(Array.isArray(body.items) ? body.items : []);
    if (!items.length) return res.status(400).json({ error: "Faltan items" });
    if (items.some((it) => !it.name || it.quantity <= 0 || it.unit_price < 0)) {
      return res.status(400).json({ error: "Item inválido" });
    }

    // ✅ el total se calcula acá, no se confía en el del cliente
    const subtotal = roundMoney(items.reduce((s, it) => s + it.unit_price * it.quantity, 0));
    let total = subtotal;

    // MP exige title y moneda en cada ítem
    let mpItems: any[] = items.map((it) => ({
      id: it.product_id ?? undefined,
      title: it.name.slice(0, 250),
      description: it.description ? it.description.slice(0, 250) : undefined,
      quantity: it.quantity,
      unit_price: roundMoney(it.unit_price),
      currency_id: "ARS",
    }));

    // ✅ Cupón: MP no acepta precios negativos, así que si hay descuento
    // se cobra un único ítem con el total ya descontado.
    let couponMeta: Record<string, any> = {};
    if (safeString(body.coupon_code)) {
      const coupon = await resolveCoupon(db, venue.id, body.coupon_code, subtotal);
      if (!coupon.ok) return res.status(400).json({ error: coupon.error, code: coupon.code });

      total = roundMoney(subtotal - coupon.discount_amount);
      mpItems = [
        {
          title: `Pedido ${venue.name ?? ""} (cupón ${coupon.code})`.trim(),
          quantity: 1,
          unit_price: total,
          currency_id: "ARS",
        },
      ];
      couponMeta = {
        subtotal,
        coupon_id: coupon.id,
        coupon_code: coupon.code,
        discount_amount: coupon.discount_amount,
      };
    }

    if (total <= 0) return res.status(400).json({ error: "El total debe ser mayor a 0" });

    const qr_location_id = String(body.qr_location_id ?? "").trim() || "sin-ubicacion";

    const success_url = String(body.success_url ?? "").trim();
    const failure_url = String(body.failure_url ?? "").trim();
    const pending_url = String(body.pending_url ?? "").trim();

    // obligatorias si usás auto_return
    if (!success_url) return res.status(400).json({ error: "Falta success_url" });
    if (!failure_url) return res.status(400).json({ error: "Falta failure_url" });
    if (!pending_url) return res.status(400).json({ error: "Falta pending_url" });

    // webhook público (ngrok o prod)
    const NOTIFICATION_BASE_URL = String(process.env.NOTIFICATION_BASE_URL || "").replace(/\/$/, "");
    if (!NOTIFICATION_BASE_URL) return res.status(400).json({ error: "Falta NOTIFICATION_BASE_URL" });

    const refOrderId = await getNextRefOrderId(db, venue.id);
    const notificationUrl = `${NOTIFICATION_BASE_URL}/mp/webhook/${venue.id}`;

    // ítems para cocina (promos desarmadas en productos), si el cliente los manda
    const orderItems = Array.isArray(body.order_items) ? normalizeOrderItems(body.order_items) : items;

    // 3) Preferencia MP
    const preferencePayload = {
      items: mpItems,

      back_urls: {
        success: success_url,
        failure: failure_url,
        pending: pending_url,
      },
      auto_return: "approved",
      // aprobado o rechazado al instante: un pedido de comida no puede quedar "en proceso"
      binary_mode: true,
      // la preferencia vence a los 30 min (evita pagar un carrito viejo)
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),

      notification_url: notificationUrl,
      external_reference: refOrderId,
      statement_descriptor: String(venue.name ?? "Tappealo").slice(0, 22),

      // metadata completa para crear la orden al confirmar
      metadata: {
        venue_id: venue.id,
        venue_slug: venue.slug,
        ref_order_id: refOrderId,
        qr_location_id,
        notes: safeString(body.notes),
        phone_number: safeString(body.phone_number),
        customer_name: safeString(body.customer_name),
        total,
        items,
        order_items: orderItems,
        ...couponMeta,
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

    const json = (await mpRes.json()) as any;

    if (!mpRes.ok) {
      console.error("MP preference rejected:", JSON.stringify(json));
      return res.status(400).json({ error: json?.message || "Mercado Pago rechazó el pago", details: json });
    }

    return res.json({
      preferenceId: json.id,
      init_point: json.init_point,
      sandbox_init_point: json.sandbox_init_point,
      ref_order_id: refOrderId,
      total,
    });
  } catch (e) {
    console.error("❌ MP preference error:", e);
    return res.status(500).json({ error: "Error creando preferencia MP" });
  }
});

/* =======================
   POST /public/:slug/mp/confirm  { payment_id }
   Respaldo del webhook: cuando el cliente vuelve de MP, el menú confirma
   el pago directamente para que la orden aparezca al instante.
   ======================= */
app.post("/public/:slug/mp/confirm", async (req, res) => {
  const venue = req.venue!;
  const paymentId = String(req.body?.payment_id ?? "").trim();
  if (!/^\d+$/.test(paymentId)) return res.status(400).json({ error: "payment_id inválido" });

  try {
    const db = admin.firestore();
    const result = await syncMpPayment(db, venue.id, paymentId);
    return res.json(result);
  } catch (e) {
    console.error("MP confirm error:", e);
    return res.status(500).json({ error: "No se pudo confirmar el pago" });
  }
});

// MP webhook
app.post("/mp/webhook/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;

    // Webhooks: { type: "payment", data: { id } } · IPN: ?topic=payment&id=...
    const type = String(req.body?.type ?? req.query?.type ?? req.query?.topic ?? "");
    const paymentId = String(req.body?.data?.id ?? req.query?.["data.id"] ?? req.query?.id ?? "");

    // solo nos interesan los pagos (merchant_order y otros se ignoran)
    if (!paymentId || (type && type !== "payment")) return res.status(200).send("ok");

    const db = admin.firestore();
    const result = await syncMpPayment(db, String(venueId), paymentId);
    console.log("MP webhook", { venueId, paymentId, ...result });

    return res.status(200).send("ok");
  } catch (e) {
    // 500 => MP reintenta la notificación más tarde
    console.error("WEBHOOK ERROR:", e);
    return res.status(500).send("error");
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
   POST /public/:slug/coupons/validate
   ======================= */
app.post("/public/:slug/coupons/validate", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const subtotal = safeNumber(req.body?.subtotal, 0);
    const coupon = await resolveCoupon(db, venue.id, req.body?.code, subtotal);

    if (!coupon.ok) {
      return res.status(400).json({ valid: false, error: coupon.error, code: coupon.code });
    }

    return res.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: coupon.discount_amount,
      total: roundMoney(subtotal - coupon.discount_amount),
    });
  } catch (e) {
    console.error("validate coupon error:", e);
    return res.status(500).json({ error: "Error validando cupón" });
  }
});

/* =======================
   GET /public/:slug/reservations/availability?date=YYYY-MM-DD&people=N
   ======================= */
app.get("/public/:slug/reservations/availability", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const date = String(req.query.date ?? "").trim();
    const people = Math.max(1, Math.floor(safeNumber(req.query.people, 2)));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Fecha inválida" });

    const venueSnap = await db.collection("venues").doc(venue.id).get();
    const venueData = (venueSnap.data() ?? {}) as any;
    if (!venueData.reservations_enabled) {
      return res.status(403).json({ error: "Este comercio no toma reservas", code: "RESERVATIONS_DISABLED" });
    }

    const cfg = normalizeReservationsConfig(venueData.reservations_config);
    const { tables, reservations } = await loadReservationContext(db, venue.id, date);
    const now = venueNow();

    const slots = availability(cfg, tables, reservations, date, people, now.ymd, now.minutes);
    return res.json({ date, people, closed: slots.length === 0, slots });
  } catch (e) {
    console.error("availability error:", e);
    return res.status(500).json({ error: "Error consultando disponibilidad" });
  }
});

/* =======================
   POST /public/:slug/reservations
   ======================= */
app.post("/public/:slug/reservations", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const venueSnap = await db.collection("venues").doc(venue.id).get();
    const venueData = (venueSnap.data() ?? {}) as any;

    if (!venueData.reservations_enabled) {
      return res.status(403).json({ error: "Este comercio no toma reservas", code: "RESERVATIONS_DISABLED" });
    }

    const cfg = normalizeReservationsConfig(venueData.reservations_config);
    const body = req.body ?? {};

    const name = safeString(body.name);
    const phone = safeString(body.phone);
    const date = String(body.date ?? "").trim(); // YYYY-MM-DD
    const time = String(body.time ?? "").trim(); // HH:mm
    const people = Math.floor(safeNumber(body.people, 0));

    if (!name) return res.status(400).json({ error: "El nombre es requerido" });
    if (!phone) return res.status(400).json({ error: "El teléfono es requerido" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Fecha inválida" });
    if (people < 1 || people > cfg.max_people) {
      return res.status(400).json({ error: `La cantidad de personas debe ser entre 1 y ${cfg.max_people}` });
    }

    const now = venueNow();
    if (!isBookableNow(cfg, date, time, now.ymd, now.minutes)) {
      return res.status(400).json({ error: "Ese horario ya no está disponible", code: "NOT_BOOKABLE" });
    }

    const ref = db.collection("reservations").doc();

    // ✅ transacción: dos clientes no pueden quedarse con la misma mesa
    const result = await db.runTransaction(async (tx) => {
      const { tables, reservations } = await loadReservationContext(db, venue.id, date, tx);
      const assignment = findAssignment(cfg, tables, reservations, date, time, people);
      if (!assignment.ok) return assignment;

      const tableNames = assignment.table_ids.map((id) => tables.find((t) => t.id === id)?.name ?? id);
      const status = cfg.auto_confirm ? "confirmada" : "pendiente";

      tx.set(ref, {
        venue_id: venue.id,
        name,
        phone,
        date,
        time,
        people,
        duration_minutes: cfg.duration_minutes,
        table_ids: assignment.table_ids,
        table_names: tableNames,
        notes: safeString(body.notes),
        status,
        source: "menu",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true as const, status };
    });

    if (!result.ok) {
      return res.status(409).json({ error: ASSIGNMENT_ERROR[result.reason], code: result.reason.toUpperCase() });
    }

    return res.status(201).json({ ok: true, id: ref.id, status: result.status });
  } catch (e) {
    console.error("create reservation error:", e);
    return res.status(500).json({ error: "Error creando reserva" });
  }
});

/* =======================
   POST /public/:slug/reviews
   { order_id, dishes: [{ product_id, name, stars, comment }], app?: { stars, comment } }
   ======================= */
app.post("/public/:slug/reviews", async (req, res) => {
  const venue = req.venue!;
  try {
    const db = admin.firestore();
    const body = req.body ?? {};
    const orderId = String(body.order_id ?? "").trim();
    if (!orderId) return res.status(400).json({ error: "order_id es requerido" });

    const clampStars = (v: any) => Math.round(safeNumber(v, 0));
    const comment = (v: any) => (safeString(v) ?? "").slice(0, 500) || null;

    const orderRef = db.collection("orders").doc(orderId);

    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw Object.assign(new Error("Orden no encontrada"), { http: 404 });

      const order = orderSnap.data() as any;
      if (order.venue_id !== venue.id) throw Object.assign(new Error("No autorizado"), { http: 403 });
      if (order.status !== "terminadas") {
        throw Object.assign(new Error("Podés opinar cuando el pedido esté entregado"), { http: 400 });
      }
      if (order.reviewed) throw Object.assign(new Error("Este pedido ya tiene opinión"), { http: 409 });

      // solo platos que estaban en el pedido
      const orderProducts = new Map<string, string>(
        (Array.isArray(order.items) ? order.items : [])
          .filter((it: any) => it.product_id)
          .map((it: any) => [String(it.product_id), String(it.name ?? "")])
      );

      const dishes = (Array.isArray(body.dishes) ? body.dishes : [])
        .map((d: any) => ({
          product_id: String(d.product_id ?? ""),
          stars: clampStars(d.stars),
          comment: comment(d.comment),
        }))
        .filter((d: any) => orderProducts.has(d.product_id) && d.stars >= 1 && d.stars <= 5);

      // lecturas antes de escrituras (regla de transacciones)
      const productRefs = dishes.map((d: any) => db.collection("products").doc(d.product_id));
      const productSnaps = productRefs.length ? await tx.getAll(...productRefs) : [];

      dishes.forEach((d: any, i: number) => {
        tx.create(db.collection("reviews").doc(`${orderId}_${d.product_id}`), {
          venue_id: venue.id,
          order_id: orderId,
          ref_order_id: order.ref_order_id ?? null,
          product_id: d.product_id,
          product_name: orderProducts.get(d.product_id) ?? "",
          stars: d.stars,
          comment: d.comment,
          customer_name: order.name ?? null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (productSnaps[i]?.exists) {
          tx.update(productRefs[i], {
            rating_sum: admin.firestore.FieldValue.increment(d.stars),
            rating_count: admin.firestore.FieldValue.increment(1),
          });
        }
      });

      const appStars = clampStars(body.app?.stars);
      if (appStars >= 1 && appStars <= 5) {
        tx.create(db.collection("app_reviews").doc(orderId), {
          venue_id: venue.id,
          venue_name: venue.name ?? null,
          venue_slug: venue.slug ?? null,
          order_id: orderId,
          stars: appStars,
          comment: comment(body.app?.comment),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      tx.update(orderRef, { reviewed: true, reviewed_at: admin.firestore.FieldValue.serverTimestamp() });
    });

    return res.status(201).json({ ok: true });
  } catch (e: any) {
    if (e?.http) return res.status(e.http).json({ error: e.message });
    console.error("create review error:", e);
    return res.status(500).json({ error: "Error guardando la opinión" });
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