-- Add image_url column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to their venue's folder
CREATE POLICY "Users can upload product images for their venue"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.venues WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their venue's images
CREATE POLICY "Users can update product images for their venue"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.venues WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their venue's images
CREATE POLICY "Users can delete product images for their venue"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.venues WHERE user_id = auth.uid()
  )
);

-- Allow public read access to product images
CREATE POLICY "Public read access for product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');