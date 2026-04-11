import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Bot, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  isOwn: boolean;
}

export default function BotChatPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [commands, setCommands] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBot();
  }, [botId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadBot = async () => {
    const { data: botData } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId!)
      .single();

    if (!botData) {
      navigate("/chats");
      return;
    }
    setBot(botData);

    const { data: cmds } = await supabase
      .from("bot_commands")
      .select("*")
      .eq("bot_id", botId!);
    setCommands(cmds || []);

    // Auto send /start
    const startCmd = (cmds || []).find((c: any) => c.command === "/start");
    if (startCmd) {
      setMessages([
        { id: "start-user", content: "/start", isOwn: true },
        {
          id: "start-bot",
          content: startCmd.response_text || `Привет! Я ${botData.name}.`,
          isOwn: false,
        },
      ]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), content: text, isOwn: true }]);

    // Check for matching command
    const matchedCmd = commands.find((c: any) => c.command === text);

    if (matchedCmd) {
      if (matchedCmd.use_ai && matchedCmd.ai_prompt) {
        // Use AI
        setIsTyping(true);
        try {
          const { data, error } = await supabase.functions.invoke("bot-respond", {
            body: {
              prompt: matchedCmd.ai_prompt,
              userMessage: text,
              botName: bot.name,
            },
          });
          if (error) throw error;
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), content: data.response || "...", isOwn: false },
            ]);
            setIsTyping(false);
          }, 500);
        } catch {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), content: "Ошибка ИИ. Попробуйте позже.", isOwn: false },
          ]);
        }
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), content: matchedCmd.response_text || "...", isOwn: false },
          ]);
        }, 300);
      }
    } else {
      // Check if any command uses AI as fallback — find a command that's a catch-all or use default response
      const aiCmd = commands.find((c: any) => c.use_ai && c.command === "/chat");
      if (aiCmd) {
        setIsTyping(true);
        try {
          const { data, error } = await supabase.functions.invoke("bot-respond", {
            body: {
              prompt: aiCmd.ai_prompt,
              userMessage: text,
              botName: bot.name,
            },
          });
          if (error) throw error;
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), content: data.response || "...", isOwn: false },
            ]);
            setIsTyping(false);
          }, 500);
        } catch {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), content: "Ошибка ИИ.", isOwn: false },
          ]);
        }
      } else {
        setTimeout(() => {
          const cmdList = commands.map((c: any) => c.command).join(", ");
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              content: `Неизвестная команда. Доступные команды: ${cmdList || "/start, /help"}`,
              isOwn: false,
            },
          ]);
        }, 300);
      }
    }
  };

  if (!bot) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isOwner = bot.owner_id === user?.id;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card/80 px-3 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/chats")} className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-blue-500 text-white text-sm font-bold">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{bot.name}</p>
          <p className="text-xs text-muted-foreground">бот</p>
        </div>
        {isOwner && (
          <button
            onClick={() => navigate(`/bot/${botId}/settings`)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className={cn("flex", msg.isOwn ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                msg.isOwn
                  ? "bg-[hsl(var(--bubble-own))] text-[hsl(var(--bubble-own-foreground))] rounded-br-md"
                  : "bg-[hsl(var(--bubble-other))] text-[hsl(var(--bubble-other-foreground))] rounded-bl-md"
              )}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[hsl(var(--bubble-other))] px-4 py-3">
              <div className="flex gap-1">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="h-2 w-2 rounded-full bg-muted-foreground" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 rounded-full bg-muted-foreground" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="h-2 w-2 rounded-full bg-muted-foreground" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Сообщение..."
              className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {input.trim() && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.8 }}
              onClick={handleSend}
              className="flex h-10 w-10 items-center justify-center rounded-full gradient-pulse"
            >
              <Send className="h-4 w-4 text-white" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
