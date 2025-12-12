import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Save, X, Upload, ImageIcon, Plus, Trash2 } from "lucide-react";
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

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  enabled: boolean;
  quantity: number;
  image_url: string | null;
  venue_id: string;
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
  name: '',
  description: '',
  price: 0,
  category: '',
  newCategory: '',
  quantity: 0,
  imageFile: null,
  imagePreview: null,
};

export function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<number, EditedProduct>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>(initialNewProduct);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      setLoading(false);
      return;
    }

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (venueError || !venue) {
      console.error('Error fetching venue:', venueError);
      toast.error('Error al cargar venue');
      setLoading(false);
      return;
    }

    setVenueId(venue.id);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('venue_id', venue.id)
      .order('category')
      .order('id');

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  const toggleProduct = async (id: number, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: newEnabled } : p
    ));

    const { error } = await supabase
      .from('products')
      .update({ enabled: newEnabled })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar producto');
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, enabled: currentEnabled } : p
      ));
      return;
    }

    toast.success(newEnabled ? 'Producto activado' : 'Producto desactivado');
  };

  const updateQuantity = async (id: number, quantity: number) => {
    const safeQuantity = Math.max(0, quantity);
    
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, quantity: safeQuantity } : p
    ));

    const { error } = await supabase
      .from('products')
      .update({ quantity: safeQuantity })
      .eq('id', id);

    if (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error al actualizar cantidad');
    }
  };

  const enterEditMode = () => {
    const initialEdits: Record<number, EditedProduct> = {};
    products.forEach(product => {
      initialEdits[product.id] = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        imageFile: null,
        imagePreview: product.image_url,
      };
    });
    setEditedProducts(initialEdits);
    setIsEditMode(true);
  };

  const handleImageSelect = (productId: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        imageFile: file,
        imagePreview: previewUrl,
      },
    }));
  };

  const cancelEdit = () => {
    setEditedProducts({});
    setIsEditMode(false);
  };

  const handleFieldChange = (id: number, field: keyof EditedProduct, value: string | number) => {
    setEditedProducts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const saveAllChanges = async () => {
    const changedProducts = products.filter(product => {
      const edited = editedProducts[product.id];
      if (!edited) return false;
      return (
        edited.name !== product.name ||
        edited.description !== (product.description || '') ||
        edited.price !== product.price ||
        edited.imageFile !== null
      );
    });

    if (changedProducts.length === 0) {
      toast.info('No hay cambios para guardar');
      setIsEditMode(false);
      return;
    }

    // Validate all changes
    for (const product of changedProducts) {
      const edited = editedProducts[product.id];
      if (!edited.name.trim()) {
        toast.error(`El nombre del producto no puede estar vacío`);
        return;
      }
      if (edited.name.length > 100) {
        toast.error(`El nombre no puede tener más de 100 caracteres`);
        return;
      }
      if (edited.description.length > 200) {
        toast.error(`La descripción no puede tener más de 200 caracteres`);
        return;
      }
      if (edited.price <= 0) {
        toast.error(`El precio debe ser mayor a 0`);
        return;
      }
    }

    setIsSaving(true);

    try {
      for (const product of changedProducts) {
        const edited = editedProducts[product.id];
        let imageUrl = product.image_url;

        // Upload image if there's a new one
        if (edited.imageFile) {
          const fileExt = edited.imageFile.name.split('.').pop();
          const fileName = `${product.venue_id}/${product.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, edited.imageFile, { upsert: true });

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            toast.error('Error al subir imagen');
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          
          imageUrl = urlData.publicUrl;
        }

        const { error } = await supabase
          .from('products')
          .update({
            name: edited.name.trim(),
            description: edited.description.trim() || null,
            price: edited.price,
            image_url: imageUrl,
          })
          .eq('id', product.id);

        if (error) throw error;
      }

      // Update local state
      setProducts(prev => prev.map(p => {
        const edited = editedProducts[p.id];
        if (edited && changedProducts.find(cp => cp.id === p.id)) {
          return {
            ...p,
            name: edited.name.trim(),
            description: edited.description.trim() || null,
            price: edited.price,
            image_url: edited.imagePreview || p.image_url,
          };
        }
        return p;
      }));

      toast.success(`${changedProducts.length} producto(s) actualizado(s)`);
      setIsEditMode(false);
      setEditedProducts({});
    } catch (error) {
      console.error('Error saving products:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewProductImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setNewProduct(prev => ({ ...prev, imageFile: file, imagePreview: previewUrl }));
  };

  const addProduct = async () => {
    const categoryToUse = newProduct.category === '__new__' ? newProduct.newCategory.trim() : newProduct.category;
    
    if (!newProduct.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (newProduct.name.length > 100) {
      toast.error('El nombre no puede tener más de 100 caracteres');
      return;
    }
    if (!categoryToUse) {
      toast.error('La categoría es requerida');
      return;
    }
    if (newProduct.price <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }
    if (!venueId) {
      toast.error('Error: venue no encontrado');
      return;
    }

    setIsAddingProduct(true);

    try {
      // Get max ID for this venue to generate new ID
      const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
      const newId = maxId + 1;

      let imageUrl: string | null = null;

      if (newProduct.imageFile) {
        const fileExt = newProduct.imageFile.name.split('.').pop();
        const fileName = `${venueId}/${newId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, newProduct.imageFile, { upsert: true });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Error al subir imagen');
          setIsAddingProduct(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          id: newId,
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || null,
          price: newProduct.price,
          category: categoryToUse.toUpperCase(),
          quantity: newProduct.quantity,
          enabled: true,
          venue_id: venueId,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data].sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id));
      setNewProduct(initialNewProduct);
      setIsAddDialogOpen(false);
      toast.success('Producto agregado');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Error al agregar producto');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success('Producto eliminado');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    } finally {
      setProductToDelete(null);
    }
  };

  const getProductsByCategory = (category: string) => {
    return products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  };

  const categories = [...new Set(products.map(p => p.category))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header with edit controls */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <h3 className="text-lg font-semibold text-foreground">Stock de Productos</h3>
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
              <Button
                size="sm"
                onClick={saveAllChanges}
                disabled={isSaving}
              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={enterEditMode}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
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
                        onCheckedChange={() => toggleProduct(product.id, product.enabled)}
                        disabled={isEditMode}
                      />
                      
                      {/* Product image */}
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
                            {product.image_url ? (
                              <img
                                src={product.image_url}
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
                              value={editedProducts[product.id]?.name || ''}
                              onChange={(e) => handleFieldChange(product.id, 'name', e.target.value)}
                              placeholder="Nombre del producto"
                              className="h-8 text-sm font-medium"
                              maxLength={100}
                            />
                            <div className="flex gap-2">
                              <Input
                                value={editedProducts[product.id]?.description || ''}
                                onChange={(e) => handleFieldChange(product.id, 'description', e.target.value)}
                                placeholder="Descripción (opcional)"
                                className="h-8 text-sm flex-1"
                                maxLength={200}
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  value={editedProducts[product.id]?.price || 0}
                                  onChange={(e) => handleFieldChange(product.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="h-8 w-24 text-sm"
                                  min={0}
                                  step={1}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {product.description || ''} - ${product.price}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Cant:</span>
                        <Input
                          type="number"
                          min={0}
                          value={product.quantity}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
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

      {/* Add Product Dialog */}
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
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del producto"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Descripción</Label>
              <Input
                id="new-description"
                value={newProduct.description}
                onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
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
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
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
                  onChange={(e) => setNewProduct(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select
                value={newProduct.category}
                onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Nueva categoría</SelectItem>
                </SelectContent>
              </Select>
              {newProduct.category === '__new__' && (
                <Input
                  value={newProduct.newCategory}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, newCategory: e.target.value }))}
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
                      <p className="text-sm text-muted-foreground mt-2">Click para subir imagen</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{productToDelete?.name}". Esta acción no se puede deshacer.
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
