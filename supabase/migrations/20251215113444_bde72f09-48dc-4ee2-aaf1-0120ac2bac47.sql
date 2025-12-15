-- Add RCCM and IFU columns to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS rccm TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ifu TEXT DEFAULT '';