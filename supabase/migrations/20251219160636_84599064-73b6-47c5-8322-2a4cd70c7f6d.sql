-- Allow public read access to qr_locations for the menu API
CREATE POLICY "Public can read enabled qr_locations" 
ON public.qr_locations 
FOR SELECT 
USING (enabled = true);