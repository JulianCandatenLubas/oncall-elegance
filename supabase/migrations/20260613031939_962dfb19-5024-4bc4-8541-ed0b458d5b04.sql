GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gestor(uuid) TO authenticated, service_role;