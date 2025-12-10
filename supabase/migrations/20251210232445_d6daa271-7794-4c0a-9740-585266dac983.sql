-- Add RLS policies for UPDATE and DELETE on fuel_entries
CREATE POLICY "Authenticated users can update fuel entries"
ON public.fuel_entries
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete fuel entries"
ON public.fuel_entries
FOR DELETE
USING (true);