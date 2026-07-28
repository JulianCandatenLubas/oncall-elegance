CREATE TABLE public.shift_rotation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  team text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  shift_type text NOT NULL,
  week_start date NOT NULL,
  shift_date date NOT NULL,
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, weekday, shift_type, week_start)
);

CREATE INDEX idx_shift_rotation_history_lookup
  ON public.shift_rotation_history (collaborator_id, week_start);

GRANT SELECT ON public.shift_rotation_history TO authenticated;
GRANT ALL ON public.shift_rotation_history TO service_role;

ALTER TABLE public.shift_rotation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rotation history"
  ON public.shift_rotation_history FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_shift_rotation_history_updated_at
  BEFORE UPDATE ON public.shift_rotation_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();