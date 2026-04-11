
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;

CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_conversation_member(id, auth.uid())
);
