import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { parse } from "csv-parse/sync";

/* ======================
   CONFIG
   ====================== */
const CSV = {
  venues: "venues-export.csv",
  products: "products-export.csv",
  orders: "orders-export.csv",
  qrs: "qr_locations-export.csv",
};

const serviceAccountPath = path.resolve("src/tappealo-firebase-adminsdk-fbsvc-596d388708.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Falta secrets/serviceAccountKey.json");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
  ),
});

const db = admin.firestore();

/* ======================
   HELPERS
   ====================== */
const toBool = v => String(v).toLowerCase() === "true";
const toNum = v => (v === "" || v == null ? null : Number(v));
const toTS = v =>
  v ? admin.firestore.Timestamp.fromDate(new Date(v)) : null;

const parseItems = raw => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function mapOrderItems(rawItems) {
  const items = parseItems(rawItems);

  return items.map((it, index) => ({
    name: String(it.item || it.name || "").trim(),
    quantity: Number(it.cantidad ?? it.quantity ?? 0),
    description: it.descripcion
      ? String(it.descripcion).trim()
      : null,
    
  }));
}
async function importCollection({ file, collection, mapRow }) {
  if (!fs.existsSync(file)) {
    console.warn(`⚠️ No existe ${file}, se salta`);
    return;
  }

  const rows = parse(fs.readFileSync(file), {
    columns: true,
    skip_empty_lines: true,
    delimiter: ";",
    trim: true,
  });

  console.log(`\n📦 Importando ${collection}: ${rows.length} filas`);

  let batch = db.batch();
  let count = 0;

  for (const r of rows) {
    const ref = db.collection(collection).doc(String(r.id));

    batch.set(ref, mapRow(r), { merge: false });
    count++;

    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 450 !== 0) await batch.commit();
  console.log(`✅ ${collection} importado`);
}

/* ======================
   RUN
   ====================== */
(async () => {
  try {
    // /* -------- VENUES -------- */
    // await importCollection({
    //   file: CSV.venues,
    //   collection: "venues",
    //   mapRow: r => ({
    //     name: r.name,
    //     slug: r.slug, // subdominio
    //     auth_id: r.user_id,
    //     logo_url: r.logo_url || null,
    //     enabled: toBool(r.enabled),
    //     service_active: toBool(r.service_active),
    //     location_link: r.google_maps_url || null,
    //     social_link: null,
    //     adress_1: null,
    //     adress_2: null,
    //     phone: r.phone || null,
    //     created_at: toTS(r.created_at),
    //     updated_at: toTS(r.updated_at),
    //   }),
    // });

    // /* -------- QR LOCATIONS -------- */
    // await importCollection({
    //   file: CSV.qrs,
    //   collection: "qr_locations",
    //   mapRow: r => ({
    //     venue_id: r.venue_id,
    //     name: r.code,
    //     delivery_type: r.delivery_type,
    //     enabled: toBool(r.enabled),
    //     created_at: toTS(r.created_at)
    //   }),
    // });

    // /* -------- PRODUCTS -------- */
    // await importCollection({
    //   file: CSV.products,
    //   collection: "products",
    //   mapRow: r => ({
    //     venue_id: r.venue_id,
    //     name: r.name,
    //     description: r.description || null,
    //     price: toNum(r.price),
    //     quantity: toNum(r.quantity),
    //     category_id: r.category ? String(r.category) : null,
    //     enabled: toBool(r.enabled),
    //     image_url: r.image_url || null,
    //     created_at: toTS(r.created_at),
    //     updated_at: toTS(r.updated_at),
    //   }),
    // });

    /* -------- ORDERS -------- */
    await importCollection({
      file: CSV.orders,
      collection: "orders",
      mapRow: r => ({
        venue_id: r.venue_id,
        status: r.status,
        total: toNum(r.total),
        items: mapOrderItems(r.items),
        qr_location_id: r.lugar_entrega || null,
        phone: r.telefono || null,
        name: r.nombre || null,
        additional_comments: r.comentarios_generales || null,
        created_at: toTS(r.created_at),
        updated_at: toTS(r.updated_at),
        ref_order_id: null
      }),
    });

    console.log("\n🎉 Migración finalizada correctamente");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error en migración:", e);
    process.exit(1);
  }
})();