DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Siege users can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_siege_user(auth.uid()));