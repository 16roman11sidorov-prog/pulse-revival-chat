
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, is_pro, pro_expires_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    CASE WHEN NEW.email = '16roman11sidorov@gmail.com' THEN true ELSE false END,
    CASE WHEN NEW.email = '16roman11sidorov@gmail.com' THEN '2099-12-31T23:59:59Z'::timestamptz ELSE NULL END
  );
  RETURN NEW;
END;
$function$;
