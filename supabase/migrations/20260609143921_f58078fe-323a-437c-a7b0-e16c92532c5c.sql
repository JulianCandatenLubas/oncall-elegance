
CREATE TYPE public.team AS ENUM ('infra', 'sre', 'atendimento');
CREATE TYPE public.collaborator_status AS ENUM ('active', 'inactive');
CREATE TYPE public.absence_type AS ENUM ('ferias', 'atestado_medico', 'licenca_medica', 'licenca_maternidade', 'licenca_paternidade', 'folga_programada', 'outros');
CREATE TYPE public.shift_type AS ENUM ('diurno', 'noturno');
CREATE TYPE public.day_type AS ENUM ('dia_util', 'fim_de_semana', 'feriado');
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'visualizador');
CREATE TYPE public.schedule_status AS ENUM ('draft', 'published');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'visualizador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    team public.team NOT NULL,
    status public.collaborator_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO authenticated;
GRANT ALL ON public.collaborators TO service_role;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read collaborators"
ON public.collaborators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can manage collaborators"
ON public.collaborators FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE TABLE public.absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    type public.absence_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT ALL ON public.absences TO service_role;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read absences"
ON public.absences FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can manage absences"
ON public.absences FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status public.schedule_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read schedules"
ON public.schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can manage schedules"
ON public.schedules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE TABLE public.schedule_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    day_type public.day_type NOT NULL,
    shift_type public.shift_type NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    infra_collaborator_id UUID REFERENCES public.collaborators(id),
    sre_collaborator_id UUID REFERENCES public.collaborators(id),
    atendimento_collaborator_id UUID REFERENCES public.collaborators(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_shifts TO authenticated;
GRANT ALL ON public.schedule_shifts TO service_role;
ALTER TABLE public.schedule_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read schedule_shifts"
ON public.schedule_shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can manage schedule_shifts"
ON public.schedule_shifts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read audit_logs"
ON public.audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can create audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE TABLE public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER,
    day INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_national BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(year, month, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read holidays"
ON public.holidays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and gestores can manage holidays"
ON public.holidays FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  )
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborators_updated_at BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON public.absences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_shifts_updated_at BEFORE UPDATE ON public.schedule_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
