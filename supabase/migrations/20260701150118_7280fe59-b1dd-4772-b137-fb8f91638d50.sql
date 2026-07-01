
CREATE TYPE public.restriction_type AS ENUM ('weekdays','weekends','holidays');
CREATE TYPE public.priority_level AS ENUM ('alta','media','baixa');

CREATE TABLE public.collaborator_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  type public.restriction_type NOT NULL,
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_restrictions TO authenticated;
GRANT ALL ON public.collaborator_restrictions TO service_role;
ALTER TABLE public.collaborator_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read restrictions" ON public.collaborator_restrictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage restrictions" ON public.collaborator_restrictions FOR ALL TO authenticated
  USING (public.has_app_role(auth.uid(),'admin') OR public.has_app_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_app_role(auth.uid(),'admin') OR public.has_app_role(auth.uid(),'gestor'));

CREATE TABLE public.collaborator_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  level public.priority_level NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_priorities TO authenticated;
GRANT ALL ON public.collaborator_priorities TO service_role;
ALTER TABLE public.collaborator_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read priorities" ON public.collaborator_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage priorities" ON public.collaborator_priorities FOR ALL TO authenticated
  USING (public.has_app_role(auth.uid(),'admin') OR public.has_app_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_app_role(auth.uid(),'admin') OR public.has_app_role(auth.uid(),'gestor'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_restrictions_updated BEFORE UPDATE ON public.collaborator_restrictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_priorities_updated BEFORE UPDATE ON public.collaborator_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow email to be optional in collaborators (drop NOT NULL if present)
ALTER TABLE public.collaborators ALTER COLUMN email DROP NOT NULL;
