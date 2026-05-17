
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
	writeBatch,
} from "firebase/firestore";

export interface Category {
	id: string;
	venue_id: string;
	name: string;
	enabled: boolean;
	order: number;
	created_at?: any;
	updated_at?: any;
}

export function useCategories() {
	const { venue } = useAuth();

	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

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
						order: Number(data.order ?? 9999),
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

	const sortCategories = (list: Category[]) => {
		return [...list].sort((a, b) => {
			const orderA = Number(a.order ?? 9999);
			const orderB = Number(b.order ?? 9999);

			if (orderA !== orderB) return orderA - orderB;

			return a.name.localeCompare(b.name);
		});
	};

	const orderedCategories = useMemo(() => {
		return sortCategories(categories);
	}, [categories]);

	const enabledCategories = useMemo(() => {
		return sortCategories(categories.filter((c) => c.enabled));
	}, [categories]);

	const createCategory = async (name: string) => {
		if (!venue?.id) return;

		const clean = (name ?? "").trim();

		if (!clean) {
			toast.error("El nombre de la categoría es requerido");
			return;
		}

		const exists = categories.some(
			(c) => c.name.trim().toLowerCase() === clean.toLowerCase()
		);

		if (exists) {
			toast.error("Ya existe una categoría con ese nombre");
			return;
		}

		const nextOrder =
			categories.length > 0
				? Math.max(...categories.map((c) => Number(c.order ?? 0))) + 1
				: 1;

		await addDoc(collection(db, "categories"), {
			venue_id: venue.id,
			name: clean,
			enabled: true,
			order: nextOrder,
			created_at: serverTimestamp(),
			updated_at: serverTimestamp(),
		});
	};

	const renameCategory = async (categoryId: string, name: string) => {
		if (!venue?.id) return;

		const clean = (name ?? "").trim();

		if (!clean) {
			toast.error("El nombre de la categoría es requerido");
			return;
		}

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

	const reorderCategories = async (orderedIds: string[]) => {
		const batch = writeBatch(db);

		orderedIds.forEach((categoryId, index) => {
			const ref = doc(db, "categories", categoryId);

			batch.update(ref, {
				order: index + 1,
				updated_at: serverTimestamp(),
			});
		});

		await batch.commit();
	};

	const moveCategory = async (
		categoryId: string,
		direction: "up" | "down"
	) => {
		const sorted = sortCategories(categories);
		const currentIndex = sorted.findIndex((c) => c.id === categoryId);

		if (currentIndex === -1) return;

		const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= sorted.length) return;

		const newList = [...sorted];
		const current = newList[currentIndex];

		newList[currentIndex] = newList[targetIndex];
		newList[targetIndex] = current;

		await reorderCategories(newList.map((c) => c.id));
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
		categories: orderedCategories,
		enabledCategories,
		loading,

		getNameById,
		createCategory,
		renameCategory,
		setCategoryEnabled,
		deleteCategory,
		reorderCategories,
		moveCategory,
	};
}