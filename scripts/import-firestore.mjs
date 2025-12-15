import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { parse } from "csv-parse/sync";

/**
 * CONFIG
 * - Poné tus CSV en la raíz del proyecto con estos nombres,
 *   o cambiá estas constantes.
 */
const PRODUCTS_CSV = "products-export.csv";
const ORDERS_CSV = "orders-export.csv";

/**
 * CREDENCIALES
 * Firebase Console → Project Settings → Service accounts → Generate new private key
 * Guardar en: secrets/serviceAccountKey.json
 */
const serviceAccountPath = path.resolve("secrets/serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Falta secrets/serviceAccountKey.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---------- Helpers ----------
const toBool = (v) => String(v).trim().toLowerCase() === "true";
const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toTimestamp = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
};

function parseItems(raw) {
  if (!raw) return [];
  const txt = String(raw).trim();
  if (!txt) return [];
  try {
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Si algún CSV viene con comillas raras, al menos no rompemos la importación
    return [];
  }
}

async function ensureVenueExists(venueId) {
  const ref = db.collection("venues").doc(String(venueId));
  const snap = await ref.get();
  return snap.exists;
}

// ---------- Import Products ----------
async function importProducts(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No existe ${csvPath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  delimiter: ";",
  relax_quotes: true,
  relax_column_count: true,
  trim: true,
});

  console.log(`\n🧾 Products rows: ${rows.length}`);

  let batch = db.batch();
  let opCount = 0;
  let imported = 0;
  let skipped = 0;

  for (const r of rows) {
    const docId = String(r.id).trim(); // ej "20"
    const venueId = String(r.venue_id).trim(); // UUID venue

    if (!docId || !venueId) {
      skipped++;
      continue;
    }

    // Validación suave: venue debe existir en Firestore
    // (como vos los cargás manualmente)
    const exists = await ensureVenueExists(venueId);
    if (!exists) {
      console.warn(`⚠️ Product ${docId}: venue ${venueId} no existe en Firestore → SKIP`);
      skipped++;
      continue;
    }

    const ref = db.collection("products").doc(docId);

    const updatedAt =
      toTimestamp(r.updated_at) ?? admin.firestore.FieldValue.serverTimestamp();

    batch.set(
      ref,
      {
        venueId,
        name: (r.name ?? "").toString().trim(),
        description: (r.description ?? "").toString().trim() || null,
        price: toNum(r.price) ?? 0,
        category: (r.category ?? "Sin categoría").toString().trim(),
        enabled: toBool(r.enabled),
        quantity: toNum(r.quantity) ?? 0,
        imageUrl: (r.image_url ?? "").toString().trim() || null,
        updatedAt,
      },
      { merge: true }
    );

    opCount++;
    imported++;

    // Límite batches Firestore: 500. Usamos 450 por margen.
    if (opCount >= 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
      console.log(`✅ Products importados: ${imported}/${rows.length}`);
    }
  }

  if (opCount > 0) await batch.commit();

  console.log(`✅ Products import finalizado. Importados=${imported} | Skipped=${skipped}`);
}

// ---------- Import Orders ----------
async function importOrders(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No existe ${csvPath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  delimiter: ";",
  relax_quotes: true,
  relax_column_count: true,
  trim: true,
});

  console.log(`\n🧾 Orders rows: ${rows.length}`);

  let batch = db.batch();
  let opCount = 0;
  let imported = 0;
  let skipped = 0;

  for (const r of rows) {
    const docId = String(r.id).trim(); // UUID
    const venueId = String(r.venue_id).trim();

    if (!docId || !venueId) {
      skipped++;
      continue;
    }

    const exists = await ensureVenueExists(venueId);
    if (!exists) {
      console.warn(`⚠️ Order ${docId}: venue ${venueId} no existe en Firestore → SKIP`);
      skipped++;
      continue;
    }

    const ref = db.collection("orders").doc(docId);

    const createdAt =
      toTimestamp(r.created_at) ?? admin.firestore.FieldValue.serverTimestamp();
    const updatedAt =
      toTimestamp(r.updated_at) ?? admin.firestore.FieldValue.serverTimestamp();

    batch.set(
      ref,
      {
        venueId,
        items: parseItems(r.items),
        comentariosGenerales:
          (r.comentarios_generales ?? "").toString().trim() || null,
        lugarEntrega: (r.lugar_entrega ?? "").toString().trim(),
        telefono: (r.telefono ?? "").toString().trim() || null,
        nombre: (r.nombre ?? "").toString().trim() || null,
        total: toNum(r.total) ?? 0,
        status: (r.status ?? "entrante").toString().trim(),
        createdAt,
        updatedAt,
      },
      { merge: true }
    );

    opCount++;
    imported++;

    if (opCount >= 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
      console.log(`✅ Orders importadas: ${imported}/${rows.length}`);
    }
  }

  if (opCount > 0) await batch.commit();

  console.log(`✅ Orders import finalizado. Importadas=${imported} | Skipped=${skipped}`);
}

// ---------- RUN ----------
(async () => {
  try {
    console.log("🚀 Iniciando import a Firestore…");

    await importProducts(PRODUCTS_CSV);
    await importOrders(ORDERS_CSV);

    console.log("\n🎉 Todo OK. Revisá Firestore: collections 'products' y 'orders'.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en import:", err);
    process.exit(1);
  }
})();