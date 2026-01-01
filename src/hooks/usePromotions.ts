import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Promotion, PromotionItem } from "@/types/promotion";

const toIso = (v: any) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return new Date().toISOString();
};

export function usePromotions() {
  const { venue } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue?.id) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(collection(db, "promotions"), where("venue_id", "==", venue.id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            venue_id: data.venue_id ?? venue.id,
            name: data.name ?? null,
            image_url: data.image_url ?? null,
            price: Number(data.price ?? 0),
            discount: Number(data.discount ?? 0),
            start_date: data.start_date,
            end_date: data.end_date,
            enabled: Boolean(data.enabled),
            items: (data.items ?? []) as PromotionItem[],
            created_at: toIso(data.created_at),
            updated_at: toIso(data.updated_at),
          } as Promotion;
        });

        setPromotions(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  const createPromotion = async (payload: {
    name: string | null;
    price: number;
    discount: number;
    enabled: boolean;
    start_date: Timestamp;
    end_date: Timestamp;
    items: PromotionItem[];
    imageFile?: File | null;
  }) => {
    if (!venue?.id) throw new Error("No venue");

    let image_url: string | null = null;

    if (payload.imageFile) {
      const path = `promotions/${venue.id}/${Date.now()}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, payload.imageFile);
      image_url = await getDownloadURL(fileRef);
    }

    await addDoc(collection(db, "promotions"), {
      venue_id: venue.id,
      name: payload.name,
      price: payload.price,
      discount: payload.discount,
      start_date: payload.start_date,
      end_date: payload.end_date,
      enabled: payload.enabled,
      items: payload.items,
      image_url,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const updatePromotion = async (
    id: string,
    payload: Partial<{
      name: string | null;
      price: number;
      discount: number;
      enabled: boolean;
      start_date: Timestamp;
      end_date: Timestamp;
      items: PromotionItem[];
      imageFile: File | null;
    }>
  ) => {
    if (!venue?.id) throw new Error("No venue");

    const patch: any = { ...payload, updated_at: serverTimestamp() };

    if (payload.imageFile) {
      const path = `promotions/${venue.id}/${id}-${Date.now()}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, payload.imageFile);
      patch.image_url = await getDownloadURL(fileRef);
      delete patch.imageFile;
    }

    await updateDoc(doc(db, "promotions", id), patch);
  };

  const removePromotion = async (id: string) => {
    await deleteDoc(doc(db, "promotions", id));
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await updateDoc(doc(db, "promotions", id), {
      enabled: !enabled,
      updated_at: serverTimestamp(),
    });
  };

  return {
    promotions,
    loading,
    createPromotion,
    updatePromotion,
    removePromotion,
    toggleEnabled,
  };
}