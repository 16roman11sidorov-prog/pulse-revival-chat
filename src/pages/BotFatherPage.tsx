import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Bot } from "lucide-react";
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

type Step = "idle" | "name" | "username" | "description" | "confirm";

export default function BotFatherPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "👋 Я BotFather — бот для создания ботов!\n\nДоступные команды:\n/newbot — создать нового бота\n/mybots — мои боты\n/help — справка",
      isOwn: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [botData, setBotData] = useState({ name: "", username: "", description: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addBotMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), content, isOwn: false },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), content: text, isOwn: true },
    ]);

    // Handle commands in idle state
    if (step === "idle") {
      if (text === "/newbot") {
        setStep("name");
        setTimeout(() => addBotMessage("Отлично! Давайте создадим нового бота.\n\nВведите имя бота (отображаемое название):"), 300);
      } else if (text === "/mybots") {
        const { data: bots } = await supabase
          .from("bots")
          .select("*")
          .eq("owner_id", user!.id);

        if (bots?.length) {
          const list = bots
            .map((b: any) => `🤖 *${b.name}* (@${b.username})\n   ${b.description || "Без описания"}`)
            .join("\n\n");
          setTimeout(() => addBotMessage(`Ваши боты:\n\n${list}\n\nДля настройки команд перейдите в профиль бота.`), 300);
        } else {
          setTimeout(() => addBotMessage("У вас пока нет ботов. Используйте /newbot чтобы создать."), 300);
        }
      } else if (text === "/help") {
        setTimeout(
          () =>
            addBotMessage(
              "📖 Справка по BotFather:\n\n/newbot — создать нового бота\n/mybots — список ваших ботов\n\nПосле создания бота вы сможете:\n• Настроить команды\n• Включить ИИ-ответы\n• Задать описание и аватарку"
            ),
          300
        );
      } else {
        setTimeout(() => addBotMessage("Неизвестная команда. Введите /help для справки."), 300);
      }
      return;
    }

    // Bot creation flow
    if (step === "name") {
      setBotData((prev) => ({ ...prev, name: text }));
      setStep("username");
      setTimeout(
        () =>
          addBotMessage(
            `Имя: ${text} ✅\n\nТеперь введите username бота (латиницей, без пробелов, должен заканчиваться на "bot"):`
          ),
        300
      );
    } else if (step === "username") {
      const username = text.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!username.endsWith("bot")) {
        setTimeout(() => addBotMessage('Username должен заканчиваться на "bot". Попробуйте ещё раз:'), 300);
        return;
      }
      // Check uniqueness
      const { data: existing } = await supabase
        .from("bots")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existing) {
        setTimeout(() => addBotMessage("Этот username уже занят. Попробуйте другой:"), 300);
        return;
      }
      setBotData((prev) => ({ ...prev, username }));
      setStep("description");
      setTimeout(
        () => addBotMessage(`Username: @${username} ✅\n\nВведите описание бота (что он делает):`),
        300
      );
    } else if (step === "description") {
      setBotData((prev) => ({ ...prev, description: text }));
      setStep("confirm");
      setTimeout(
        () =>
          addBotMessage(
            `Описание добавлено ✅\n\n📋 Ваш бот:\n• Имя: ${botData.name}\n• Username: @${botData.username}\n• Описание: ${text}\n\nСоздать бота? (да/нет)`
          ),
        300
      );
    } else if (step === "confirm") {
      if (text.toLowerCase() === "да" || text.toLowerCase() === "yes") {
        try {
          const { data: bot, error } = await supabase
            .from("bots")
            .insert({
              owner_id: user!.id,
              name: botData.name,
              username: botData.username,
              description: botData.description,
            })
            .select()
            .single();

          if (error) throw error;

          // Create default commands
          await supabase.from("bot_commands").insert([
            {
              bot_id: bot.id,
              command: "/start",
              description: "Начать диалог",
              response_text: `Привет! Я ${botData.name}. ${botData.description}`,
            },
            {
              bot_id: bot.id,
              command: "/help",
              description: "Помощь",
              response_text: "Доступные команды:\n/start — начать\n/help — помощь",
            },
          ]);

          setTimeout(
            () =>
              addBotMessage(
                `🎉 Бот @${botData.username} успешно создан!\n\nТеперь вы можете:\n• Перейти в настройки бота для добавления команд\n• Включить ИИ-ответы\n\nИспользуйте /mybots чтобы увидеть список ваших ботов.`
              ),
            300
          );
        } catch (err) {
          toast.error("Ошибка создания бота");
          setTimeout(() => addBotMessage("Произошла ошибка. Попробуйте снова с /newbot"), 300);
        }
        setStep("idle");
        setBotData({ name: "", username: "", description: "" });
      } else {
        setStep("idle");
        setBotData({ name: "", username: "", description: "" });
        setTimeout(() => addBotMessage("Создание отменено. Введите /newbot чтобы начать заново."), 300);
      }
    }
  };

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
          <p className="font-semibold text-sm">BotFather</p>
          <p className="text-xs text-muted-foreground">бот</p>
        </div>
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
              placeholder={step === "idle" ? "Введите команду..." : "Введите ответ..."}
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
