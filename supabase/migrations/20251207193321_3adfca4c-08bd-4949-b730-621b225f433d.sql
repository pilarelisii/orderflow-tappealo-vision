-- 1. Crear tabla venues
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS en venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- 3. Agregar venue_id a products
ALTER TABLE public.products ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- 4. Agregar venue_id a orders
ALTER TABLE public.orders ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- 5. Insertar venue "La Bici"
INSERT INTO public.venues (name, slug, logo_url, enabled)
VALUES ('La Bici', 'labici', NULL, true);

-- 6. Migrar datos existentes a La Bici
UPDATE public.products SET venue_id = (SELECT id FROM public.venues WHERE slug = 'labici');
UPDATE public.orders SET venue_id = (SELECT id FROM public.venues WHERE slug = 'labici');

-- 7. Hacer venue_id NOT NULL después de migrar datos
ALTER TABLE public.products ALTER COLUMN venue_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN venue_id SET NOT NULL;

-- 8. Crear función helper para obtener venue_id del usuario
CREATE OR REPLACE FUNCTION public.get_user_venue_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.venues WHERE user_id = _user_id LIMIT 1
$$;

-- 9. RLS policies para venues
CREATE POLICY "Public can read enabled venues"
ON public.venues FOR SELECT
USING (enabled = true);

CREATE POLICY "Venue owner can update their venue"
ON public.venues FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 10. Eliminar políticas antiguas de products
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
DROP POLICY IF EXISTS "Public update access for products" ON public.products;

-- 11. Nuevas políticas para products (multi-tenant)
CREATE POLICY "Public can read products by venue slug"
ON public.products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.venues v 
    WHERE v.id = venue_id AND v.enabled = true
  )
);

CREATE POLICY "Venue owner can update products"
ON public.products FOR UPDATE
TO authenticated
USING (venue_id = public.get_user_venue_id(auth.uid()));

CREATE POLICY "Venue owner can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (venue_id = public.get_user_venue_id(auth.uid()));

CREATE POLICY "Venue owner can delete products"
ON public.products FOR DELETE
TO authenticated
USING (venue_id = public.get_user_venue_id(auth.uid()));

-- 12. Eliminar políticas antiguas de orders
DROP POLICY IF EXISTS "Public insert access" ON public.orders;
DROP POLICY IF EXISTS "Public read access" ON public.orders;
DROP POLICY IF EXISTS "Public update access" ON public.orders;

-- 13. Nuevas políticas para orders (multi-tenant)
CREATE POLICY "Public can insert orders to enabled venues"
ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues v 
    WHERE v.id = venue_id AND v.enabled = true
  )
);

CREATE POLICY "Venue owner can read orders"
ON public.orders FOR SELECT
TO authenticated
USING (venue_id = public.get_user_venue_id(auth.uid()));

CREATE POLICY "Venue owner can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (venue_id = public.get_user_venue_id(auth.uid()));

-- 14. Habilitar realtime para venues
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;