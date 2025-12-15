import { useState, useEffect, useMemo } from "react";
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
import {
  Loader2,
  Pencil,
  Save,
  X,
  Upload,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
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

import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  enabled: boolean;
  quantity: number;
  imageUrl: string | null;
  venueId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface EditedProduct {
  name: string;
  description: string;
  price: number;
  imageFile: File | null;
  imagePreview: string | null;
}

interface NewProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  newCategory: string;
  quantity: number;
  imageFile: File | null;
  imagePreview: string | null;
}

const initialNewProduct: NewProduct = {
  name: "",
  description: "",
  price: 0,
  category: "",
  newCategory: "",
  quantity: 0,
  imageFile: null,
  imagePreview: null,
};

const isImage = (f: File) => f.type?.startsWith("image/");
const max5mb = (f: File) => f.size <= 5 * 1024 * 1024;

export function StockManagement() {
  const { venue } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<
    Record<number, EditedProduct>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>(initialNewProduct);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const sortedProducts = useMemo(() => {
    // Orden local (evita índices de Firestore)
    const copy = [...products];
    copy.sort((a, b) => {
      const ca = (a.category || "").toLowerCase();
      const cb = (b.category || "").toLowerCase();
      if (ca < cb) return -1;
      if (ca > cb) return 1;
      return a.id - b.id;
    });
    return copy;
  }, [products]);

  const categories = useMemo(() => {
    return [...new Set(sortedProducts.map((p) => p.category))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [sortedProducts]);

  const getProductsByCategory = (category: string) =>
    sortedProducts.filter(
      (p) => p.category?.toLowerCase() === category.toLowerCase()
    );

  /* =======================
     FETCH PRODUCTS (sin orderBy -> sin índices)
     ======================= */
  useEffect(() => {
    if (!venue?.id) {
      // si todavía no hay venue, dejamos loading
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "products"),
          where("venueId", "==", venue.id)
        );

        const snap = await getDocs(q);

        const list: Product[] = snap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: Number(d.id),
              name: data.name ?? "",
              description: data.description ?? null,
              price: Number(data.price ?? 0),
              category: data.category ?? "SIN CATEGORIA",
              enabled: Boolean(data.enabled),
              quantity: Number(data.quantity ?? 0),
              imageUrl: data.imageUrl ?? null,
              venueId: data.venueId ?? venue.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          })
          .filter((p) => !Number.isNaN(p.id));

        setProducts(list);
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar productos");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [venue?.id]);

  /* =======================
     SIMPLE UPDATES
     ======================= */
  const toggleProduct = async (id: number, enabled: boolean) => {
    const next = !enabled;
    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, enabled: next } : x))
    );

    try {
      await updateDoc(doc(db, "products", String(id)), {
        enabled: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar producto");
      // rollback
      setProducts((prev) =>
        prev.map((x) => (x.id === id ? { ...x, enabled } : x))
      );
    }
  };

  const updateQuantity = async (id: number, quantity: number) => {
    const safe = Math.max(0, quantity);
    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, quantity: safe } : x))
    );

    try {
      await updateDoc(doc(db, "products", String(id)), {
        quantity: safe,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar cantidad");
    }
  };

  /* =======================
     EDIT MODE
     ======================= */
  const enterEditMode = () => {
    const map: Record<number, EditedProduct> = {};
    sortedProducts.forEach((p) => {
      map[p.id] = {
        name: p.name,
        description: p.description || "",
        price: p.price,
        imageFile: null,
        imagePreview: p.imageUrl,
      };
    });
    setEditedProducts(map);
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditedProducts({});
    setIsEditMode(false);
  };

  const handleFieldChange = (
    id: number,
    field: keyof EditedProduct,
    value: any
  ) => {
    setEditedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleImageSelect = (id: number, file: File) => {
    if (!isImage(file)) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (!max5mb(file)) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setEditedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], imageFile: file, imagePreview: preview },
    }));
  };

  /* =======================
     SAVE CHANGES
     ======================= */
  const saveAllChanges = async () => {
    if (!venue?.id) return;

    // validar
    for (const p of sortedProducts) {
      const e = editedProducts[p.id];
      if (!e) continue;
      if (!e.name.trim()) {
        toast.error("El nombre no puede estar vacío");
        return;
      }
      if (e.name.length > 100) {
        toast.error("El nombre no puede tener más de 100 caracteres");
        return;
      }
      if ((e.description || "").length > 200) {
        toast.error("La descripción no puede tener más de 200 caracteres");
        return;
      }
      if (Number(e.price) <= 0) {
        toast.error("El precio debe ser mayor a 0");
        return;
      }
    }

    setIsSaving(true);
    try {
      // solo guardamos cambios reales
      for (const p of sortedProducts) {
        const e = editedProducts[p.id];
        if (!e) continue;

        const changed =
          e.name.trim() !== p.name ||
          (e.description.trim() || null) !== (p.description || null) ||
          Number(e.price) !== Number(p.price) ||
          Boolean(e.imageFile);

        if (!changed) continue;

        let imageUrl = p.imageUrl;

        if (e.imageFile) {
          const path = `products/${venue.id}/${p.id}-${Date.now()}`;
          const fileRef = ref(storage, path);
          await uploadBytes(fileRef, e.imageFile);
          imageUrl = await getDownloadURL(fileRef);
        }

        await updateDoc(doc(db, "products", String(p.id)), {
          name: e.name.trim(),
          description: e.description.trim() || null,
          price: Number(e.price),
          imageUrl,
          updatedAt: serverTimestamp(),
        });
      }

      // refetch rápido (para asegurar previews, etc.)
      const q = query(
        collection(db, "products"),
        where("venueId", "==", venue.id)
      );
      const snap = await getDocs(q);
      const list: Product[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: Number(d.id),
            name: data.name ?? "",
            description: data.description ?? null,
            price: Number(data.price ?? 0),
            category: data.category ?? "SIN CATEGORIA",
            enabled: Boolean(data.enabled),
            quantity: Number(data.quantity ?? 0),
            imageUrl: data.imageUrl ?? null,
            venueId: data.venueId ?? venue.id,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        })
        .filter((p) => !Number.isNaN(p.id));

      setProducts(list);
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

  /* =======================
     ADD PRODUCT
     ======================= */
  const handleNewProductImageSelect = (file: File) => {
    if (!isImage(file)) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (!max5mb(file)) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setNewProduct((prev) => ({ ...prev, imageFile: file, imagePreview: preview }));
  };

  const addProduct = async () => {
    if (!venue?.id) return;

    const category =
      newProduct.category === "__new__"
        ? newProduct.newCategory.trim()
        : newProduct.category;

    if (!newProduct.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (newProduct.name.length > 100) {
      toast.error("El nombre no puede tener más de 100 caracteres");
      return;
    }
    if (!category) {
      toast.error("La categoría es requerida");
      return;
    }
    if (Number(newProduct.price) <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }
    if ((newProduct.description || "").length > 200) {
      toast.error("La descripción no puede tener más de 200 caracteres");
      return;
    }

    setIsAddingProduct(true);
    try {
      const nextId =
        products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;

      let imageUrl: string | null = null;
      if (newProduct.imageFile) {
        const path = `products/${venue.id}/${nextId}-${Date.now()}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, newProduct.imageFile);
        imageUrl = await getDownloadURL(fileRef);
      }

      await setDoc(doc(db, "products", String(nextId)), {
        venueId: venue.id,
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || null,
        price: Number(newProduct.price),
        category: category.toUpperCase(),
        quantity: Number(newProduct.quantity || 0),
        enabled: true,
        imageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // actualizar estado local
      setProducts((prev) => [
        ...prev,
        {
          id: nextId,
          venueId: venue.id,
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || null,
          price: Number(newProduct.price),
          category: category.toUpperCase(),
          quantity: Number(newProduct.quantity || 0),
          enabled: true,
          imageUrl,
        },
      ]);

      toast.success("Producto agregado");
      setIsAddDialogOpen(false);
      setNewProduct(initialNewProduct);
    } catch (e) {
      console.error(e);
      toast.error("Error al agregar producto");
    } finally {
      setIsAddingProduct(false);
    }
  };

  /* =======================
     DELETE PRODUCT
     ======================= */
  const deleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteDoc(doc(db, "products", String(productToDelete.id)));
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      toast.success("Producto eliminado");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar producto");
    } finally {
      setProductToDelete(null);
    }
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
        <h3 className="text-lg font-semibold text-foreground">
          Stock de Productos
        </h3>

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
            </>
          )}
        </div>
      </div>

      <div className="pr-4">
        <Accordion type="multiple" defaultValue={categories} className="w-full">
          {categories.map((category) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-base font-semibold px-1">
                {category} ({getProductsByCategory(category).length})
              </AccordionTrigger>

              <AccordionContent>
                <div className="space-y-3">
                  {getProductsByCategory(category).map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border border-border bg-card transition-opacity ${
                        !product.enabled ? "opacity-50" : ""
                      }`}
                    >
                      <Switch
                        checked={product.enabled}
                        onCheckedChange={() =>
                          toggleProduct(product.id, product.enabled)
                        }
                        disabled={isEditMode}
                      />

                      {/* Imagen */}
                      <div className="flex-shrink-0">
                        {isEditMode ? (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageSelect(product.id, file);
                              }}
                            />
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors">
                              {editedProducts[product.id]?.imagePreview ? (
                                <img
                                  src={editedProducts[product.id].imagePreview!}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </label>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
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
                              value={editedProducts[product.id]?.name || ""}
                              onChange={(e) =>
                                handleFieldChange(
                                  product.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="Nombre del producto"
                              className="h-8 text-sm font-medium"
                              maxLength={100}
                            />

                            <div className="flex gap-2">
                              <Input
                                value={
                                  editedProducts[product.id]?.description || ""
                                }
                                onChange={(e) =>
                                  handleFieldChange(
                                    product.id,
                                    "description",
                                    e.target.value
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
                                  value={editedProducts[product.id]?.price || 0}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      product.id,
                                      "price",
                                      Number(e.target.value) || 0
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
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {product.description || ""} - ${product.price}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Cant:
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={product.quantity}
                          onChange={(e) =>
                            updateQuantity(product.id, Number(e.target.value))
                          }
                          className="w-20 h-8 text-center"
                          disabled={!product.enabled || isEditMode}
                        />
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
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ADD PRODUCT DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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

              <div className="space-y-2">
                <Label htmlFor="new-quantity">Cantidad inicial</Label>
                <Input
                  id="new-quantity"
                  type="number"
                  value={newProduct.quantity}
                  onChange={(e) =>
                    setNewProduct((p) => ({
                      ...p,
                      quantity: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría *</Label>
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
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Nueva categoría</SelectItem>
                </SelectContent>
              </Select>

              {newProduct.category === "__new__" && (
                <Input
                  value={newProduct.newCategory}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, newCategory: e.target.value }))
                  }
                  placeholder="Nombre de la nueva categoría"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Imagen</Label>
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleNewProductImageSelect(file);
                  }}
                />
                <div className="w-full h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors">
                  {newProduct.imagePreview ? (
                    <img
                      src={newProduct.imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Click para subir imagen
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setNewProduct(initialNewProduct);
                  setIsAddDialogOpen(false);
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

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{productToDelete?.name}".
              No se puede deshacer.
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
    </div>
  );
}