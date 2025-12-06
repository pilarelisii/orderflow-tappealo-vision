-- Create products table for stock management
CREATE TABLE public.products (
  id integer PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  category text NOT NULL,
  enabled boolean DEFAULT true,
  quantity integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read access for digital menu
CREATE POLICY "Public read access for products"
ON public.products
FOR SELECT
USING (true);

-- Public update access for dashboard
CREATE POLICY "Public update access for products"
ON public.products
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();

-- Insert all 48 products
INSERT INTO public.products (id, name, description, price, category) VALUES
-- BLACKS
(10, 'Espresso Doble', '2 shots', 170, 'blacks'),
(11, 'Americano', NULL, 170, 'blacks'),
(12, 'Pourover', 'Cafe especialidad', 200, 'blacks'),
-- FRIOS
(20, 'Cold Brew', 'Cafe Frio', 300, 'frios'),
(21, 'Iced Latte', 'Leche. Add shot $30', 350, 'frios'),
(22, 'Iced Matcha', 'Leche', 350, 'frios'),
(23, 'Frapuccino', 'Cafe Batido', 330, 'frios'),
(24, 'Limonada Cold Brew', 'Cafe Frio + Limonada', 300, 'frios'),
-- WHITES
(30, 'Cortado', 'Leche', 200, 'whites'),
(31, 'Flat White', 'Leche', 230, 'whites'),
(32, 'Cappuccino', 'Leche', 250, 'whites'),
(33, 'Latte', 'Leche. Add shot $30', 280, 'whites'),
-- DULCES
(40, 'Alfajor Artesanal', 'Triple cacao o Nuez', 250, 'dulces'),
(41, 'Pepas Caseras', 'Membrillo o Batata', 200, 'dulces'),
(42, 'Cookies Caseras', 'Chocolate o Avena', 200, 'dulces'),
(43, 'Cuadrado Brownie', 'Doble chocolate', 250, 'dulces'),
(44, 'Cuadrado Carrot Cake', 'Zanahoria y nuez', 250, 'dulces'),
(45, 'Cuadrado Cheesecake', 'Queso y frutos rojos', 250, 'dulces'),
(46, 'Cuadrado Lemon Pie', 'Limon', 250, 'dulces'),
(47, 'Medialunas', 'Manteca x3', 220, 'dulces'),
(48, 'Medialunas con Jamon y Queso', 'Manteca x3', 330, 'dulces'),
(49, 'Torta del Dia', 'Consultar', 350, 'dulces'),
(50, 'Budines', 'Consultar', 200, 'dulces'),
(51, 'Granola Bowl', 'Yogur, granola, fruta', 400, 'dulces'),
-- SALADOS
(60, 'Avocado Toast', 'Palta, huevo, pan casero', 520, 'salados'),
(61, 'Salmon Toast', 'Salmon, queso, pan casero', 680, 'salados'),
(62, 'Tostones Especiales', 'Jamon crudo, queso, huevo', 450, 'salados'),
(63, 'Huevos Revueltos', 'Con pan casero', 420, 'salados'),
(64, 'Huevos Benedictinos', 'Salmon o Jamon', 600, 'salados'),
(65, 'Sandwich Veggie', 'Verduras grilladas', 500, 'salados'),
(66, 'Sandwich Pollo', 'Pollo, palta, tomate', 550, 'salados'),
(67, 'Bagel Salmon', 'Salmon, queso crema', 600, 'salados'),
(68, 'Bagel Jamon', 'Jamon, queso', 450, 'salados'),
(69, 'Ensalada del Dia', 'Consultar', 500, 'salados'),
-- OTRAS
(70, 'Matcha Latte', 'Leche', 350, 'otras'),
(71, 'Chai Latte', 'Leche', 300, 'otras'),
(72, 'Te', 'Consultar', 180, 'otras'),
(73, 'Chocolate Caliente', 'Leche', 280, 'otras'),
(74, 'Submarino', 'Leche + Chocolate', 300, 'otras'),
-- BEBIDAS
(80, 'Jugo Natural Naranja', 'Exprimido', 300, 'bebidas'),
(81, 'Jugo Natural Pomelo', 'Exprimido', 300, 'bebidas'),
(82, 'Licuado Frutas', 'Consultar', 350, 'bebidas'),
(83, 'Limonada', 'Menta o Jengibre', 280, 'bebidas'),
(84, 'Agua Mineral', 'Con o sin gas', 150, 'bebidas'),
(85, 'Gaseosa', 'Consultar', 180, 'bebidas'),
(86, 'Cerveza', 'Consultar', 350, 'bebidas'),
(87, 'Copa de Vino', 'Consultar', 400, 'bebidas');