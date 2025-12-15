-- Create role_permissions table for granular access control
CREATE TABLE public.role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view permissions"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
-- Admin: Full access to everything
('admin', 'tickets', true, true, true, true),
('admin', 'expeditions', true, true, true, true),
('admin', 'voyages', true, true, true, true),
('admin', 'depenses', true, true, true, true),
('admin', 'carburant', true, true, true, true),
('admin', 'maintenance', true, true, true, true),
('admin', 'staff', true, true, true, true),
('admin', 'paie', true, true, true, true),
('admin', 'guichets', true, true, true, true),
('admin', 'rapports', true, true, true, true),
('admin', 'comptabilite', true, true, true, true),

-- Manager: Can view, create, edit most things, delete some
('manager', 'tickets', true, true, true, false),
('manager', 'expeditions', true, true, true, false),
('manager', 'voyages', true, true, true, false),
('manager', 'depenses', true, true, true, false),
('manager', 'carburant', true, true, true, false),
('manager', 'maintenance', true, true, true, false),
('manager', 'staff', true, true, true, false),
('manager', 'paie', true, false, false, false),
('manager', 'guichets', true, true, true, false),
('manager', 'rapports', true, true, false, false),
('manager', 'comptabilite', true, false, false, false),

-- Cashier: Mainly create tickets and expeditions
('cashier', 'tickets', true, true, false, false),
('cashier', 'expeditions', true, true, false, false),
('cashier', 'voyages', true, false, false, false),
('cashier', 'depenses', false, false, false, false),
('cashier', 'carburant', false, false, false, false),
('cashier', 'maintenance', false, false, false, false),
('cashier', 'staff', false, false, false, false),
('cashier', 'paie', false, false, false, false),
('cashier', 'guichets', true, true, true, false),
('cashier', 'rapports', false, false, false, false),
('cashier', 'comptabilite', false, false, false, false),

-- Accountant: View reports, manage expenses and payroll
('accountant', 'tickets', false, false, false, false),
('accountant', 'expeditions', false, false, false, false),
('accountant', 'voyages', false, false, false, false),
('accountant', 'depenses', true, true, true, false),
('accountant', 'carburant', true, false, false, false),
('accountant', 'maintenance', true, false, false, false),
('accountant', 'staff', true, false, false, false),
('accountant', 'paie', true, true, true, false),
('accountant', 'guichets', false, false, false, false),
('accountant', 'rapports', true, true, false, false),
('accountant', 'comptabilite', true, true, true, false),

-- Mechanic: Fuel and maintenance
('mechanic', 'tickets', false, false, false, false),
('mechanic', 'expeditions', false, false, false, false),
('mechanic', 'voyages', false, false, false, false),
('mechanic', 'depenses', true, true, false, false),
('mechanic', 'carburant', true, true, true, false),
('mechanic', 'maintenance', true, true, true, false),
('mechanic', 'staff', true, false, false, false),
('mechanic', 'paie', false, false, false, false),
('mechanic', 'guichets', false, false, false, false),
('mechanic', 'rapports', false, false, false, false),
('mechanic', 'comptabilite', false, false, false, false);