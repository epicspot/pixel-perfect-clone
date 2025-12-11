-- Drop the old check constraint
ALTER TABLE public.tickets DROP CONSTRAINT tickets_status_check;

-- Update any existing tickets with 'pending' status to 'reserved'
UPDATE public.tickets SET status = 'reserved' WHERE status = 'pending';

-- Add new check constraint with all valid status values
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY['reserved'::text, 'paid'::text, 'cancelled'::text, 'refunded'::text, 'used'::text]));

-- Update default value
ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'reserved';