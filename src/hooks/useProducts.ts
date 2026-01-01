import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product } from "@/types/product";

const isIndexError = (err: any) =>
  err?.code === "failed-precondition" &&
  typeof err?.message === "string" &&
  err.message.toLowerCase().includes("requires an index");

export function useProducts() {
  const { venue } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const venueIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!venue?.id) {
      setProducts([]);
      setLoading(false);
      venueIdRef.current = null;
      return;
    }

    const venueChanged = venueIdRef.current !== venue.id;
    venueIdRef.current = venue.id;
    if (venueChanged) setLoading(true);

    const q = query(
      collection(db, "products"),
      where("venue_id", "==", venue.id)
      // ✅ sin orderBy (evita índices)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            venue_id: data.venue_id ?? venue.id,

            category_id: data.category_id ?? "SIN CATEGORIA",

            name: data.name ?? "",
            description: data.description ?? null,
            price: Number(data.price ?? 0),
            quantity: Number(data.quantity ?? 0),
            enabled: Boolean(data.enabled),
            image_url: data.image_url ?? null,
            featured: Boolean(data.featured ?? false),
            
            created_at: data.created_at,
            updated_at: data.updated_at,
          } as Product;
        });

        setProducts(list);
        setLoading(false);
      },
      async (err) => {
        console.error("useProducts onSnapshot error:", err);

        // fallback sin índice (por si después agregás orderBy)
        if (isIndexError(err)) {
          try {
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[];
            setProducts(list);
            setLoading(false);
            return;
          } catch (e) {
            console.error("fallback getDocs failed:", e);
          }
        }

        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  // ✅ orden local para UI
  const sortedProducts = useMemo(() => {
    const copy = [...products];
    copy.sort((a, b) => {
      const ca = (a.category_id || "").toLowerCase();
      const cb = (b.category_id || "").toLowerCase();
      if (ca < cb) return -1;
      if (ca > cb) return 1;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [products]);

  const toggleEnabled = async (productId: string, current: boolean) => {
    const next = !current;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, enabled: next } : p))
    );

    try {
      await updateDoc(doc(db, "products", productId), {
        enabled: next,
        updated_at: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, enabled: current } : p))
      );
      throw e;
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const safe = Math.max(0, Number(quantity) || 0);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: safe } : p))
    );

    await updateDoc(doc(db, "products", productId), {
      quantity: safe,
      updated_at: serverTimestamp(),
    });
  };

  const updateProduct = async (productId: string, patch: Partial<Product> & { imageFile?: File | null }) => {
    if (!venue?.id) throw new Error("No venue");

    let image_url = patch.image_url ?? undefined;

    if (patch.imageFile) {
      const path = `products/${venue.id}/${productId}-${Date.now()}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, patch.imageFile);
      image_url = await getDownloadURL(fileRef);
    }

    const payload: any = {
      updated_at: serverTimestamp(),
    };

    // ⚠️ solo setear campos si vienen (evita undefined)
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.price !== undefined) payload.price = Number(patch.price);
    if (patch.category_id !== undefined) payload.category_id = patch.category_id;
    if (patch.quantity !== undefined) payload.quantity = Number(patch.quantity);
    if (patch.enabled !== undefined) payload.enabled = !!patch.enabled;
    if (image_url !== undefined) payload.image_url = image_url ?? null;
    if (patch.featured !== undefined) payload.featured = !!patch.featured;

    await updateDoc(doc(db, "products", productId), payload);
  };

  const createProduct = async (data: {
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    quantity: number;
    imageFile?: File | null;
  }) => {
    if (!venue?.id) throw new Error("No venue");

    // 🔥 id incremental como string (si querés mantenerlo)
    const nextId = String(
      products.length > 0
        ? Math.max(...products.map((p) => Number(p.id)).filter((n) => Number.isFinite(n))) + 1
        : 1
    );

    let image_url: string | null = null;
    if (data.imageFile) {
      const path = `products/${venue.id}/${nextId}-${Date.now()}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, data.imageFile);
      image_url = await getDownloadURL(fileRef);
    }

    await setDoc(doc(db, "products", nextId), {
      venue_id: venue.id,
      category_id: data.category_id || "SIN CATEGORIA",
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: Number(data.price),
      quantity: Number(data.quantity || 0),
      enabled: true,
      featured: false,
      image_url,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  };

  const removeProduct = async (productId: string) => {
    await deleteDoc(doc(db, "products", productId));
  };

  return {
    products: sortedProducts,
    loading,
    toggleEnabled,
    updateQuantity,
    updateProduct,
    createProduct,
    removeProduct,
  };
}