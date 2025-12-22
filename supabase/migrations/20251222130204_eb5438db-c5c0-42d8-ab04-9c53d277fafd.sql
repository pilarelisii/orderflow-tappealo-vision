-- Add Mercado Pago integration fields to venues table
ALTER TABLE public.venues
ADD COLUMN mp_public_key text,
ADD COLUMN mp_access_token text;