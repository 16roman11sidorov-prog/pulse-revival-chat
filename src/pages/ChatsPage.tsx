import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Edit, Plus, Users, Megaphone, Bot, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  status: string;
  unread: number;
  type: string;
}

interface BotItem {
  id: string;
  name: string;
  username: string;
  description: string | null;
  is_active: boolean;
}

type Tab = "chats" | "groups" | "channels" | "bots";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "chats", label: "Чаты", icon: <MessageCircle className="h-4 w-4" /> },
  { key: "groups", label: "Группы", icon: <Users className="h-4 w-4" /> },
  { key: "channels", label: "Каналы", icon: <Megaphone className="h-4 w-4" /> },
  { key: "bots", label: "Боты", icon: <Bot className="h-4 w-4" /> },
];

function ChatSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-44" />
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("chats");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [bots, setBots] = useState<BotItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadConversations(), loadBots()]).then(() => setLoading(false));

    // Subscribe to new messages for real-time chat list updates
    const existing = supabase.getChannels().find(c => c.topic === 'realtime:chats-realtime');
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel("chats-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadConversations = async () => {
    try {
      // 1. Get all memberships in one query
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (!memberships?.length) {
        setConversations([]);
        return;
      }

      const convIds = memberships.map((m) => m.conversation_id);

      // 2. Fetch conversations + all members + last messages in parallel
      const [convsRes, allMembersRes, allMessagesRes] = await Promise.all([
        supabase.from("conversations").select("*").in("id", convIds),
        supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds),
        supabase.from("messages").select("conversation_id, content, created_at").in("conversation_id", convIds).order("created_at", { ascending: false }),
      ]);

      const convs = convsRes.data || [];
      const allMembers = allMembersRes.data || [];
      const allMessages = allMessagesRes.data || [];

      // Build last message map (first occurrence per conv since ordered desc)
      const lastMsgMap = new Map<string, { content: string; created_at: string }>();
      for (const msg of allMessages) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg);
        }
      }

      // Find partner user IDs for direct chats
      const partnerUserIds = new Set<string>();
      const partnerMap = new Map<string, string>(); // convId -> partnerId
      for (const conv of convs) {
        if (conv.type === "direct") {
          const partner = allMembers.find(
            (m) => m.conversation_id === conv.id && m.user_id !== user!.id
          );
          if (partner) {
            partnerUserIds.add(partner.user_id);
            partnerMap.set(conv.id, partner.user_id);
          }
        }
      }

      // 3. Batch fetch all partner profiles
      let profileMap = new Map<string, { display_name: string | null; username: string | null; status: string }>();
      if (partnerUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, status")
          .in("user_id", [...partnerUserIds]);
        for (const p of profiles || []) {
          profileMap.set(p.user_id, p);
        }
      }

      // 4. Build items
      const items: ConversationItem[] = convs.map((conv) => {
        let name = conv.name || "Чат";
        let status = "offline";

        if (conv.type === "direct") {
          const partnerId = partnerMap.get(conv.id);
          if (partnerId) {
            const profile = profileMap.get(partnerId);
            if (profile) {
              name = profile.display_name || profile.username || "Пользователь";
              status = profile.status;
            }
          }
        }

        const lastMsg = lastMsgMap.get(conv.id);
        return {
          id: conv.id,
          name,
          avatar: name[0],
          lastMessage: lastMsg?.content || "Нет сообщений",
          time: lastMsg ? formatTime(lastMsg.created_at) : "",
          status,
          unread: 0,
          type: conv.type,
        };
      });

      // Sort by last message time
      items.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return b.time.localeCompare(a.time);
      });

      setConversations(items);
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const loadBots = async () => {
    const { data } = await supabase.from("bots").select("*").eq("is_active", true);
    setBots((data as BotItem[]) || []);
  };

  const filteredConvs = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      if (tab === "chats") return c.type === "direct" && matchSearch;
      if (tab === "groups") return c.type === "group" && matchSearch;
      if (tab === "channels") return c.type === "channel" && matchSearch;
      return false;
    });
  }, [conversations, search, tab]);

  const filteredBots = useMemo(() => {
    return bots.filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [bots, search]);

  const handleFabClick = () => {
    if (tab === "chats") navigate("/new-chat");
    else if (tab === "groups") navigate("/create-group");
    else if (tab === "channels") navigate("/create-channel");
    else if (tab === "bots") navigate("/botfather");
  };

  const getConvIcon = (type: string) => {
    if (type === "group") return <Users className="h-5 w-5" />;
    if (type === "channel") return <Megaphone className="h-5 w-5" />;
    return null;
  };

  return (
    <div className="flex flex-col pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black">Pulse</h1>
          <button className="rounded-full p-2 hover:bg-muted transition-colors">
            <Edit className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1 mb-3 rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all relative",
                tab === t.key
                  ? "text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.key && (
                <motion.div
                  layoutId="chatTab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                {t.icon}
                {t.label}
              </span>
            </button>
          ))}
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

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            {[...Array(6)].map((_, i) => (
              <ChatSkeleton key={i} />
            ))}
          </motion.div>
        ) : tab === "bots" ? (
          <motion.div
            key="bots"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate("/botfather")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left active:scale-[0.98]"
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-500 text-white font-bold">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">BotFather</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    официальный
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Создайте своего бота</p>
              </div>
            </motion.button>

            {filteredBots.map((bot, i) => (
              <motion.button
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.04 }}
                onClick={() => navigate(`/bot/${bot.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left active:scale-[0.98]"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-500/80 text-white font-bold">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{bot.name}</span>
                  <p className="text-sm text-muted-foreground truncate">
                    @{bot.username} · {bot.description || "Бот"}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : filteredConvs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <p className="text-muted-foreground text-sm">
              {tab === "chats" && "Пока нет чатов"}
              {tab === "groups" && "Пока нет групп"}
              {tab === "channels" && "Пока нет каналов"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Нажмите + чтобы создать</p>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {filteredConvs.map((chat, i) => (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left active:scale-[0.98]"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="gradient-pulse text-white font-bold">
                      {getConvIcon(chat.type) || chat.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {chat.type === "direct" && chat.status === "online" && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-[hsl(var(--online))]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{chat.name}</span>
                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate pr-2">{chat.lastMessage}</p>
                    {chat.unread > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] gradient-pulse text-white border-0 flex items-center justify-center">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-pulse shadow-lg shadow-primary/30"
        onClick={handleFabClick}
      >
        <Plus className="h-6 w-6 text-white" />
      </motion.button>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return date.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Вчера";
  if (days < 7) return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][date.getDay()];
  return date.toLocaleDateString("ru", { day: "numeric", month: "short" });
}
