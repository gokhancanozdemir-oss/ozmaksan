-- Sadece temizlik (setup.sql hata verdiyse önce bunu çalıştırın, sonra setup.sql)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.consumption_records CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated_user() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
