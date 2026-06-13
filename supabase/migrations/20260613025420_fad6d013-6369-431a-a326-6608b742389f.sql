
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email = '');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (lower(email)) WHERE email IS NOT NULL;

DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_app_role(auth.uid(), 'admin'::app_role) AND id <> 'd81cd53e-f6c7-4f5d-9bbc-285cf23fcd88'::uuid);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_app_role(auth.uid(), 'admin'::app_role) OR auth.uid() = id);
