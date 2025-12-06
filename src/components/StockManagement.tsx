import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface ProductState {
  enabled: boolean;
  quantity: number;
}

const initialProducts: Product[] = [
  { id: 10, name: "Espresso Doble", description: "2 shots", price: 170, category: "BLACKS" },
  { id: 11, name: "Americano", description: "2 shots + agua", price: 170, category: "BLACKS" },
  { id: 12, name: "Filtrado 1 taza", description: "Café de filtro", price: 200, category: "BLACKS" },
  { id: 13, name: "Filtrado 2 tazas", description: "Café de filtro", price: 350, category: "BLACKS" },
  { id: 14, name: "Cold Brew", description: "Café frío de extracción lenta", price: 200, category: "FRIOS" },
  { id: 15, name: "Brew Tonic", description: "Cold brew con tónica", price: 250, category: "FRIOS" },
  { id: 16, name: "Iced Americano", description: "Americano helado", price: 190, category: "FRIOS" },
  { id: 17, name: "Iced Latte", description: "Latte helado", price: 230, category: "FRIOS" },
  { id: 18, name: "Iced Flat", description: "Flat white helado", price: 230, category: "FRIOS" },
  { id: 19, name: "Iced Mocca", description: "Mocca helado con chocolate", price: 260, category: "FRIOS" },
  { id: 20, name: "Macchiato", description: "2 shots + espuma", price: 180, category: "WHITES" },
  { id: 21, name: "Cappuccino", description: "1 shot + leche + espuma", price: 180, category: "WHITES" },
  { id: 22, name: "Cortado", description: "2 shots + leche", price: 190, category: "WHITES" },
  { id: 23, name: "Flat White", description: "2 shots + leche + fina espuma", price: 200, category: "WHITES" },
  { id: 24, name: "Latte", description: "1 shot + leche", price: 200, category: "WHITES" },
  { id: 25, name: "Mocca", description: "1 shot + leche + chocolate", price: 240, category: "WHITES" },
  { id: 26, name: "Alfajores", description: "Alfajores artesanales", price: 180, category: "DULCES" },
  { id: 27, name: "Barritas", description: "Barritas de cereal", price: 180, category: "DULCES" },
  { id: 28, name: "Budín", description: "Budín casero", price: 150, category: "DULCES" },
  { id: 29, name: "Carrot Cake", description: "Torta de zanahoria", price: 220, category: "DULCES" },
  { id: 30, name: "Cookies", description: "Cookies recién horneadas", price: 150, category: "DULCES" },
  { id: 31, name: "Roll de Canela", description: "Roll de canela casero", price: 180, category: "DULCES" },
  { id: 32, name: "Trufas", description: "Trufas de chocolate", price: 140, category: "DULCES" },
  { id: 33, name: "Tostadas con queso y dulce", description: "Tostadas artesanales", price: 200, category: "DULCES" },
  { id: 34, name: "Bowl de frutas", description: "Frutas, granola y agave", price: 250, category: "DULCES" },
  { id: 35, name: "Bowl de yogurt", description: "Frutas, granola, yogurt y miel", price: 300, category: "DULCES" },
  { id: 36, name: "Avocado Toast", description: "Tostadas con palta", price: 250, category: "SALADOS" },
  { id: 37, name: "Avocado Toast con Huevo", description: "Tostadas con palta y huevo", price: 300, category: "SALADOS" },
  { id: 38, name: "Chipa", description: "Chipa casero", price: 150, category: "SALADOS" },
  { id: 39, name: "Tostadas con humus y tomates", description: "Tostadas con humus y tomates", price: 250, category: "SALADOS" },
  { id: 40, name: "Roll de jamón y queso", description: "Roll de jamón y queso", price: 250, category: "SALADOS" },
  { id: 41, name: "Tostados", description: "Jamón y queso / queso y tomates confitados", price: 300, category: "SALADOS" },
  { id: 42, name: "Sandwiches", description: "Bondiola, queso, rúcula, tomates confitados / jamón, queso y huevo / palta, humus y tomates confitados", price: 400, category: "SALADOS" },
  { id: 43, name: "Submarino", description: "Chocolate caliente", price: 200, category: "OTRAS" },
  { id: 44, name: "Matcha", description: "Matcha latte", price: 250, category: "OTRAS" },
  { id: 45, name: "Chai Latte", description: "Chai latte especiado", price: 250, category: "OTRAS" },
  { id: 46, name: "Té", description: "Consultar variedades", price: 180, category: "OTRAS" },
  { id: 47, name: "Café en grano 250g", description: "Café premium para llevar", price: 1000, category: "OTRAS" },
  { id: 48, name: "Granola 250g", description: "Granola artesanal para llevar", price: 500, category: "OTRAS" },
  { id: 49, name: "Aguas / Refrescos", description: "Aguas y refrescos variados", price: 140, category: "BEBIDAS" },
  { id: 50, name: "Jugo de naranja / limonada", description: "Jugos naturales", price: 180, category: "BEBIDAS" },
  { id: 51, name: "Hibiscus Iced Tea", description: "Té helado de hibisco", price: 200, category: "BEBIDAS" },
  { id: 52, name: "Kombucha", description: "Kombucha artesanal", price: 180, category: "BEBIDAS" },
  { id: 53, name: "Jugos Vibra", description: "Jugos premium", price: 180, category: "BEBIDAS" },
  { id: 54, name: "Licuado", description: "Licuados variados", price: 250, category: "BEBIDAS" },
  { id: 55, name: "Milkshake (oreo, café o frutilla)", description: "Milkshakes cremosos", price: 300, category: "BEBIDAS" },
  { id: 56, name: "Vermouth Rooster (tónica o soda)", description: "Vermouth con tónica o soda", price: 280, category: "BEBIDAS" },
  { id: 57, name: "Cerveza artesanal", description: "Cerveza artesanal local", price: 260, category: "BEBIDAS" },
];

const categories = ["BLACKS", "FRIOS", "WHITES", "DULCES", "SALADOS", "OTRAS", "BEBIDAS"];

const categoryLabels: Record<string, string> = {
  BLACKS: "Blacks",
  FRIOS: "Fríos",
  WHITES: "Whites",
  DULCES: "Dulces",
  SALADOS: "Salados",
  OTRAS: "Otras",
  BEBIDAS: "Bebidas",
};

export function StockManagement() {
  const [productStates, setProductStates] = useState<Record<number, ProductState>>(() => {
    const initial: Record<number, ProductState> = {};
    initialProducts.forEach((product) => {
      initial[product.id] = { enabled: true, quantity: 0 };
    });
    return initial;
  });

  const toggleProduct = (id: number) => {
    setProductStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const updateQuantity = (id: number, quantity: number) => {
    setProductStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantity: Math.max(0, quantity) },
    }));
  };

  const getProductsByCategory = (category: string) => {
    return initialProducts.filter((p) => p.category === category);
  };

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
                {getProductsByCategory(category).map((product) => {
                  const state = productStates[product.id];
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border border-border bg-card transition-opacity ${
                        !state.enabled ? "opacity-50" : ""
                      }`}
                    >
                      <Switch
                        checked={state.enabled}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {product.description} - ${product.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Cant:</span>
                        <Input
                          type="number"
                          min={0}
                          value={state.quantity}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                          disabled={!state.enabled}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollArea>
  );
}
