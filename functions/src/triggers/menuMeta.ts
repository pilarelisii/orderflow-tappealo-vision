import * as admin from "firebase-admin";

export async function bumpMenuUpdatedAtByVenueId(venueId: string) {
  const db = admin.firestore();
  await db.collection("venues").doc(venueId).set(
    {
      menu_updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}