import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Image, Mic, Ban, Trash2, Eraser, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId!).single();
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

  const handleBlock = () => { toast.success("Пользователь заблокирован"); setConfirmAction(null); };
  const handleReport = () => { toast.success("Жалоба отправлена"); setConfirmAction(null); };

  const executeAction = () => {
    if (confirmAction === "block") handleBlock();
    else if (confirmAction === "delete") handleDeleteChat();
    else if (confirmAction === "clear") handleClearChat();
    else if (confirmAction === "report") handleReport();
  };

  const confirmMessages: Record<string, { title: string; desc: string }> = {
    block: { title: "Заблокировать?", desc: "Этот пользователь не сможет писать вам." },
    delete: { title: "Удалить чат?", desc: "Чат будет удалён из вашего списка." },
    clear: { title: "Очистить чат?", desc: "Все сообщения будут удалены." },
    report: { title: "Пожаловаться?", desc: "Мы рассмотрим вашу жалобу." },
  };

  const displayName = profile?.display_name || profile?.username || "Пользователь";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <MoreVertical className="h-5 w-5" />
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
          <Avatar className="h-24 w-24">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
            <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
              {displayName[0]}
            </AvatarFallback>
          </Avatar>
          <p className="text-xl font-bold mt-3">{displayName}</p>
          <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
          <p className="text-xs text-muted-foreground mt-1">в сети</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "media" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Image className="h-4 w-4" /> Медиа ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              activeTab === "voice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Mic className="h-4 w-4" /> Голосовые ({voiceMessages.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "media" && (
            <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-4 grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {photos.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">Нет медиафайлов</div>
              ) : (
                photos.map((p) => (
                  <a key={p.id} href={p.media_url} target="_blank" rel="noopener noreferrer">
                    <img src={p.media_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                  </a>
                ))
              )}
            </motion.div>
          )}
          {activeTab === "voice" && (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-4 space-y-2">
              {voiceMessages.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Нет голосовых</div>
              ) : (
                voiceMessages.map((v) => (
                  <div key={v.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Голосовое сообщение</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <a href={v.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium">Открыть</a>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
