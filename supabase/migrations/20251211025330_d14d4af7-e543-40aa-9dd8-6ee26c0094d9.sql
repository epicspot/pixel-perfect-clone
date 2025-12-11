-- Update any existing trips with old status values to new ones
UPDATE public.trips SET status = 'planned' WHERE status = 'scheduled';
UPDATE public.trips SET status = 'departed' WHERE status = 'in_progress';
UPDATE public.trips SET status = 'arrived' WHERE status = 'completed';

-- Add new check constraint with correct status values
ALTER TABLE public.trips ADD CONSTRAINT trips_status_check 
CHECK (status = ANY (ARRAY['planned'::text, 'boarding'::text, 'departed'::text, 'arrived'::text, 'cancelled'::text]));

-- Update default value
ALTER TABLE public.trips ALTER COLUMN status SET DEFAULT 'planned';