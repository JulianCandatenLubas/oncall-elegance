
-- Restrict audit_logs SELECT to admin/gestor only
DROP POLICY IF EXISTS "All authenticated can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins and gestores can read audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin') OR public.has_app_role(auth.uid(), 'gestor'));

-- Restrict collaborators.email via column-level grants; keep row SELECT open for non-sensitive cols
DROP POLICY IF EXISTS "All authenticated can read collaborators" ON public.collaborators;
CREATE POLICY "Authenticated can read collaborators"
  ON public.collaborators FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.collaborators FROM authenticated;
GRANT SELECT (id, full_name, team, status, created_at, updated_at) ON public.collaborators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO service_role;

-- Tighten profiles UPDATE: prevent role change via WITH CHECK in addition to trigger
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile (no role change)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'));
