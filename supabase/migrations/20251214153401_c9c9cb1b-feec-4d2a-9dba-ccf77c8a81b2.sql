-- Add address fields to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';