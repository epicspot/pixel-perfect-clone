
-- Helper: detect Siège personnel (agency code 'SIE')
CREATE OR REPLACE FUNCTION public.is_siege_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = _user_id AND a.code = 'SIE'
  );
$$;

-- Allow Siège personnel to manage administrative tables
CREATE POLICY "Siege can manage agencies"
  ON public.agencies FOR ALL
  USING (public.is_siege_user(auth.uid()))
  WITH CHECK (public.is_siege_user(auth.uid()));

CREATE POLICY "Siege can manage routes"
  ON public.routes FOR ALL
  USING (public.is_siege_user(auth.uid()))
  WITH CHECK (public.is_siege_user(auth.uid()));

CREATE POLICY "Siege can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.is_siege_user(auth.uid()))
  WITH CHECK (public.is_siege_user(auth.uid()));

CREATE POLICY "Siege can manage staff"
  ON public.staff FOR ALL
  USING (public.is_siege_user(auth.uid()))
  WITH CHECK (public.is_siege_user(auth.uid()));
