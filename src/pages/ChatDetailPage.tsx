import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Smile, Mic, Send, Phone, Video, MoreVertical, X, FileText, Loader2, Square } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VoicePlayer from "@/components/VoicePlayer";

interface MessageItem {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  isOwn: boolean;
  media_url?: string | null;
  file_name?: string | null;
  message_type: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return data.publicUrl;
}

export default function ChatDetailPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [partnerName, setPartnerName] = useState("Чат");
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [partnerStatus, setPartnerStatus] = useState("offline");
  const [convType, setConvType] = useState("direct");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || !chatId) return;
    loadMessages();
    loadPartnerInfo();

    const existingMsg = supabase.getChannels().find(c => c.topic === `realtime:messages:${chatId}`);
    if (existingMsg) supabase.removeChannel(existingMsg);
    const existingTyping = supabase.getChannels().find(c => c.topic === `realtime:typing:${chatId}`);
    if (existingTyping) supabase.removeChannel(existingTyping);

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${chatId}` },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id, content: msg.content, sender_id: msg.sender_id,
                created_at: msg.created_at, isOwn: msg.sender_id === user.id,
                media_url: msg.media_url, file_name: msg.file_name, message_type: msg.message_type,
              },
            ];
          });
        }
      )
      .subscribe();

    const typingChannel = supabase.channel(`typing:${chatId}`);
    typingChannelRef.current = typingChannel;
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== user.id) {
          setIsPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 2500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", chatId!)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map((m: any) => ({ ...m, isOwn: m.sender_id === user!.id })));
    }
  };

  const loadPartnerInfo = async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", chatId!)
      .single();

    if (conv) {
      setConvType(conv.type);
      if (conv.type === "group" || conv.type === "channel") {
        setPartnerName(conv.name || (conv.type === "group" ? "Группа" : "Канал"));
        const { data: membership } = await supabase
          .from("conversation_members")
          .select("role")
          .eq("conversation_id", chatId!)
          .eq("user_id", user!.id)
          .single();
        setIsAdmin(membership?.role === "admin");
        const { count } = await supabase
          .from("conversation_members")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", chatId!);
        setPartnerStatus(`${count || 0} участников`);
        return;
      }
    }

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", chatId!)
      .neq("user_id", user!.id);
    if (members?.[0]) {
      setPartnerId(members[0].user_id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", members[0].user_id)
        .single();
      if (profile) {
        setPartnerName((profile as any).display_name || (profile as any).username || "Пользователь");
        setPartnerStatus("online");
        setPartnerAvatar((profile as any).avatar_url || null);
      }
    }
  };

  const broadcastTyping = () => {
    typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    broadcastTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error("Файл слишком большой (макс. 10 МБ)"); return; }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setFilePreview(null); }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File, ext?: string): Promise<string> => {
    const fileExt = ext || file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${chatId}/${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) { setIsRecording(false); return; }

        setIsUploading(true);
        try {
          const file = new File([blob], "voice.webm", { type: "audio/webm" });
          const path = await uploadFile(file, "webm");
          const media_url = getPublicUrl(path);

          await supabase.from("messages").insert({
            conversation_id: chatId!,
            sender_id: user!.id,
            content: "🎤 Голосовое сообщение",
            message_type: "voice",
            media_url,
            file_name: "voice.webm",
          } as any);
        } catch (err) {
          toast.error("Ошибка отправки голосового сообщения");
          console.error(err);
        } finally {
          setIsUploading(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch {
      toast.error("Не удалось получить доступ к микрофону");
    }
  }, [chatId, user]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.ondataavailable = null;
      mr.onstop = () => {
        // @ts-ignore
        mr.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      };
      mr.stop();
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || !user) return;
    const text = input;
    const file = selectedFile;
    setInput("");
    clearSelectedFile();

    try {
      let media_url: string | null = null;
      let file_name: string | null = null;
      let message_type = "text";

      if (file) {
        setIsUploading(true);
        const path = await uploadFile(file);
        media_url = getPublicUrl(path);
        file_name = file.name;
        message_type = file.type.startsWith("image/") ? "image" : "file";
      }

      await supabase.from("messages").insert({
        conversation_id: chatId!, sender_id: user.id,
        content: text || (message_type === "image" ? "📷 Фото" : `📎 ${file_name}`),
        message_type, media_url, file_name,
      } as any);
    } catch (err) {
      toast.error("Ошибка отправки файла");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const renderMessageContent = (msg: MessageItem) => {
    const isImage = msg.message_type === "image" && msg.media_url;
    const isFile = msg.message_type === "file" && msg.media_url;
    const isVoice = msg.message_type === "voice" && msg.media_url;

    return (
      <>
        {isVoice && <VoicePlayer src={msg.media_url!} isOwn={msg.isOwn} />}
        {isImage && (
          <a href={msg.media_url!} target="_blank" rel="noopener noreferrer" className="block mb-1">
            <img src={msg.media_url!} alt={msg.file_name || "Фото"} className="max-w-full rounded-lg max-h-60 object-cover" loading="lazy" />
          </a>
        )}
        {isFile && (
          <a href={msg.media_url!} target="_blank" rel="noopener noreferrer"
            className={cn("flex items-center gap-2 mb-1 px-3 py-2 rounded-lg", msg.isOwn ? "bg-white/10" : "bg-black/5 dark:bg-white/5")}>
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate text-xs font-medium">{msg.file_name || "Файл"}</span>
          </a>
        )}
        {!isVoice && msg.content && !(isImage && msg.content === "📷 Фото") && !(isFile && msg.content === `📎 ${msg.file_name}`) && (
          <p className="text-[15px] leading-relaxed">{msg.content}</p>
        )}
        {!isVoice && (
          <p className={cn("mt-0.5 text-[10px]", msg.isOwn ? "text-white/60" : "text-muted-foreground")}>
            {new Date(msg.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card/90 px-2 py-2 backdrop-blur-xl">
        <button onClick={() => navigate("/chats")} className="flex items-center gap-1 text-primary px-1">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Назад</span>
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <button
            onClick={() => convType === "direct" && partnerId && navigate(`/contact/${chatId}/${partnerId}`)}
            disabled={convType !== "direct" || !partnerId}
            className="flex flex-col items-center"
          >
            <p className="font-semibold text-sm">{partnerName}</p>
            {isPartnerTyping ? (
              <p className="text-[11px] text-primary font-medium">печатает...</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {convType === "direct" ? (partnerStatus === "online" ? "в сети" : "был(а) недавно") : partnerStatus}
              </p>
            )}
          </button>
        </div>
        <button
          onClick={() => convType === "direct" && partnerId && navigate(`/contact/${chatId}/${partnerId}`)}
          disabled={convType !== "direct" || !partnerId}
        >
          <Avatar className="h-8 w-8">
            {convType === "direct" && partnerAvatar ? (
              <AvatarImage src={partnerAvatar} alt={partnerName} />
            ) : null}
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {partnerName[0]}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {messages.map((msg, i) => {
          const showAvatar = !msg.isOwn && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id} className={cn("flex", msg.isOwn ? "justify-end" : "justify-start")}>
              {!msg.isOwn && (
                <div className="w-8 mr-1.5 flex-shrink-0">
                  {showAvatar && convType !== "direct" ? (
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {msg.sender_id.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
              )}
              <div className={cn(
                "max-w-[75%] px-3 py-2 text-sm",
                msg.isOwn
                  ? "bg-[hsl(var(--bubble-own))] text-[hsl(var(--bubble-own-foreground))] rounded-2xl rounded-br-md"
                  : "bg-[hsl(var(--bubble-other))] text-[hsl(var(--bubble-other-foreground))] rounded-2xl rounded-bl-md"
              )}>
                {renderMessageContent(msg)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-card/80 px-3 pt-2 overflow-hidden">
            <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} КБ</p>
              </div>
              <button onClick={clearSelectedFile} className="rounded-full p-1 hover:bg-background">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {convType === "channel" && !isAdmin ? (
        <div className="border-t border-border bg-card/80 px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">Только администратор может публиковать</p>
        </div>
      ) : (
      <div className="border-t border-border bg-card/90 px-3 py-2 backdrop-blur-xl">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" className="hidden" onChange={handleFileSelect} />

        {isRecording ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="rounded-full p-2 hover:bg-muted">
              <X className="h-5 w-5 text-destructive" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="h-3 w-3 rounded-full bg-destructive"
              />
              <span className="text-sm font-medium text-destructive">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-primary-foreground" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="rounded-full p-2 hover:bg-muted">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-1 relative">
              <input value={input} onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && !isUploading && handleSend()}
                placeholder="Сообщение"
                className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            {(input.trim() || selectedFile) ? (
              <button
                onClick={handleSend} disabled={isUploading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary disabled:opacity-50 active:scale-90 transition-transform">
                {isUploading ? <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" /> : <Send className="h-4 w-4 text-primary-foreground" />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
              >
                <Mic className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
