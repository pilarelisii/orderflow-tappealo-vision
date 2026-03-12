import { useMemo, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Save, X, ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories } from "@/hooks/useCategories";
import { CategoriesModal } from "@/components/CategoriesModal";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/product";
import { FeaturedProductsModal } from "@/components/FeaturedProductsModal";
import { ImageUploadBox } from "./ImageUploadBox";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

interface EditedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  image_path: string | null;
  imagePreview: string | null;
}

interface NewProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  quantity: number;
  image_url: string | null;
  image_path: string | null;
  imagePreview: string | null;
}

const initialNewProduct: NewProduct = {
  name: "",
  description: "",
  price: 0,
  category: "",
  quantity: 0,
  image_url: null,
  image_path: null,
  imagePreview: null,
};

export function StockManagement() {
  const { venue } = useAuth();

  const {
    products,
    loading,
    toggleEnabled,
    updateQuantity,
    updateProduct,
    createProduct,
    removeProduct,
  } = useProducts();

  const { enabledCategories, getNameById } = useCategories();

  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<string, EditedProduct>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>(initialNewProduct);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // ✅ entityId estable para el upload mientras el modal está abierto
  const newProductEntityIdRef = useRef<string>(makeId());

  const categories = useMemo(() => {
    const ids = new Set<string>();
    products.forEach((p) => ids.add(p.category_id || "SIN CATEGORIA"));
    const list = Array.from(ids);
    list.sort((a, b) => getNameById(a).localeCompare(getNameById(b)));
    return list;
  }, [products, getNameById]);

  const getProductsByCategory = (categoryKey: string) =>
    products.filter((p) => (p.category_id || "SIN CATEGORIA") === categoryKey);

  const enterEditMode = () => {
    const map: Record<string, EditedProduct> = {};
    products.forEach((p) => {
      map[p.id] = {
        name: p.name ?? "",
        description: p.description || "",
        price: Number(p.price ?? 0),
        image_url: p.image_url ?? null,
        image_path: (p as any).image_path ?? null,
        imagePreview: p.image_url ?? null,
      };
    });
    setEditedProducts(map);
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditedProducts({});
    setIsEditMode(false);
  };

  const handleFieldChange = (id: string, field: keyof EditedProduct, value: any) => {
    setEditedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveAllChanges = async () => {
    if (!venue?.id) return;

    for (const p of products) {
      const e = editedProducts[p.id];
      if (!e) continue;

      if (!e.name.trim()) return toast.error("El nombre no puede estar vacío");
      if (e.name.length > 100) return toast.error("El nombre no puede tener más de 100 caracteres");
      if ((e.description || "").length > 200) return toast.error("La descripción no puede tener más de 200 caracteres");
      if (Number(e.price) <= 0) return toast.error("El precio debe ser mayor a 0");
    }

    setIsSaving(true);
    try {
      for (const p of products) {
        const e = editedProducts[p.id];
        if (!e) continue;

        const changed =
          e.name.trim() !== (p.name ?? "") ||
          (e.description.trim() || null) !== (p.description || null) ||
          Number(e.price) !== Number(p.price) ||
          (e.image_url ?? null) !== (p.image_url ?? null) ||
          (e.image_path ?? null) !== ((p as any).image_path ?? null);

        if (!changed) continue;

        await updateProduct(p.id, {
          name: e.name.trim(),
          description: e.description.trim() || null,
          price: Number(e.price),
          image_url: e.image_url,
          image_path: e.image_path,
        } as any);
      }

      toast.success("Productos actualizados");
      setIsEditMode(false);
      setEditedProducts({});
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const addProduct = async () => {
    if (!venue?.id) return;

    const categoryId = newProduct.category === "__none__" ? null : newProduct.category;

    if (!newProduct.name.trim()) return toast.error("El nombre es requerido");
    if (newProduct.name.length > 100) return toast.error("El nombre no puede tener más de 100 caracteres");
    if (Number(newProduct.price) <= 0) return toast.error("El precio debe ser mayor a 0");
    if ((newProduct.description || "").length > 200) return toast.error("La descripción no puede tener más de 200 caracteres");

    setIsAddingProduct(true);
    try {
      await createProduct({
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || null,
        price: Number(newProduct.price),
        quantity: Number(newProduct.quantity || 0),
        image_url: newProduct.image_url,
        image_path: newProduct.image_path,
        category_id: categoryId,
      } as any);

      toast.success("Producto agregado");

      setIsAddDialogOpen(false);
      setNewProduct(initialNewProduct);

      // ✅ nuevo entityId para el próximo producto
      newProductEntityIdRef.current = makeId();
    } catch (e) {
      console.error(e);
      toast.error("Error al agregar producto");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await removeProduct(productToDelete.id);
      toast.success("Producto eliminado");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar producto");
    } finally {
      setProductToDelete(null);
    }
  };

  const onToggleProduct = async (product: Product) => {
    try {
      await toggleEnabled(product.id, product.enabled);
    } catch {}
  };

  const onUpdateQty = async (productId: string, quantity: number) => {
    try {
      await updateQuantity(productId, quantity);
    } catch {}
  };

  if (!venue?.id) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Cargando venue...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between pb-4 border-b border-border mb-4">
				<h3 className="text-lg font-semibold text-foreground">Productos</h3>

				<div className="flex items-center gap-2">
					{isEditMode ? (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={cancelEdit}
								disabled={isSaving}
							>
								<X className="h-4 w-4 mr-1" />
								Cancelar
							</Button>
							<Button size="sm" onClick={saveAllChanges} disabled={isSaving}>
								{isSaving ? (
									<Loader2 className="h-4 w-4 mr-1 animate-spin" />
								) : (
									<Save className="h-4 w-4 mr-1" />
								)}
								Guardar
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" size="sm" onClick={enterEditMode}>
								<Pencil className="h-4 w-4 mr-1" />
								Editar
							</Button>
							<Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
								<Plus className="h-4 w-4 mr-1" />
								Agregar
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCategoriesOpen(true)}
							>
								Gestionar categorías
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setFeaturedOpen(true)}
							>
								Productos destacados
							</Button>
						</>
					)}
				</div>
			</div>

			<div className="pr-4">
				<Accordion type="multiple" defaultValue={categories} className="w-full">
					{categories.map((category) => (
						<AccordionItem key={category} value={category}>
							<AccordionTrigger className="text-base font-semibold px-1">
								{getNameById(category)} (
								{getProductsByCategory(category).length})
							</AccordionTrigger>

							<AccordionContent>
								<div className="space-y-3">
									{getProductsByCategory(category).map((product) => {
										const e = editedProducts[product.id];

										return (
											<div
												key={product.id}
												className={`flex items-center gap-4 p-3 rounded-lg border border-border bg-card transition-opacity ${
													!product.enabled ? "opacity-50" : ""
												}`}
											>
												<Switch
													checked={product.enabled}
													onCheckedChange={() => onToggleProduct(product)}
													disabled={isEditMode}
												/>

												{/* Imagen */}
												<div className="flex-shrink-0 w-auto">
													{isEditMode ? (
														<div className="flex-shrink-0 w-[120px]">
															<ImageUploadBox
																label=" "
																venueId={venue.id}
																type="product"
																entityId={product.id}
																initialImage={
																	e?.imagePreview ?? product.image_url ?? null
																}
																previousPath={
																	e?.image_path ??
																	(product as any).image_path ??
																	null
																}
																onUploaded={({ url, path }) => {
																	setEditedProducts((prev) => ({
																		...prev,
																		[product.id]: {
																			...prev[product.id],
																			image_url: url,
																			image_path: path,
																			imagePreview: url,
																		},
																	}));
																}}
															/>
														</div>
													) : (
														<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
															{product.image_url ? (
																<img
																	src={product.image_url}
																	alt={product.name ?? ""}
																	className="w-full h-full object-cover"
																/>
															) : (
																<ImageIcon className="h-5 w-5 text-muted-foreground" />
															)}
														</div>
													)}
												</div>

												<div className="flex-1 min-w-0">
													{isEditMode ? (
														<div className="space-y-2">
															<Input
																value={e?.name || ""}
																onChange={(ev) =>
																	handleFieldChange(
																		product.id,
																		"name",
																		ev.target.value
																	)
																}
																placeholder="Nombre del producto"
																className="h-8 text-sm font-medium"
																maxLength={100}
															/>

															<div className="flex gap-2">
																<Input
																	value={e?.description || ""}
																	onChange={(ev) =>
																		handleFieldChange(
																			product.id,
																			"description",
																			ev.target.value
																		)
																	}
																	placeholder="Descripción (opcional)"
																	className="h-8 text-sm flex-1"
																	maxLength={200}
																/>

																<div className="flex items-center gap-1">
																	<span className="text-sm text-muted-foreground">
																		$
																	</span>
																	<Input
																		type="number"
																		value={e?.price ?? 0}
																		onChange={(ev) =>
																			handleFieldChange(
																				product.id,
																				"price",
																				Number(ev.target.value) || 0
																			)
																		}
																		className="h-8 w-24 text-sm"
																		min={0}
																		step={1}
																	/>
																</div>
															</div>
														</div>
													) : (
														<>
															<p className="font-medium text-foreground truncate">
																{product.name ?? ""}
															</p>
															<p className="text-sm text-muted-foreground truncate">
																{product.description ?? ""} - ${product.price}
															</p>
														</>
													)}
												</div>

												{isEditMode && (
													<Button
														variant="ghost"
														size="icon"
														className="text-destructive hover:text-destructive hover:bg-destructive/10"
														onClick={() => setProductToDelete(product)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												)}
											</div>
										);
									})}
								</div>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>

			{/* ADD PRODUCT DIALOG */}
			<Dialog
				open={isAddDialogOpen}
				onOpenChange={(open) => {
					setIsAddDialogOpen(open);
					if (!open) {
						setNewProduct(initialNewProduct);
						newProductEntityIdRef.current = makeId();
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Agregar Producto</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 pt-4">
						<div className="space-y-2">
							<Label htmlFor="new-name">Nombre *</Label>
							<Input
								id="new-name"
								value={newProduct.name}
								onChange={(e) =>
									setNewProduct((p) => ({ ...p, name: e.target.value }))
								}
								placeholder="Nombre del producto"
								maxLength={100}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="new-description">Descripción</Label>
							<Input
								id="new-description"
								value={newProduct.description}
								onChange={(e) =>
									setNewProduct((p) => ({ ...p, description: e.target.value }))
								}
								placeholder="Descripción (opcional)"
								maxLength={200}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="new-price">Precio *</Label>
								<Input
									id="new-price"
									type="number"
									value={newProduct.price || ""}
									onChange={(e) =>
										setNewProduct((p) => ({
											...p,
											price: Number(e.target.value) || 0,
										}))
									}
									placeholder="0"
									min={0}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Categoría *</Label>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCategoriesOpen(true)}
								>
									Gestionar categorías
								</Button>
							</div>

							<Select
								value={newProduct.category}
								onValueChange={(value) =>
									setNewProduct((p) => ({ ...p, category: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar categoría" />
								</SelectTrigger>
								<SelectContent>
									{enabledCategories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<ImageUploadBox
							label="Imagen"
							venueId={venue.id}
							type="product"
							entityId={newProductEntityIdRef.current}
							initialImage={newProduct.image_url}
							previousPath={newProduct.image_path}
							onUploaded={({ url, path }) => {
								setNewProduct((prev) => ({
									...prev,
									image_url: url,
									image_path: path,
									imagePreview: url,
								}));
							}}
						/>

						<div className="flex justify-end gap-2 pt-4">
							<Button
								variant="outline"
								onClick={() => {
									setNewProduct(initialNewProduct);
									setIsAddDialogOpen(false);
									newProductEntityIdRef.current = makeId();
								}}
								disabled={isAddingProduct}
							>
								Cancelar
							</Button>

							<Button onClick={addProduct} disabled={isAddingProduct}>
								{isAddingProduct ? (
									<Loader2 className="h-4 w-4 mr-1 animate-spin" />
								) : (
									<Plus className="h-4 w-4 mr-1" />
								)}
								Agregar
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<CategoriesModal open={categoriesOpen} onOpenChange={setCategoriesOpen} />

			{/* DELETE CONFIRM */}
			<AlertDialog
				open={!!productToDelete}
				onOpenChange={(open) => !open && setProductToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción eliminará permanentemente "
							{productToDelete?.name ?? ""}". No se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={deleteProduct}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<FeaturedProductsModal
				open={featuredOpen}
				onOpenChange={setFeaturedOpen}
			/>
		</div>
	);
}