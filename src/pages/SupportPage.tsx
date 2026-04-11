import { useState, useRef, useEffect } from "react";
import { Send, Headset, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { streamChat } from "@/lib/stream-chat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface SupportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MSG: SupportMessage = {
  id: "welcome",
  role: "assistant",
  content: "Здравствуйте! 👋 Я бот поддержки Pulse. Помогу разобраться с любыми вопросами о мессенджере: настройка аккаунта, функции, решение проблем. Чем могу помочь?",
};

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load last support conversation
  useEffect(() => {
    if (!user) return;
    loadLastConversation();
  }, [user]);

  const loadLastConversation = async () => {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", user!.id)
      .eq("type", "support")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (conv) {
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("id, role, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      if (msgs?.length) {
        setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
        setConversationId(conv.id);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !user) return;
    const userMsg: SupportMessage = { id: `u-${Date.now()}`, role: "user", content: input };
    const newMessages = [...messages.filter(m => m.id !== "welcome"), userMsg];
    setMessages([...messages, userMsg]);
    setInput("");
    setIsStreaming(true);

    let convId = conversationId;

    if (!convId) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, type: "support", title: "Поддержка" })
        .select()
        .single();
      if (conv) {
        convId = conv.id;
        setConversationId(conv.id);
      }
    }

    if (convId) {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: input,
      });
    }

    let assistantContent = "";
    const assistantId = `s-${Date.now()}`;

    await streamChat({
      functionName: "pulse-support",
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantId) {
            return prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
        });
      },
      onDone: async () => {
        setIsStreaming(false);
        if (convId && assistantContent) {
          await supabase.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: assistantContent,
          });
        }
      },
      onError: (err) => {
        toast({ title: "Ошибка", description: err, variant: "destructive" });
        setIsStreaming(false);
      },
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
          <Headset className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <h1 className="text-base font-bold">Поддержка Pulse</h1>
          <p className="text-xs text-muted-foreground">Обычно отвечает мгновенно</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 mr-2 mt-1">
                <Headset className="h-3.5 w-3.5 text-green-500" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-[hsl(var(--bubble-own))] text-[hsl(var(--bubble-own-foreground))] rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              )}
            >
              <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
            </div>
          </motion.div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 mr-2 mt-1">
              <Headset className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div className="rounded-2xl bg-card border border-border px-4 py-3 rounded-bl-md">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 px-4 py-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Опишите вашу проблему..."
            disabled={isStreaming}
            className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const html = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
      .replace(/^- (.*)/, "• $1");
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}
