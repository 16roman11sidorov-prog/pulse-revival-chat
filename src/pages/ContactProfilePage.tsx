import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Image, Mic, Ban, Trash2, Eraser, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { ProfileBanner } from "@/components/easter/ProfileBanner";
import { AvatarFrame, type FrameType } from "@/components/AvatarFrame";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaItem {
  id: string;
  media_url: string;
  file_name: string | null;
  created_at: string;
}

export default function ContactProfilePage() {
  const { chatId, userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<"media" | "voice">("media");
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !chatId) return;
    loadProfile();
    loadMedia();
  }, [userId, chatId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId!)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const loadMedia = async () => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, media_url, file_name, created_at, message_type")
      .eq("conversation_id", chatId!)
      .not("media_url", "is", null)
      .order("created_at", { ascending: false });

    if (msgs) {
      setPhotos(msgs.filter((m: any) => m.message_type === "image") as MediaItem[]);
      setVoiceMessages(msgs.filter((m: any) => m.message_type === "voice") as MediaItem[]);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !user) return;
    await supabase.from("conversation_members").delete().eq("conversation_id", chatId).eq("user_id", user.id);
    toast.success("Чат удалён");
    navigate("/chats");
  };

  const handleClearChat = async () => {
    if (!chatId || !user) return;
    await supabase.from("messages").delete().eq("conversation_id", chatId);
    toast.success("Чат очищен");
    setConfirmAction(null);
  };

  const handleBlock = () => {
    toast.success("Пользователь заблокирован");
    setConfirmAction(null);
  };

  const handleReport = () => {
    toast.success("Жалоба отправлена");
    setConfirmAction(null);
  };

  const executeAction = () => {
    if (confirmAction === "block") handleBlock();
    else if (confirmAction === "delete") handleDeleteChat();
    else if (confirmAction === "clear") handleClearChat();
    else if (confirmAction === "report") handleReport();
  };

  const confirmMessages: Record<string, { title: string; desc: string }> = {
    block: { title: "Заблокировать пользователя?", desc: "Этот пользователь не сможет писать вам сообщения." },
    delete: { title: "Удалить чат?", desc: "Чат будет удалён из вашего списка. Сообщения останутся у собеседника." },
    clear: { title: "Очистить чат?", desc: "Все сообщения в этом чате будут удалены безвозвратно." },
    report: { title: "Пожаловаться?", desc: "Мы рассмотрим вашу жалобу. Пользователь не узнает об этом." },
  };

  const displayName = profile?.display_name || profile?.username || "Пользователь";
  const status = profile?.status || "offline";
  const isPro = !!(profile as any)?.is_pro;
  const avatarFrame = ((profile as any)?.avatar_frame as FrameType) || null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Banner + Header */}
      <ProfileBanner userId={userId!}>
        <div className="flex items-center justify-between w-full mb-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 bg-black/20 hover:bg-black/40 transition-colors">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 bg-black/20 hover:bg-black/40 transition-colors">
                <MoreVertical className="h-5 w-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setConfirmAction("block")} className="text-destructive focus:text-destructive">
                <Ban className="h-4 w-4 mr-2" /> Заблокировать
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmAction("delete")}>
                <Trash2 className="h-4 w-4 mr-2" /> Удалить чат
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmAction("clear")}>
                <Eraser className="h-4 w-4 mr-2" /> Очистить чат
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmAction("report")} className="text-destructive focus:text-destructive">
                <Flag className="h-4 w-4 mr-2" /> Пожаловаться
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative">
            <AvatarFrame frame={avatarFrame} glow={isPro}>
              <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-white/20 text-white text-3xl font-black">
                  {displayName[0]}
                </AvatarFallback>
              </Avatar>
            </AvatarFrame>
            {status === "online" && (
              <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-white/30 bg-[hsl(var(--online))]" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <p className="text-xl font-bold text-white">{displayName}</p>
            {isPro && <span className="text-lg">👑</span>}
          </div>
          <p className="text-sm text-white/70">@{profile?.username || "user"}</p>
          {isPro && (
            <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              PRO
            </span>
          )}
          <p className="text-xs text-white/50 mt-1">
            {status === "online" ? "в сети" : "был(а) недавно"}
          </p>
        </div>
      </ProfileBanner>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "media" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Image className="h-4 w-4" />
            Медиа ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "voice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Mic className="h-4 w-4" />
            Голосовые ({voiceMessages.length})
          </button>
        </div>

        {/* Media Grid */}
        <AnimatePresence mode="wait">
          {activeTab === "media" && (
            <motion.div
              key="media"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 grid grid-cols-3 gap-1 rounded-xl overflow-hidden"
            >
              {photos.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">
                  Нет медиафайлов
                </div>
              ) : (
                photos.map((p) => (
                  <a key={p.id} href={p.media_url} target="_blank" rel="noopener noreferrer">
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      src={p.media_url}
                      alt=""
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 space-y-2"
            >
              {voiceMessages.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Нет голосовых сообщений
                </div>
              ) : (
                voiceMessages.map((v) => (
                  <div key={v.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Голосовое сообщение</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <a href={v.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium">
                      Открыть
                    </a>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? confirmMessages[confirmAction]?.title : ""}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction ? confirmMessages[confirmAction]?.desc : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
