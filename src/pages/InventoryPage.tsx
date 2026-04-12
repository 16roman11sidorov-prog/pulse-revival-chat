import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "@/components/easter/AnimatedEgg";
import { motion } from "framer-motion";
import type { BannerConfig } from "@/lib/easter-config";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banners, setBanners] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [tab, setTab] = useState<"banners" | "gifts">("banners");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadInventory();
  }, [user]);

  async function loadInventory() {
    if (!user) return;

    const { data: inventory } = await supabase
      .from("user_inventory" as any)
      .select("*")
      .eq("user_id", user.id);

    const inv = (inventory as any[]) || [];

    // Load banner details
    const bannerIds = inv.filter((i) => i.item_type === "banner").map((i) => i.item_id);
    if (bannerIds.length > 0) {
      const { data } = await supabase
        .from("easter_banners" as any)
        .select("*")
        .in("id", bannerIds);
      setBanners((data as any[]) || []);
    }

    // Load gift details
    const giftIds = inv.filter((i) => i.item_type === "gift").map((i) => i.item_id);
    if (giftIds.length > 0) {
      const { data } = await supabase
        .from("easter_gifts" as any)
        .select("*")
        .in("id", giftIds);
      // Count duplicates
      const giftMap: Record<string, { gift: any; count: number }> = {};
      giftIds.forEach((id) => {
        if (!giftMap[id]) {
          giftMap[id] = { gift: (data as any[])?.find((g) => g.id === id), count: 0 };
        }
        giftMap[id].count++;
      });
      setGifts(Object.values(giftMap).filter((g) => g.gift));
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Хранилище</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: "banners" as const, label: "Баннеры", icon: Sparkles },
          { key: "gifts" as const, label: "Подарки", icon: Package },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : tab === "banners" ? (
          banners.length === 0 ? (
            <EmptyState text="У вас пока нет баннеров" emoji="🖼️" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {banners.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden border border-border"
                >
                  <div
                    className="h-20 w-full"
                    style={buildGradient(b.gradient_config as BannerConfig)}
                  />
                  <div className="p-2 bg-card">
                    <p className="text-xs font-semibold truncate">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{b.rarity}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : gifts.length === 0 ? (
          <EmptyState text="У вас пока нет подарков" emoji="🎁" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {gifts.map(({ gift, count }, i) => (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border"
              >
                <AnimatedEgg emoji={gift.emoji} size={36} animationType={gift.animation_type} />
                <p className="text-xs font-semibold text-center">{gift.name}</p>
                {count > 1 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    ×{count}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, emoji }: { text: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function buildGradient(config: BannerConfig): React.CSSProperties {
  if (!config?.colors?.length) return { background: "linear-gradient(135deg, #7c3aed, #ec4899)" };
  const colors = config.colors.join(", ");
  switch (config.type) {
    case "radial":
      return { background: `radial-gradient(ellipse at 30% 50%, ${colors})` };
    case "conic":
      return { background: `conic-gradient(from ${config.angle}deg, ${colors})` };
    default:
      return { background: `linear-gradient(${config.angle || 135}deg, ${colors})` };
  }
}
