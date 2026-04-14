import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "./AnimatedEgg";
import {
  isEasterEventActive,
  MAX_GIFTS_PER_USER,
  MAX_GIFTS_PER_USER_PRO,
  EASTER_GIFTS,
  getGiftSendCount,
  incrementGiftSendCount,
  addGiftToInventory,
} from "@/lib/easter-config";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";

interface GiftSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
}

export function GiftSendDialog({ open, onOpenChange, receiverId, receiverName }: GiftSendDialogProps) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [sentGiftId, setSentGiftId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSentCount(getGiftSendCount(user.id));
      supabase.from("profiles").select("is_pro").eq("user_id", user.id).single()
        .then(({ data }) => setIsPro(!!(data as any)?.is_pro));
    }
  }, [open, user]);

  const maxGifts = isPro ? MAX_GIFTS_PER_USER_PRO : MAX_GIFTS_PER_USER;

  function sendGift(giftId: string) {
    if (!user || sending) return;

    if (!isEasterEventActive()) {
      toast({ title: "Акция завершена", description: "Пасхальный ивент закончился", variant: "destructive" });
      return;
    }

    if (sentCount >= maxGifts) {
      toast({ title: "Лимит достигнут", description: `Максимум ${maxGifts} подарков`, variant: "destructive" });
      return;
    }

    setSending(true);

    // Add to receiver's inventory
    addGiftToInventory(receiverId, giftId);
    incrementGiftSendCount(user.id);

    setSentGiftId(giftId);
    setSentCount((c) => c + 1);

    setTimeout(() => {
      setSentGiftId(null);
      setSending(false);
      toast({ title: "Подарок отправлен! 🎉", description: `${receiverName} получил(а) пасхальный подарок` });
    }, 1500);
  }

  const remaining = maxGifts - sentCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Отправить подарок
          </DialogTitle>
          <DialogDescription>
            {receiverName} • Осталось: {remaining}/{maxGifts}
            {isPro && <span className="ml-1 text-yellow-500">👑 Pro</span>}
          </DialogDescription>
        </DialogHeader>

        {!isEasterEventActive() ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Пасхальный ивент завершён</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {sentGiftId && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 rounded-2xl"
                >
                  <div className="text-6xl">
                    {EASTER_GIFTS.find((g) => g.id === sentGiftId)?.emoji || "🎁"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-3 py-2">
              {EASTER_GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift.id)}
                  disabled={sending || remaining <= 0}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border hover:border-primary hover:bg-accent/30 transition-all disabled:opacity-40"
                >
                  <AnimatedEgg emoji={gift.emoji} size={28} animationType={gift.animation_type} />
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
