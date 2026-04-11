import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { streamChat } from "@/lib/stream-chat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MSG: AIMessage = {
  id: "welcome",
  role: "assistant",
  content: "Привет! 👋 Я **Pulse AI** — твой умный помощник на базе Gemini. Я могу помочь с чем угодно: ответить на вопросы, написать текст, перевести, помочь с кодом и многое другое. Просто спроси!",
};

export default function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history list
  useEffect(() => {
    if (!user) return;
    loadHistory();
    loadLastConversation();
  }, [user]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at")
      .eq("user_id", user!.id)
      .eq("type", "ai")
      .order("updated_at", { ascending: false });
    setHistory(data || []);
  };

  const loadLastConversation = async () => {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", user!.id)
      .eq("type", "ai")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (conv) {
      await loadConversation(conv.id);
    }
  };

  const loadConversation = async (id: string) => {
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("id, role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgs?.length) {
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      setConversationId(id);
    } else {
      setMessages([WELCOME_MSG]);
      setConversationId(id);
    }
    setShowHistory(false);
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([WELCOME_MSG]);
    setShowHistory(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("ai_conversations").delete().eq("id", id);
    if (conversationId === id) startNewChat();
    loadHistory();
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !user) return;
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: "user", content: input };
    const newMessages = [...messages.filter(m => m.id !== "welcome"), userMsg];
    setMessages([...messages, userMsg]);
    setInput("");
    setIsStreaming(true);

    let convId = conversationId;

    // Create conversation if needed
    if (!convId) {
      const title = input.slice(0, 80);
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, type: "ai", title })
        .select()
        .single();
      if (conv) {
        convId = conv.id;
        setConversationId(conv.id);
      }
    }

    // Save user message
    if (convId) {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: input,
      });
    }

    let assistantContent = "";
    const assistantId = `ai-${Date.now()}`;

    await streamChat({
      functionName: "pulse-ai",
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
        // Save assistant message
        if (convId && assistantContent) {
          await supabase.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: assistantContent,
          });
        }
        loadHistory();
      },
      onError: (err) => {
        toast({ title: "Ошибка AI", description: err, variant: "destructive" });
        setIsStreaming(false);
      },
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-pulse">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-black">Pulse AI</h1>
            <p className="text-xs text-muted-foreground">Gemini • Умный помощник</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            История
          </button>
          <button
            onClick={startNewChat}
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-border bg-card px-4 py-3 max-h-60 overflow-y-auto"
        >
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Нет сохранённых чатов</p>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadConversation(h.id)}
                className={cn(
                  "flex items-center justify-between w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm mb-1",
                  conversationId === h.id && "bg-muted"
                )}
              >
                <span className="truncate flex-1">{h.title || "Без названия"}</span>
                <button onClick={(e) => deleteConversation(h.id, e)} className="ml-2 p-1 hover:bg-destructive/10 rounded">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </button>
            ))
          )}
        </motion.div>
      )}

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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-pulse mr-2 mt-1">
                <Sparkles className="h-3.5 w-3.5 text-white" />
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
              <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(msg.content)}
              </div>
            </div>
          </motion.div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-pulse mr-2 mt-1">
              <Sparkles className="h-3.5 w-3.5 text-white" />
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
      <div className="border-t border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Спросите что-нибудь..."
            disabled={isStreaming}
            className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 items-center justify-center rounded-full gradient-pulse disabled:opacity-40"
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
    let html = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
      .replace(/^### (.*)/, "<h3 class='font-bold text-base mt-2'>$1</h3>")
      .replace(/^## (.*)/, "<h2 class='font-bold text-lg mt-2'>$1</h2>")
      .replace(/^# (.*)/, "<h1 class='font-bold text-xl mt-2'>$1</h1>")
      .replace(/^- (.*)/, "• $1");
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}
