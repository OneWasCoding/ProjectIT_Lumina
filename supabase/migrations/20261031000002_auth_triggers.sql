-- ==============================================================================
-- Migration 02: Auth Triggers & User Profile Synchronization
-- ==============================================================================

-- Auth Signup Trigger: Automatically creates users_profile entry from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  INSERT INTO public.users_profile (
    id,
    email,
    full_name,
    role,
    year_level
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    CASE WHEN assigned_role = 'faculty' THEN NULL ELSE NEW.raw_user_meta_data->>'year_level' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    year_level = EXCLUDED.year_level,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
