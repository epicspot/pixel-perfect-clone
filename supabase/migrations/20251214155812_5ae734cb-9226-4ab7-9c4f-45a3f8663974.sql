-- Table des guichets (postes de vente physiques par agence)
CREATE TABLE public.ticket_counters (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche par agence
CREATE INDEX idx_ticket_counters_agency ON public.ticket_counters(agency_id);

-- Table des sessions de guichet (ouverture/fermeture)
CREATE TABLE public.counter_sessions (
  id SERIAL PRIMARY KEY,
  counter_id INTEGER REFERENCES public.ticket_counters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agency_id INTEGER REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Ouverture
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  
  -- Fermeture
  closed_at TIMESTAMPTZ,
  closing_cash_declared NUMERIC,
  closing_cash_expected NUMERIC,
  difference NUMERIC,
  closing_notes TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherches fréquentes
CREATE INDEX idx_counter_sessions_user ON public.counter_sessions(user_id);
CREATE INDEX idx_counter_sessions_counter ON public.counter_sessions(counter_id);
CREATE INDEX idx_counter_sessions_agency ON public.counter_sessions(agency_id);
CREATE INDEX idx_counter_sessions_status ON public.counter_sessions(status);
CREATE INDEX idx_counter_sessions_opened_at ON public.counter_sessions(opened_at);

-- Enable RLS
ALTER TABLE public.ticket_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour ticket_counters
CREATE POLICY "Admins can manage ticket counters"
ON public.ticket_counters FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view ticket counters"
ON public.ticket_counters FOR SELECT
USING (true);

-- RLS Policies pour counter_sessions
CREATE POLICY "Admins can manage all sessions"
ON public.counter_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create sessions"
ON public.counter_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own sessions or managers/admins can view all"
ON public.counter_sessions FOR SELECT
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can update their own open sessions"
ON public.counter_sessions FOR UPDATE
USING (user_id = auth.uid() AND status = 'open');

-- Trigger pour updated_at
CREATE TRIGGER update_ticket_counters_updated_at
BEFORE UPDATE ON public.ticket_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_counter_sessions_updated_at
BEFORE UPDATE ON public.counter_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();