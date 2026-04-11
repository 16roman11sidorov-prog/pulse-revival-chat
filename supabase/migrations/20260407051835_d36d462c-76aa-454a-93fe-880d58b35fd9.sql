CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_creator(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE id = _conversation_id
      AND created_by = _user_id
  );
$$;

DROP POLICY IF EXISTS "Members can view membership" ON public.conversation_members;
CREATE POLICY "Members can view membership"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Conversation creators can add members" ON public.conversation_members;
CREATE POLICY "Conversation creators can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_conversation_creator(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));