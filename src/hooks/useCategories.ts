// src/hooks/useCategories.ts
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/firebase/client";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export interface Category {
  id: string;
  venue_id: string;
  name: string;
  enabled: boolean;
  created_at?: any;
  updated_at?: any;
}

export function useCategories() {
  const { venue } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // LISTEN CATEGORIES (LIVE)
  // =========================
  useEffect(() => {
    if (!venue?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "categories"),
      where("venue_id", "==", venue.id)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Category[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            venue_id: data.venue_id ?? venue.id,
            name: (data.name ?? "").toString(),
            enabled: Boolean(data.enabled),
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        });

        setCategories(list);
        setLoading(false);
      },
      (err) => {
        console.error("useCategories onSnapshot error:", err);
        toast.error("Error al cargar categorías");
        setCategories([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [venue?.id]);

  // =========================
  // DERIVED: enabled + sorted
  // =========================
  const enabledCategories = useMemo(() => {
    const copy = [...categories].filter((c) => c.enabled);
    copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [categories]);

  // =========================
  // CRUD
  // =========================
  const createCategory = async (name: string) => {
    if (!venue?.id) return;

    const clean = (name ?? "").trim();
    if (!clean) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    // opcional: evitar duplicados por nombre (case-insensitive)
    const exists = categories.some(
      (c) => c.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      toast.error("Ya existe una categoría con ese nombre");
      return;
    }

    await addDoc(collection(db, "categories"), {
      venue_id: venue.id,
      name: clean,
      enabled: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // No hace falta setCategories acá: onSnapshot refresca solo
  };

  const renameCategory = async (categoryId: string, name: string) => {
    if (!venue?.id) return;

    const clean = (name ?? "").trim();
    if (!clean) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    // opcional: evitar duplicados por nombre (case-insensitive)
    const exists = categories.some(
      (c) =>
        c.id !== categoryId &&
        c.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      toast.error("Ya existe una categoría con ese nombre");
      return;
    }

    await updateDoc(doc(db, "categories", categoryId), {
      name: clean,
      updated_at: serverTimestamp(),
    });
  };

  const setCategoryEnabled = async (categoryId: string, enabled: boolean) => {
    await updateDoc(doc(db, "categories", categoryId), {
      enabled: Boolean(enabled),
      updated_at: serverTimestamp(),
    });
  };

  const getNameById = (id: string) => {
    if (!id || id === "SIN CATEGORIA") return "SIN CATEGORIA";
    const c = categories.find((x) => x.id === id);
    return c?.name ?? "SIN CATEGORIA";
  };

  const deleteCategory = async (categoryId: string) => {
    await deleteDoc(doc(db, "categories", categoryId));
  };

  return {
    categories,          // todas (incluye enabled=false)
    enabledCategories,   // solo enabled=true y ordenadas
    loading,

    getNameById,
    createCategory,
    renameCategory,
    setCategoryEnabled,
    deleteCategory,
  };
}