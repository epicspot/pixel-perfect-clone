-- Create shipment pricing configuration table
CREATE TABLE public.shipment_pricing (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('excess_baggage', 'unaccompanied_baggage', 'parcel', 'express')),
  base_price NUMERIC NOT NULL DEFAULT 1000,
  price_per_kg NUMERIC NOT NULL DEFAULT 500,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(type)
);

-- Enable RLS
ALTER TABLE public.shipment_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view pricing"
ON public.shipment_pricing
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pricing"
ON public.shipment_pricing
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_shipment_pricing_updated_at
BEFORE UPDATE ON public.shipment_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pricing
INSERT INTO public.shipment_pricing (type, base_price, price_per_kg, description) VALUES
('excess_baggage', 1000, 500, 'Bagage excédentaire lié à un ticket passager'),
('unaccompanied_baggage', 1500, 600, 'Bagage non accompagné'),
('parcel', 2000, 750, 'Colis standard'),
('express', 3000, 1000, 'Courrier express / urgent');