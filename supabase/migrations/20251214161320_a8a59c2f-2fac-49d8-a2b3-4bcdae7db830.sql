-- Create table for cash discrepancy alerts
CREATE TABLE public.cash_discrepancy_alerts (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.counter_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  agency_id INTEGER REFERENCES public.agencies(id),
  difference NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_discrepancy_alerts ENABLE ROW LEVEL SECURITY;

-- Admins and managers can view all alerts
CREATE POLICY "Admins and managers can view alerts"
ON public.cash_discrepancy_alerts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- System can create alerts (via trigger or direct insert)
CREATE POLICY "Authenticated users can create alerts"
ON public.cash_discrepancy_alerts
FOR INSERT
WITH CHECK (true);

-- Admins and managers can update (acknowledge) alerts
CREATE POLICY "Admins and managers can acknowledge alerts"
ON public.cash_discrepancy_alerts
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Create index for faster lookups
CREATE INDEX idx_cash_discrepancy_alerts_agency ON public.cash_discrepancy_alerts(agency_id);
CREATE INDEX idx_cash_discrepancy_alerts_acknowledged ON public.cash_discrepancy_alerts(acknowledged_at);

-- Add app settings table for configurable threshold
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view settings
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Insert default threshold (5000 F CFA)
INSERT INTO public.app_settings (key, value, description)
VALUES ('cash_discrepancy_threshold', '5000', 'Seuil d''écart de caisse pour déclencher une alerte (en F CFA)')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_discrepancy_alerts;