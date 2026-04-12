import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "@/components/easter/AnimatedEgg";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  EASTER_BANNERS,
  EASTER_GIFTS,
  getInventory,
  buildGradientCSS,
  RARITY_COLORS,
} from "@/lib/easter-config";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"banners" | "gifts">("banners");

  const inventory = user ? getInventory(user.id) : { banners: [], gifts: [] };
  const ownedBanners = EASTER_BANNERS.filter((b) => inventory.banners.includes(b.id));

  // Count gift duplicates
  const giftCounts: Record<string, number> = {};
  inventory.gifts.forEach((id) => {
    giftCounts[id] = (giftCounts[id] || 0) + 1;
  });
  const uniqueGifts = Object.entries(giftCounts).map(([id, count]) => ({
    gift: EASTER_GIFTS.find((g) => g.id === id),
    count,
  })).filter((g) => g.gift);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Хранилище</h1>
      </div>

      <div className="flex border-b border-border">
        {([
          { key: "banners" as const, label: "Баннеры", Icon: Sparkles },
          { key: "gifts" as const, label: "Подарки", Icon: Package },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <t.Icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === "banners" ? (
          ownedBanners.length === 0 ? (
            <Empty text="У вас пока нет баннеров" emoji="🖼️" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ownedBanners.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden border border-border"
                >
                  <div className="h-20 w-full relative" style={buildGradientCSS(b.gradient_config)}>
                    <span
                      className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: RARITY_COLORS[b.rarity] }}
                    >
                      {b.rarity}
                    </span>
                  </div>
                  <div className="p-2 bg-card">
                    <p className="text-xs font-semibold truncate">{b.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : uniqueGifts.length === 0 ? (
          <Empty text="У вас пока нет подарков" emoji="🎁" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {uniqueGifts.map(({ gift, count }, i) => (
              <motion.div
                key={gift!.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border"
              >
                <AnimatedEgg emoji={gift!.emoji} size={36} animationType={gift!.animation_type} />
                <p className="text-xs font-semibold text-center">{gift!.name}</p>
                {count > 1 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">×{count}</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text, emoji }: { text: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}
