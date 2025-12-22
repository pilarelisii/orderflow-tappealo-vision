-- Function to create venue automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_venue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_prefix text;
BEGIN
  -- Extract prefix from email (e.g., "tibis" from "tibis@tappealo.com")
  email_prefix := split_part(NEW.email, '@', 1);
  
  -- Only create venue for @tappealo.com emails
  IF NEW.email LIKE '%@tappealo.com' THEN
    INSERT INTO public.venues (name, slug, user_id, enabled, service_active, primary_color)
    VALUES (
      initcap(email_prefix),  -- Capitalize first letter for name
      lower(email_prefix),     -- Lowercase for slug
      NEW.id,
      true,
      true,
      '#8B5CF6'
    )
    ON CONFLICT DO NOTHING;  -- Avoid error if venue already exists
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to run after user is created
DROP TRIGGER IF EXISTS on_auth_user_created_venue ON auth.users;
CREATE TRIGGER on_auth_user_created_venue
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_venue();