-- Add primary_color column to venues table for brand customization
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#8B5CF6';

COMMENT ON COLUMN public.venues.primary_color IS 'Primary brand color for the venue menu (hex format)';