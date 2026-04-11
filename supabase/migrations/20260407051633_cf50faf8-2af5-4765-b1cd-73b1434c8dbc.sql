
DROP POLICY "Members can view conversations" ON public.conversations;

CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );
