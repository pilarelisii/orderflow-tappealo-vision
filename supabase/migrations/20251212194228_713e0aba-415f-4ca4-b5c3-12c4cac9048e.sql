-- Add service_active column to venues table for QR/service control
ALTER TABLE public.venues ADD COLUMN service_active boolean DEFAULT true NOT NULL;