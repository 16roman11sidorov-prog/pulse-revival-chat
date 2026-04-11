
-- Bots table
CREATE TABLE public.bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bots" ON public.bots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can create bots" ON public.bots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own bots" ON public.bots
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own bots" ON public.bots
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Bot commands table
CREATE TABLE public.bot_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  description TEXT,
  response_text TEXT,
  use_ai BOOLEAN NOT NULL DEFAULT false,
  ai_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bot_id, command)
);

ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bot commands" ON public.bot_commands
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bot owners can create commands" ON public.bot_commands
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots WHERE id = bot_id AND owner_id = auth.uid()));

CREATE POLICY "Bot owners can update commands" ON public.bot_commands
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots WHERE id = bot_id AND owner_id = auth.uid()));

CREATE POLICY "Bot owners can delete commands" ON public.bot_commands
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots WHERE id = bot_id AND owner_id = auth.uid()));

-- Trigger for updated_at on bots
CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_commands_updated_at
  BEFORE UPDATE ON public.bot_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
