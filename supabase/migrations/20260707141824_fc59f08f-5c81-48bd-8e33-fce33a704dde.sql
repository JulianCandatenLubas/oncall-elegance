CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Permite alterações originadas pelo backend (service role, auth.uid() é NULL)
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_app_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;