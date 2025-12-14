-- Create company_settings table for storing company configuration
CREATE TABLE public.company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name TEXT NOT NULL DEFAULT 'TRANSPORT BURKINA EXPRESS',
  slogan TEXT NOT NULL DEFAULT 'Votre partenaire de confiance pour tous vos voyages • Sécurité • Confort • Ponctualité',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read company settings
CREATE POLICY "Company settings are readable by authenticated users"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update company settings
CREATE POLICY "Only admins can update company settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.company_settings (id, company_name, slogan)
VALUES (1, 'TRANSPORT BURKINA EXPRESS', 'Votre partenaire de confiance pour tous vos voyages • Sécurité • Confort • Ponctualité');

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();