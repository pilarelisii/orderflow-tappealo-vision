-- Add description field to qr_locations
ALTER TABLE public.qr_locations ADD COLUMN IF NOT EXISTS description text;