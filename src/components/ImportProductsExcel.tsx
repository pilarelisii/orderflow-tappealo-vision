import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/integrations/firebase/client";
import {
	addDoc,
	collection,
	getDocs,
	query,
	serverTimestamp,
	where,
} from "firebase/firestore";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

type ExcelRow = {
	nombre?: string;
	descripcion?: string;
	precio?: string | number;
	categoria?: string;
};

type Props = {
	venueId: string;
};

function normalizeText(value: string) {
	return value.trim();
}

function normalizeCategoryKey(value: string) {
	return value.trim().toLowerCase();
}

export function ImportProductsExcel({ venueId }: Props) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [loading, setLoading] = useState(false);

	const handleFile = async (file: File) => {
		setLoading(true);

		try {
			const buffer = await file.arrayBuffer();
			const workbook = XLSX.read(buffer, { type: "array" });
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];

			const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });

			if (!rows.length) {
				toast.error("El archivo está vacío");
				return;
			}

			// validar columnas mínimas
			const invalidRows = rows.filter(
				(row) =>
					!String(row.nombre || "").trim() ||
					!String(row.precio || "")
						.toString()
						.trim() ||
					!String(row.categoria || "").trim()
			);

			if (invalidRows.length > 0) {
				toast.error(
					"Hay filas inválidas. Nombre, precio y categoría son obligatorios."
				);
				return;
			}

			// traer categorías existentes del venue
			const categoriesSnap = await getDocs(
				query(collection(db, "categories"), where("venue_id", "==", venueId))
			);

			const categoryMap = new Map<string, { id: string; name: string }>();

			categoriesSnap.forEach((docSnap) => {
				const data = docSnap.data() as any;
				const name = String(data.name || "").trim();
				if (!name) return;

				categoryMap.set(normalizeCategoryKey(name), {
					id: docSnap.id,
					name,
				});
			});

			// crear categorías faltantes
			for (const row of rows) {
				const categoryName = normalizeText(String(row.categoria || ""));
				const categoryKey = normalizeCategoryKey(categoryName);

				if (!categoryMap.has(categoryKey)) {
					const newCategoryRef = await addDoc(collection(db, "categories"), {
						venue_id: venueId,
						name: categoryName,
						enabled: true,
						created_at: serverTimestamp(),
						updated_at: serverTimestamp(),
					});

					categoryMap.set(categoryKey, {
						id: newCategoryRef.id,
						name: categoryName,
					});
				}
			}

			// crear productos
			let createdCount = 0;

			for (const row of rows) {
				const nombre = normalizeText(String(row.nombre || ""));
				const descripcion = normalizeText(String(row.descripcion || ""));
				const precio = Number(row.precio || 0);
				const categoria = normalizeText(String(row.categoria || ""));
				const categoryKey = normalizeCategoryKey(categoria);
				const category = categoryMap.get(categoryKey);

				if (!category) continue;

				await addDoc(collection(db, "products"), {
					venue_id: venueId,
					category_id: category.id,
					name: nombre,
					description: descripcion || null,
					price: precio,
					enabled: true,
					quantity: 0,
					image_url: null,
					featured: false,
					created_at: serverTimestamp(),
					updated_at: serverTimestamp(),
				});

				createdCount++;
			}

			toast.success(`Se importaron ${createdCount} productos correctamente`);
		} catch (error) {
			console.error("Error importando Excel:", error);
			toast.error("Error al importar el archivo");
		} finally {
			setLoading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	return (
		<div className="border border-border rounded-lg p-4 bg-card mb-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h2 className="text-lg font-semibold text-foreground">
						Importar productos por Excel
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						El archivo debe contener las columnas: nombre, descripcion, precio,
						categoria.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<Input
						ref={inputRef}
						type="file"
						accept=".xlsx,.xls,.csv"
						className="max-w-xs"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) handleFile(file);
						}}
						disabled={loading}
					/>

					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
						disabled={loading}
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Upload className="h-4 w-4 mr-2" />
						)}
						Subir archivo
					</Button>
				</div>
			</div>
		</div>
	);
}
