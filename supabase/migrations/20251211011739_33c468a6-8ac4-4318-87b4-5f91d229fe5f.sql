-- Function to sync profile role to user_roles table
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing role for this user
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Insert new role if role is valid
  IF NEW.role IS NOT NULL AND NEW.role != '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on profile insert
CREATE TRIGGER sync_role_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- Trigger on profile update (only when role changes)
CREATE TRIGGER sync_role_on_profile_update
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- Sync existing profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role FROM public.profiles 
WHERE role IS NOT NULL AND role != ''
ON CONFLICT (user_id, role) DO NOTHING;