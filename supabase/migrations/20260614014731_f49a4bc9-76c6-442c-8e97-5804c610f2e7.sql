
CREATE OR REPLACE FUNCTION public.sync_collaborator_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.is_collaborator IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  v_email := lower(trim(NEW.email));
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.collaborators (full_name, email, team, status)
  VALUES (COALESCE(NEW.full_name, v_email), v_email, 'atendimento', 'active')
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collaborator_from_profile ON public.profiles;
CREATE TRIGGER trg_sync_collaborator_from_profile
AFTER INSERT OR UPDATE OF is_collaborator, email, full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_collaborator_from_profile();

-- Backfill
INSERT INTO public.collaborators (full_name, email, team, status)
SELECT COALESCE(p.full_name, lower(trim(p.email))), lower(trim(p.email)), 'atendimento', 'active'
FROM public.profiles p
WHERE p.is_collaborator = true
  AND p.email IS NOT NULL
  AND trim(p.email) <> ''
ON CONFLICT (email) DO NOTHING;
