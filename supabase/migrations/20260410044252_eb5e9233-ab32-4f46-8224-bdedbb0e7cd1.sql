ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS who_can_message text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_add_to_groups text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_see_profile text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_see_last_seen text NOT NULL DEFAULT 'everyone';