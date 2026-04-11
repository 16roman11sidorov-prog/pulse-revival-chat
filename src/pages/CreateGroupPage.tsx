import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Check, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  status: string;
}

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"members" | "info">("members");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const toggleUser = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ type: "group", name: groupName.trim(), created_by: user!.id })
        .select()
        .single();

      if (conv) {
        const members = [user!.id, ...selected].map((uid) => ({
          conversation_id: conv.id,
          user_id: uid,
          role: uid === user!.id ? "admin" : "member",
        }));
        await supabase.from("conversation_members").insert(members);
        navigate(`/chat/${conv.id}`);
      }
    } catch {
      toast.error("Ошибка создания группы");
    } finally {
      setCreating(false);
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
          <button
            onClick={() => (step === "info" ? setStep("members") : navigate("/chats"))}
            className="rounded-full p-1 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">
            {step === "members" ? "Выберите участников" : "Создание группы"}
          </h1>
          {step === "members" && selected.length > 0 && (
            <button
              onClick={() => setStep("info")}
              className="ml-auto text-sm font-semibold text-primary"
            >
              Далее ({selected.length})
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted border-0"
          />
        </div>
      </div>

      {step === "members" ? (
        <>
          {selected.length > 0 && (
            <div className="flex gap-2 px-4 py-2 overflow-x-auto">
              {selected.map((uid) => {
                const u = users.find((x) => x.user_id === uid);
                return (
                  <button
                    key={uid}
                    onClick={() => toggleUser(uid)}
                    className="flex flex-col items-center gap-1 min-w-[60px]"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="gradient-pulse text-white text-xs font-bold">
                        {(u?.display_name || u?.username || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                      {u?.display_name || u?.username}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-col">
            {filtered.map((u, i) => {
              const isSelected = selected.includes(u.user_id);
              return (
                <motion.button
                  key={u.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => toggleUser(u.user_id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="gradient-pulse text-white font-bold">
                      {(u.display_name || u.username || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Название группы"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-lg font-semibold"
                autoFocus
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Участников: {selected.length + 1} (включая вас)
          </p>
          <Button
            onClick={createGroup}
            disabled={!groupName.trim() || creating}
            className="w-full gradient-pulse text-white"
          >
            {creating ? "Создание..." : "Создать группу"}
          </Button>
        </div>
      )}
    </div>
  );
}
