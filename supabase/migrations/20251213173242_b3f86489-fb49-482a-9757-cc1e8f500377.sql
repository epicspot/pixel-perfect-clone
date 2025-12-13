-- Enable realtime for shipments table
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;