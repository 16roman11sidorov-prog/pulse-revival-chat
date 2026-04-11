import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Bot, Sparkles, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BotCommand {
  id: string;
  command: string;
  description: string;
  response_text: string | null;
  use_ai: boolean;
  ai_prompt: string | null;
}

export default function BotSettingsPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCmd, setNewCmd] = useState({ command: "", description: "", response_text: "", use_ai: false, ai_prompt: "" });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadBot();
  }, [botId]);

  const loadBot = async () => {
    const { data: botData } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId!)
      .single();

    if (botData && botData.owner_id !== user!.id) {
      navigate("/chats");
      return;
    }

    setBot(botData);

    const { data: cmds } = await supabase
      .from("bot_commands")
      .select("*")
      .eq("bot_id", botId!)
      .order("created_at");

    setCommands((cmds as BotCommand[]) || []);
    setLoading(false);
  };

  const addCommand = async () => {
    if (!newCmd.command.startsWith("/")) {
      toast.error("Команда должна начинаться с /");
      return;
    }
    try {
      const { error } = await supabase.from("bot_commands").insert({
        bot_id: botId!,
        command: newCmd.command,
        description: newCmd.description,
        response_text: newCmd.use_ai ? null : newCmd.response_text,
        use_ai: newCmd.use_ai,
        ai_prompt: newCmd.use_ai ? newCmd.ai_prompt : null,
      });
      if (error) throw error;
      toast.success("Команда добавлена");
      setNewCmd({ command: "", description: "", response_text: "", use_ai: false, ai_prompt: "" });
      setShowAdd(false);
      loadBot();
    } catch {
      toast.error("Ошибка добавления команды");
    }
  };

  const deleteCommand = async (cmdId: string) => {
    await supabase.from("bot_commands").delete().eq("id", cmdId);
    setCommands((prev) => prev.filter((c) => c.id !== cmdId));
    toast.success("Команда удалена");
  };

  const updateBot = async (field: string, value: any) => {
    await supabase.from("bots").update({ [field]: value } as any).eq("id", botId!);
    setBot((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!bot) return null;

  return (
    <div className="flex flex-col min-h-screen pb-6">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/chats")} className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Настройки бота</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Bot info */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
            <Bot className="h-7 w-7 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{bot.name}</p>
            <p className="text-sm text-muted-foreground">@{bot.username}</p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted p-4">
          <div>
            <p className="font-medium text-sm">Активен</p>
            <p className="text-xs text-muted-foreground">Бот отвечает на сообщения</p>
          </div>
          <Switch
            checked={bot.is_active}
            onCheckedChange={(v) => updateBot("is_active", v)}
          />
        </div>

        {/* Commands */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">Команды</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(!showAdd)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl border border-border p-3 mb-3 space-y-3"
            >
              <Input
                placeholder="/command"
                value={newCmd.command}
                onChange={(e) => setNewCmd({ ...newCmd, command: e.target.value })}
              />
              <Input
                placeholder="Описание"
                value={newCmd.description}
                onChange={(e) => setNewCmd({ ...newCmd, description: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={newCmd.use_ai}
                  onCheckedChange={(v) => setNewCmd({ ...newCmd, use_ai: v })}
                />
                <span className="text-sm flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> ИИ-ответ
                </span>
              </div>
              {newCmd.use_ai ? (
                <Textarea
                  placeholder="Промпт для ИИ (как бот должен себя вести)"
                  value={newCmd.ai_prompt}
                  onChange={(e) => setNewCmd({ ...newCmd, ai_prompt: e.target.value })}
                  rows={3}
                />
              ) : (
                <Textarea
                  placeholder="Текст ответа"
                  value={newCmd.response_text}
                  onChange={(e) => setNewCmd({ ...newCmd, response_text: e.target.value })}
                  rows={3}
                />
              )}
              <Button onClick={addCommand} size="sm" className="w-full gap-1">
                <Save className="h-4 w-4" /> Сохранить
              </Button>
            </motion.div>
          )}

          <div className="space-y-2">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-start gap-3 rounded-xl bg-muted p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{cmd.command}</span>
                    {cmd.use_ai && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> ИИ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cmd.description}</p>
                  {cmd.response_text && (
                    <p className="text-xs mt-1 truncate">{cmd.response_text}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteCommand(cmd.id)}
                  className="rounded-full p-1.5 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
