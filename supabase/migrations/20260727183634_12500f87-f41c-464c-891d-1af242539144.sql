
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_app_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_admin_or_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role IN ('admin','gestor')) $$;

REVOKE ALL ON FUNCTION private.has_app_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin_or_gestor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_app_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_or_gestor(uuid) TO authenticated, service_role;

-- Repoint policies to the private helpers
DROP POLICY "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all" ON public.profiles
FOR SELECT TO authenticated
USING ((auth.uid() = id) OR private.has_app_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE TO authenticated
USING (private.has_app_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_app_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (private.has_app_role(auth.uid(), 'admin'::public.app_role) AND (id <> 'd81cd53e-f6c7-4f5d-9bbc-285cf23fcd88'::uuid));

DROP POLICY "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (private.has_app_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = id));

DROP POLICY "Admins and gestores can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins and gestores can read audit_logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (private.is_admin_or_gestor(auth.uid()));

DROP POLICY "manage restrictions" ON public.collaborator_restrictions;
CREATE POLICY "manage restrictions" ON public.collaborator_restrictions
FOR ALL TO authenticated
USING (private.is_admin_or_gestor(auth.uid()))
WITH CHECK (private.is_admin_or_gestor(auth.uid()));

DROP POLICY "manage priorities" ON public.collaborator_priorities;
CREATE POLICY "manage priorities" ON public.collaborator_priorities
FOR ALL TO authenticated
USING (private.is_admin_or_gestor(auth.uid()))
WITH CHECK (private.is_admin_or_gestor(auth.uid()));

-- Trigger function should use the private helper too
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT private.has_app_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Remove API-exposed SECURITY DEFINER helpers
DROP FUNCTION IF EXISTS public.has_app_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin_or_gestor(uuid);

-- Trigger functions must never be callable via the API
REVOKE ALL ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_collaborator_from_profile() FROM PUBLIC, anon, authenticated;
