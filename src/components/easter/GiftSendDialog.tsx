import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "./AnimatedEgg";
import { isEasterEventActive, MAX_GIFTS_PER_USER } from "@/lib/easter-config";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Gift, AlertTriangle } from "lucide-react";

interface GiftSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
}

export function GiftSendDialog({ open, onOpenChange, receiverId, receiverName }: GiftSendDialogProps) {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [canSend, setCanSend] = useState(true);
  const [sentGiftId, setSentGiftId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadGiftsAndCheck();
    }
  }, [open, user]);

  async function loadGiftsAndCheck() {
    if (!user) return;

    const [{ data: giftTypes }, { data: sends }, { data: profile }] = await Promise.all([
      supabase.from("easter_gifts" as any).select("*"),
      supabase.from("gift_sends" as any).select("id").eq("sender_id", user.id),
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single(),
    ]);

    setGifts((giftTypes as any[]) || []);
    const count = (sends as any[])?.length || 0;
    setSentCount(count);

    // Check if "live" account (has avatar or messages)
    const hasAvatar = !!profile?.avatar_url;
    if (!hasAvatar) {
      const { count: msgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id);
      setCanSend(hasAvatar || (msgCount || 0) > 0);
    } else {
      setCanSend(true);
    }
  }

  async function sendGift(giftId: string) {
    if (!user || sending) return;

    if (!isEasterEventActive()) {
      toast({ title: "Акция завершена", description: "Пасхальный ивент закончился", variant: "destructive" });
      return;
    }

    if (sentCount >= MAX_GIFTS_PER_USER) {
      toast({ title: "Лимит достигнут", description: `Максимум ${MAX_GIFTS_PER_USER} подарков`, variant: "destructive" });
      return;
    }

    if (!canSend) {
      toast({ title: "Невозможно отправить", description: "Добавьте аватарку или отправьте хотя бы одно сообщение", variant: "destructive" });
      return;
    }

    setSending(true);

    // Insert gift send
    const { error: sendError } = await supabase.from("gift_sends" as any).insert({
      sender_id: user.id,
      receiver_id: receiverId,
      gift_id: giftId,
    });

    if (sendError) {
      toast({ title: "Ошибка", description: "Не удалось отправить подарок", variant: "destructive" });
      setSending(false);
      return;
    }

    // Add to receiver's inventory
    await supabase.from("user_inventory" as any).insert({
      user_id: receiverId,
      item_type: "gift",
      item_id: giftId,
      source: "gift",
    });

    setSentGiftId(giftId);
    setSentCount((c) => c + 1);

    setTimeout(() => {
      setSentGiftId(null);
      setSending(false);
      toast({ title: "Подарок отправлен! 🎉", description: `${receiverName} получил(а) пасхальный подарок` });
    }, 1500);
  }

  const remaining = MAX_GIFTS_PER_USER - sentCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Отправить подарок
          </DialogTitle>
          <DialogDescription>
            {receiverName} • Осталось: {remaining}/{MAX_GIFTS_PER_USER}
          </DialogDescription>
        </DialogHeader>

        {!isEasterEventActive() ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Пасхальный ивент завершён</p>
          </div>
        ) : !canSend ? (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Для отправки подарков нужна аватарка или история сообщений
            </p>
          </div>
        ) : (
          <>
            {/* Sent animation */}
            <AnimatePresence>
              {sentGiftId && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 rounded-2xl"
                >
                  <div className="text-6xl">
                    {gifts.find((g) => g.id === sentGiftId)?.emoji || "🎁"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-3 py-2">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift.id)}
                  disabled={sending || remaining <= 0}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border hover:border-primary hover:bg-accent/30 transition-all disabled:opacity-40"
                >
                  <AnimatedEgg emoji={gift.emoji} size={32} animationType={gift.animation_type} />
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">{gift.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
