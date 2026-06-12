-- Ensure admin profile exists for the fixed admin user
INSERT INTO public.profiles (id, full_name, role)
VALUES ('d81cd53e-f6c7-4f5d-9bbc-285cf23fcd88', 'Julian Candaten Lubas', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Julian Candaten Lubas';

-- Reset admin password to the documented value
UPDATE auth.users
SET encrypted_password = crypt('08493926914', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'juliancandatenlubas@gmail.com';