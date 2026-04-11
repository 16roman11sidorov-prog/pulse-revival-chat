import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  status: string;
}

export default function NewChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, status")
      .neq("user_id", user!.id);
    setUsers(data || []);
    setLoading(false);
  };

  const startChat = async (otherUserId: string) => {
    // Check if direct conversation already exists using a more efficient approach
    const { data: myConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (myConvs?.length) {
      const convIds = myConvs.map((m) => m.conversation_id);
      
      // Batch check: find the other user's memberships in our conversations
      const { data: otherMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", convIds);

      if (otherMemberships?.length) {
        // Verify it's a direct conversation
        const { data: directConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("type", "direct")
          .in("id", otherMemberships.map((m) => m.conversation_id))
          .limit(1)
          .single();

        if (directConv) {
          navigate(`/chat/${directConv.id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: user!.id })
      .select()
      .single();

    if (conv) {
      await supabase.from("conversation_members").insert([
        { conversation_id: conv.id, user_id: user!.id },
        { conversation_id: conv.id, user_id: otherUserId },
      ]);
      navigate(`/chat/${conv.id}`);
    }
  };

  const filtered = users.filter(
    (u) =>
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/chats")} className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Новый чат</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск пользователей..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted border-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Пользователи не найдены
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((u, i) => (
            <motion.button
              key={u.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => startChat(u.user_id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="gradient-pulse text-white font-bold">
                    {(u.display_name || u.username || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                {u.status === "online" && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-[hsl(var(--online))]" />
                )}
              </div>
              <div>
                <p className="font-semibold">{u.display_name || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
