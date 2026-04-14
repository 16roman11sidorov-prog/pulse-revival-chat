
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  pro_expires_at TIMESTAMP WITH TIME ZONE,
  avatar_frame TEXT,
  who_can_see_avatar TEXT DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Auto-expire pro
CREATE OR REPLACE FUNCTION public.check_pro_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_pro = true AND NEW.pro_expires_at IS NOT NULL AND NEW.pro_expires_at < now() THEN
    NEW.is_pro := false;
    NEW.pro_expires_at := NULL;
    NEW.avatar_frame := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_pro_expiry_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_pro_expiry();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Pro requests table
CREATE TABLE public.pro_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create pro requests"
ON public.pro_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
ON public.pro_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admin function
CREATE OR REPLACE FUNCTION public.is_pulse_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = '16roman11sidorov@gmail.com'
  )
$$;

CREATE POLICY "Admin can view all pro requests"
ON public.pro_requests FOR SELECT TO authenticated
USING (public.is_pulse_admin());

CREATE POLICY "Admin can update pro requests"
ON public.pro_requests FOR UPDATE TO authenticated
USING (public.is_pulse_admin());

-- Grant pro function
CREATE OR REPLACE FUNCTION public.grant_pro(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_pulse_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.profiles 
  SET is_pro = true, pro_expires_at = now() + interval '30 days'
  WHERE user_id = target_user_id;
END;
$$;
