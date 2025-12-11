-- Add validation columns to payroll_entries
ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validated_by UUID DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.payroll_entries.validated_at IS 'Timestamp when the entry was validated';
COMMENT ON COLUMN public.payroll_entries.validated_by IS 'User ID who validated the entry';