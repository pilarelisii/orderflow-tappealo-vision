import * as admin from "firebase-admin";

function pad(n: number, size: number) {
  return String(n).padStart(size, "0");
}

function datePrefixDDMMYY(d = new Date()) {
  const dd = pad(d.getDate(), 2);
  const mm = pad(d.getMonth() + 1, 2);
  const yy = pad(d.getFullYear() % 100, 2);
  return `${dd}${mm}${yy}`;
}

export async function getNextRefOrderId(db: FirebaseFirestore.Firestore, venueId: string) {
  const prefix = datePrefixDDMMYY(new Date());
  const counterRef = db.collection("order_counters").doc(`${venueId}_${prefix}`);

  const seq = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.data()?.seq ?? 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { venue_id: venueId, prefix, seq: next, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return `${prefix}-${pad(seq, 4)}`; // 221225-0001
}