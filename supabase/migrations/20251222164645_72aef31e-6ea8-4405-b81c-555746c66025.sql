-- Add order_api_url column to venues table for webhook integration
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS order_api_url TEXT;