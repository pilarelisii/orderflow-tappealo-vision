-- Create qr_locations table for managing QR codes per venue
CREATE TABLE public.qr_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text,
  delivery_type text NOT NULL DEFAULT 'en_lugar',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, code)
);

-- Enable RLS
ALTER TABLE public.qr_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Venue owner can read their QR locations
CREATE POLICY "Venue owner can read qr_locations"
ON public.qr_locations
FOR SELECT
USING (venue_id = get_user_venue_id(auth.uid()));

-- Policy: Venue owner can insert their QR locations
CREATE POLICY "Venue owner can insert qr_locations"
ON public.qr_locations
FOR INSERT
WITH CHECK (venue_id = get_user_venue_id(auth.uid()));

-- Policy: Venue owner can update their QR locations
CREATE POLICY "Venue owner can update qr_locations"
ON public.qr_locations
FOR UPDATE
USING (venue_id = get_user_venue_id(auth.uid()));

-- Policy: Venue owner can delete their QR locations
CREATE POLICY "Venue owner can delete qr_locations"
ON public.qr_locations
FOR DELETE
USING (venue_id = get_user_venue_id(auth.uid()));

-- Add comment for clarity
COMMENT ON TABLE public.qr_locations IS 'QR code locations with delivery type configuration per venue';
COMMENT ON COLUMN public.qr_locations.code IS 'utm_campaign value (e.g., mesa1, natatorio1)';
COMMENT ON COLUMN public.qr_locations.delivery_type IS 'en_lugar, retiro, envio, or retiro_envio';