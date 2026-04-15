import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Image, Gift, Sparkles, Search, Pin, Star, Egg, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PRO_FEATURES = [
  { icon: "👑", title: "Золотой значок", desc: "Виден всем пользователям в профиле и чатах" },
  { icon: "🖼️", title: "Рамки для аватарки", desc: "5 эксклюзивных рамок: золотая, серебряная, неоновая, градиентная, анимированная" },
  { icon: "🎁", title: "Лимит подарков ×2", desc: "Отправляйте до 10 подарков вместо 5 за ивент" },
  { icon: "🎭", title: "Эксклюзивные реакции", desc: "Дополнительные эмодзи 🔥💎👑🌟💫 в чатах" },
  { icon: "✨", title: "Свечение аватарки", desc: "Анимированное свечение вокруг фото профиля" },
  { icon: "🔍", title: "Поиск по сообщениям", desc: "Находите любое сообщение внутри чата" },
  { icon: "📌", title: "Закреплённые сообщения", desc: "Закрепляйте важные сообщения в чате" },
  { icon: "⭐", title: "Приоритетная поддержка", desc: "Прямой чат с разработчиком @PulseAdmin" },
  { icon: "🥚", title: "Ранний доступ", desc: "Сезонные ивенты и эксклюзивные баннеры раньше всех" },
];

export default function ProPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Войдите в аккаунт");
      return;
    }
    if (!username.trim() || !email.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("pro_requests").insert({
      user_id: user.id,
      username: username.trim(),
      email: email.trim(),
    });

    if (error) {
      console.error("Pro request error:", error);
      toast.error("Ошибка отправки заявки: " + error.message);
    } else {
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Pulse Pro</h1>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 rounded-2xl overflow-hidden p-6 text-center"
        style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7)" }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-5xl mb-3"
        >
          👑
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-1">Pulse Pro</h2>
        <p className="text-white/80 text-sm mb-2">Премиум возможности мессенджера</p>
        <div className="inline-block rounded-full bg-white/20 px-4 py-1.5">
          <span className="text-white font-bold text-lg">99₽</span>
          <span className="text-white/70 text-sm">/месяц</span>
        </div>
      </motion.div>

      {/* Features */}
      <div className="px-4 mt-4 space-y-2">
        {PRO_FEATURES.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-xl bg-card border border-border p-3"
          >
            <span className="text-2xl">{f.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 mt-6">
        <Button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl py-6 text-base font-bold border-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
        >
          <Crown className="h-5 w-5 mr-2" />
          Оформить подписку
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Оформление Pulse Pro</DialogTitle>
            <DialogDescription>Заполните данные и оплатите подписку</DialogDescription>
          </DialogHeader>

          {!sent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Юзернейм</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@your_username"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full rounded-xl border-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Отправить заявку
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center py-4"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <p className="font-semibold">Заявка отправлена!</p>
              <div className="rounded-xl bg-muted p-4 text-left space-y-2">
                <p className="text-sm font-medium">Реквизиты для оплаты:</p>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-xs text-muted-foreground">Номер карты</p>
                  <p className="text-base font-mono font-bold tracking-wider">2204 3110 2573 5532</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-xs text-muted-foreground">Получатель</p>
                  <p className="text-sm font-semibold">Pulse</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-xs text-muted-foreground">Сумма</p>
                  <p className="text-sm font-semibold">99₽</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                После оплаты подписка будет активирована администратором в течение 24 часов
              </p>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
