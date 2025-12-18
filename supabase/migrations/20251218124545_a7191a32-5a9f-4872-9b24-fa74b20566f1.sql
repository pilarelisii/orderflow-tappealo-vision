-- Add commerce/business fields to venues table
ALTER TABLE public.venues 
ADD COLUMN google_maps_url TEXT,
ADD COLUMN phone TEXT;