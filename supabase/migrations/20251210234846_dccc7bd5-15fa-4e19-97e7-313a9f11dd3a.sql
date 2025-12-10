
-- ============================================
-- 1. ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier', 'accountant', 'mechanic', 'driver', 'assistant');
CREATE TYPE public.vehicle_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE public.trip_status AS ENUM ('planned', 'boarding', 'departed', 'arrived', 'cancelled');
CREATE TYPE public.ticket_status AS ENUM ('reserved', 'paid', 'cancelled', 'refunded', 'used');
CREATE TYPE public.payment_method AS ENUM ('cash', 'mobile_money', 'card', 'other');
CREATE TYPE public.maintenance_type AS ENUM ('preventive', 'corrective', 'other');
CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'closed', 'cancelled');
CREATE TYPE public.staff_type AS ENUM ('driver', 'assistant', 'cashier', 'admin', 'mechanic', 'other');
CREATE TYPE public.payroll_status AS ENUM ('open', 'closed');
CREATE TYPE public.cash_closure_status AS ENUM ('open', 'closed', 'validated');

-- ============================================
-- 2. USER ROLES TABLE (Security Best Practice)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- 3. UPDATE AGENCIES TABLE
-- ============================================
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 4. UPDATE ROUTES TABLE
-- ============================================
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 5. UPDATE VEHICLES TABLE
-- ============================================
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bus',
ADD COLUMN IF NOT EXISTS acquisition_date DATE;

-- ============================================
-- 6. VEHICLE ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE public.vehicle_assignments (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES public.vehicles(id) ON DELETE CASCADE,
    agency_id INTEGER REFERENCES public.agencies(id),
    route_id INTEGER REFERENCES public.routes(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. STAFF TABLE
-- ============================================
CREATE TABLE public.staff (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES public.agencies(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    job_title TEXT,
    staff_type staff_type NOT NULL DEFAULT 'other',
    phone TEXT,
    email TEXT,
    hire_date DATE,
    base_salary DECIMAL(12,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. UPDATE TRIPS TABLE
-- ============================================
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES public.staff(id),
ADD COLUMN IF NOT EXISTS assistant_id INTEGER REFERENCES public.staff(id),
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 9. UPDATE TICKETS TABLE
-- ============================================
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES public.agencies(id),
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS seat_number TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'XOF',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- ============================================
-- 10. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    agency_id INTEGER REFERENCES public.agencies(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id BIGINT,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. FUEL SUPPLIERS TABLE
-- ============================================
CREATE TABLE public.fuel_suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_suppliers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. UPDATE FUEL ENTRIES TABLE
-- ============================================
ALTER TABLE public.fuel_entries 
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES public.fuel_suppliers(id),
ADD COLUMN IF NOT EXISTS odometer_km INTEGER,
ADD COLUMN IF NOT EXISTS note TEXT;

-- ============================================
-- 13. UPDATE MAINTENANCE ORDERS TABLE
-- ============================================
ALTER TABLE public.maintenance_orders 
ADD COLUMN IF NOT EXISTS reported_by_staff INTEGER REFERENCES public.staff(id);

-- ============================================
-- 14. MAINTENANCE ITEMS TABLE
-- ============================================
CREATE TABLE public.maintenance_items (
    id SERIAL PRIMARY KEY,
    maintenance_order_id INTEGER REFERENCES public.maintenance_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. EXPENSE CATEGORIES TABLE
-- ============================================
CREATE TABLE public.expense_categories (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 16. EXPENSES TABLE
-- ============================================
CREATE TABLE public.expenses (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES public.agencies(id),
    category_id INTEGER REFERENCES public.expense_categories(id),
    vehicle_id INTEGER REFERENCES public.vehicles(id),
    staff_id INTEGER REFERENCES public.staff(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    supporting_document_path TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 17. PAYROLL PERIODS TABLE
-- ============================================
CREATE TABLE public.payroll_periods (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT NOT NULL,
    status payroll_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 18. PAYROLL ENTRIES TABLE
-- ============================================
CREATE TABLE public.payroll_entries (
    id SERIAL PRIMARY KEY,
    payroll_period_id INTEGER REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES public.staff(id),
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    bonuses DECIMAL(12,2) NOT NULL DEFAULT 0,
    allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
    deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 19. CASH CLOSURES TABLE
-- ============================================
CREATE TABLE public.cash_closures (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES public.agencies(id),
    user_id UUID REFERENCES auth.users(id),
    closure_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    to_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    total_cash_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_mobile_money_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_card_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_tickets_count INTEGER NOT NULL DEFAULT 0,
    difference DECIMAL(12,2),
    status cash_closure_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 20. RLS POLICIES
-- ============================================

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Staff policies
CREATE POLICY "Authenticated users can view staff" ON public.staff
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage staff" ON public.staff
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Vehicle assignments policies
CREATE POLICY "Authenticated users can view vehicle assignments" ON public.vehicle_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage vehicle assignments" ON public.vehicle_assignments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Fuel suppliers policies
CREATE POLICY "Authenticated users can view fuel suppliers" ON public.fuel_suppliers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fuel suppliers" ON public.fuel_suppliers
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Maintenance items policies
CREATE POLICY "Authenticated users can view maintenance items" ON public.maintenance_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage maintenance items" ON public.maintenance_items
    FOR ALL TO authenticated USING (true);

-- Expense categories policies
CREATE POLICY "Authenticated users can view expense categories" ON public.expense_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Expenses policies
CREATE POLICY "Authenticated users can view expenses" ON public.expenses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create expenses" ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage expenses" ON public.expenses
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payroll periods policies
CREATE POLICY "Admins and accountants can view payroll periods" ON public.payroll_periods
    FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Admins can manage payroll periods" ON public.payroll_periods
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payroll entries policies
CREATE POLICY "Admins and accountants can view payroll entries" ON public.payroll_entries
    FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Admins can manage payroll entries" ON public.payroll_entries
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Cash closures policies
CREATE POLICY "Authenticated users can view their cash closures" ON public.cash_closures
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can create cash closures" ON public.cash_closures
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage cash closures" ON public.cash_closures
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 21. TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_vehicle_assignments_updated_at
    BEFORE UPDATE ON public.vehicle_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_suppliers_updated_at
    BEFORE UPDATE ON public.fuel_suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_items_updated_at
    BEFORE UPDATE ON public.maintenance_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
    BEFORE UPDATE ON public.payroll_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
    BEFORE UPDATE ON public.payroll_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_closures_updated_at
    BEFORE UPDATE ON public.cash_closures
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 22. INSERT DEFAULT EXPENSE CATEGORIES
-- ============================================
INSERT INTO public.expense_categories (code, name) VALUES
    ('CARBURANT', 'Carburant'),
    ('MAINT', 'Maintenance'),
    ('SALAIRE', 'Salaires'),
    ('TAXE', 'Taxes et impôts'),
    ('DIVERS', 'Divers')
ON CONFLICT (code) DO NOTHING;
