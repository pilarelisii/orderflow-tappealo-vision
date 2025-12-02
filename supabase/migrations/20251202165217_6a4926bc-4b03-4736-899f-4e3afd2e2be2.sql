-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('entrante', 'preparacion', 'retirar', 'enviar');

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items JSONB NOT NULL,
  comentarios_generales TEXT,
  lugar_entrega TEXT,
  total NUMERIC NOT NULL,
  status order_status NOT NULL DEFAULT 'entrante',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public read/update policy (for the kitchen dashboard)
CREATE POLICY "Public read access" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public update access" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Public insert access" ON public.orders FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();