-- Table pour les tarifs d'expédition par trajet
CREATE TABLE public.shipment_route_pricing (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES public.routes(id) ON DELETE CASCADE,
  shipment_type TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, shipment_type)
);

-- Enable RLS
ALTER TABLE public.shipment_route_pricing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view route pricing"
  ON public.shipment_route_pricing
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage route pricing"
  ON public.shipment_route_pricing
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_shipment_route_pricing_updated_at
  BEFORE UPDATE ON public.shipment_route_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_shipment_route_pricing_route ON public.shipment_route_pricing(route_id);
CREATE INDEX idx_shipment_route_pricing_type ON public.shipment_route_pricing(shipment_type);