-- Create table for ticket scan history
CREATE TABLE public.ticket_scans (
  id SERIAL PRIMARY KEY,
  ticket_reference TEXT NOT NULL,
  scanned_by UUID REFERENCES auth.users(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ticket_data JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can create scans"
ON public.ticket_scans
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view scans"
ON public.ticket_scans
FOR SELECT
TO authenticated
USING (true);

-- Index for faster queries
CREATE INDEX idx_ticket_scans_scanned_at ON public.ticket_scans(scanned_at DESC);
CREATE INDEX idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by);