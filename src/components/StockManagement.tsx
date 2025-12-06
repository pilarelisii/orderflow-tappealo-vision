import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
    
    // Optimistic update
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
      // Revert on error
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, enabled: currentEnabled } : p
      ));
      return;
    }

    toast.success(newEnabled ? 'Producto activado' : 'Producto desactivado');
  };

  const updateQuantity = async (id: number, quantity: number) => {
    const safeQuantity = Math.max(0, quantity);
    
    // Optimistic update
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
    <ScrollArea className="h-[calc(100vh-180px)]">
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
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {product.description || ''} - ${product.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Cant:</span>
                      <Input
                        type="number"
                        min={0}
                        value={product.quantity}
                        onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 text-center"
                        disabled={!product.enabled}
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
  );
}
