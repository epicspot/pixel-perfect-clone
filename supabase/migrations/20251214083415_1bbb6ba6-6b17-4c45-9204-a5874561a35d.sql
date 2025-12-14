-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true);

-- Allow authenticated users to view company assets
CREATE POLICY "Company assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Only admins can upload/update company assets
CREATE POLICY "Only admins can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update company assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);