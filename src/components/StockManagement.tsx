import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  enabled: boolean;
  quantity: number;
}

interface EditedProduct {
  name: string;
  description: string;
  price: number;
}

const categories = ["blacks", "frios", "whites", "dulces", "salados", "otras", "bebidas"];

const categoryLabels: Record<string, string> = {
  blacks: "Blacks",
  frios: "Fríos",
  whites: "Whites",
  dulces: "Dulces",
  salados: "Salados",
  otras: "Otras",
  bebidas: "Bebidas",
};

export function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProducts, setEditedProducts] = useState<Record<number, EditedProduct>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
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
      };
    });
    setEditedProducts(initialEdits);
    setIsEditMode(true);
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
        edited.price !== product.price
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
        const { error } = await supabase
          .from('products')
          .update({
            name: edited.name.trim(),
            description: edited.description.trim() || null,
            price: edited.price,
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

  const getProductsByCategory = (category: string) => {
    return products.filter((p) => p.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[70vh]">
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
            <Button
              variant="outline"
              size="sm"
              onClick={enterEditMode}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <Accordion type="multiple" defaultValue={categories} className="w-full">
          {categories.map((category) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-base font-semibold px-1">
                {categoryLabels[category]} ({getProductsByCategory(category).length})
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
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
