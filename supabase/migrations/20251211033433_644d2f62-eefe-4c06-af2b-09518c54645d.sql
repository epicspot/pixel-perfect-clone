-- Create enum for shipment types
CREATE TYPE public.shipment_type AS ENUM ('excess_baggage', 'unaccompanied_baggage', 'parcel', 'express');

-- Create enum for shipment status
CREATE TYPE public.shipment_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');

-- Create shipments table
CREATE TABLE public.shipments (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  type shipment_type NOT NULL,
  trip_id INTEGER REFERENCES public.trips(id) ON DELETE SET NULL,
  ticket_id INTEGER REFERENCES public.tickets(id) ON DELETE SET NULL,
  departure_agency_id INTEGER REFERENCES public.agencies(id) ON DELETE SET NULL,
  arrival_agency_id INTEGER REFERENCES public.agencies(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT,
  description TEXT,
  weight_kg NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  price_per_kg NUMERIC DEFAULT 0,
  base_price NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status shipment_status NOT NULL DEFAULT 'pending',
  is_excess_baggage BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view shipments"
ON public.shipments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create shipments"
ON public.shipments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments"
ON public.shipments
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete shipments"
ON public.shipments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_shipments_trip_id ON public.shipments(trip_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_type ON public.shipments(type);
CREATE INDEX idx_shipments_reference ON public.shipments(reference);