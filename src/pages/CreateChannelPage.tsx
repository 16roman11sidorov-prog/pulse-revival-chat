import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CreateChannelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const createChannel = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({
          type: "channel",
          name: name.trim(),
          created_by: user!.id,
        })
        .select()
        .single();

      if (conv) {
        await supabase.from("conversation_members").insert({
          conversation_id: conv.id,
          user_id: user!.id,
          role: "admin",
        });
        // Store description as first message
        if (description.trim()) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: user!.id,
            content: description.trim(),
            message_type: "text",
          });
        }
        navigate(`/chat/${conv.id}`);
      }
    } catch {
      toast.error("Ошибка создания канала");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/chats")} className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Создать канал</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Megaphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Название канала"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>
        </div>

        <Textarea
          placeholder="Описание канала (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <p className="text-xs text-muted-foreground">
          В канале только вы можете публиковать — остальные будут подписчиками.
        </p>

        <Button
          onClick={createChannel}
          disabled={!name.trim() || creating}
          className="w-full gradient-pulse text-white"
        >
          {creating ? "Создание..." : "Создать канал"}
        </Button>
      </div>
    </div>
  );
}
