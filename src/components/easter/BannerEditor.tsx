import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "./AnimatedEgg";
import { motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  type GiftPlacement,
  EASTER_BANNERS,
  EASTER_GIFTS,
  getInventory,
  getBannerConfig,
  setBannerConfig,
  buildGradientCSS,
  RARITY_COLORS,
} from "@/lib/easter-config";

export default function BannerEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBannerId, setActiveBannerId] = useState<string | null>(null);
  const [giftsLayout, setGiftsLayout] = useState<GiftPlacement[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const inventory = user ? getInventory(user.id) : { banners: [], gifts: [] };
  const ownedBanners = EASTER_BANNERS.filter((b) => inventory.banners.includes(b.id));
  const ownedGiftIds = inventory.gifts;

  useEffect(() => {
    if (!user) return;
    const config = getBannerConfig(user.id);
    setActiveBannerId(config.activeBannerId);
    setGiftsLayout(config.giftsLayout);
  }, [user]);

  function save(bannerId: string | null, layout: GiftPlacement[]) {
    if (!user) return;
    setBannerConfig(user.id, { activeBannerId: bannerId, giftsLayout: layout });
  }

  function selectBanner(id: string) {
    setActiveBannerId(id);
    save(id, giftsLayout);
  }

  function addGiftToBanner(giftId: string) {
    const giftType = EASTER_GIFTS.find((g) => g.id === giftId);
    const newGift: GiftPlacement = {
      gift_id: giftId,
      emoji: giftType?.emoji || "🥚",
      x: 50,
      y: 40,
      scale: 1,
      visible: true,
    };
    const updated = [...giftsLayout, newGift];
    setGiftsLayout(updated);
    save(activeBannerId, updated);
  }

  function toggleGiftVisibility(index: number) {
    const updated = giftsLayout.map((g, i) => (i === index ? { ...g, visible: !g.visible } : g));
    setGiftsLayout(updated);
    save(activeBannerId, updated);
  }

  function removeGift(index: number) {
    const updated = giftsLayout.filter((_, i) => i !== index);
    setGiftsLayout(updated);
    save(activeBannerId, updated);
  }

  function changeScale(index: number, delta: number) {
    const updated = giftsLayout.map((g, i) =>
      i === index ? { ...g, scale: Math.max(0.5, Math.min(2.5, g.scale + delta)) } : g
    );
    setGiftsLayout(updated);
    save(activeBannerId, updated);
  }

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !bannerRef.current) return;
      const rect = bannerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setGiftsLayout((prev) =>
        prev.map((g, i) =>
          i === dragging ? { ...g, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : g
        )
      );
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    if (dragging !== null) {
      save(activeBannerId, giftsLayout);
    }
    setDragging(null);
  }, [dragging, activeBannerId, giftsLayout]);

  const activeBanner = EASTER_BANNERS.find((b) => b.id === activeBannerId);
  const placedGiftIds = giftsLayout.map((g) => g.gift_id);
  // Find available gifts (owned but not placed)
  const availableGifts = ownedGiftIds
    .filter((id) => !placedGiftIds.includes(id))
    .map((id) => EASTER_GIFTS.find((g) => g.id === id))
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">Кастомизация баннера</h1>
      </div>

      {/* Banner Preview with drag */}
      <div
        ref={bannerRef}
        className="relative touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="w-full h-40 overflow-hidden relative"
          style={activeBanner ? buildGradientCSS(activeBanner.gradient_config) : { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
        >
          {/* Draggable gifts */}
          {giftsLayout.map((g, i) => {
            const giftType = EASTER_GIFTS.find((gt) => gt.id === g.gift_id);
            if (!g.visible) return null;
            return (
              <div
                key={i}
                className="absolute cursor-grab active:cursor-grabbing z-10"
                style={{
                  left: `${g.x}%`,
                  top: `${g.y}%`,
                  transform: `translate(-50%, -50%) scale(${g.scale})`,
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragging(i);
                }}
              >
                <AnimatedEgg emoji={giftType?.emoji || g.emoji} size={28} animationType={giftType?.animation_type || "bounce"} />
              </div>
            );
          })}
          {/* Helper text */}
          {giftsLayout.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/40 text-xs font-medium">Перетаскивайте подарки сюда</p>
            </div>
          )}
        </div>
      </div>

      {/* Banner Selection */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-bold text-foreground mb-2">Ваши баннеры</h2>
        {ownedBanners.length === 0 ? (
          <p className="text-xs text-muted-foreground">Баннеры появятся во время Пасхального Ивента</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {ownedBanners.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBanner(b.id)}
                className={`flex-shrink-0 w-24 h-14 rounded-xl overflow-hidden border-2 transition-all flex items-end justify-center pb-1 ${
                  activeBannerId === b.id ? "border-primary shadow-lg shadow-primary/30 scale-105" : "border-border/50"
                }`}
                style={buildGradientCSS(b.gradient_config)}
              >
                <span className="text-[8px] text-white font-bold drop-shadow-lg bg-black/20 px-1.5 py-0.5 rounded-full">{b.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Placed Gifts Controls */}
      {giftsLayout.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-foreground mb-2">На баннере</h2>
          <div className="space-y-2">
            {giftsLayout.map((g, i) => {
              const giftType = EASTER_GIFTS.find((gt) => gt.id === g.gift_id);
              return (
                <motion.div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2" layout>
                  <span className="text-xl">{giftType?.emoji || g.emoji}</span>
                  <span className="text-sm font-medium flex-1">{giftType?.name || "Подарок"}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeScale(i, -0.2)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-foreground">−</button>
                    <span className="text-xs text-muted-foreground w-8 text-center">{(g.scale * 100).toFixed(0)}%</span>
                    <button onClick={() => changeScale(i, 0.2)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-foreground">+</button>
                  </div>
                  <button onClick={() => toggleGiftVisibility(i)} className="p-1.5 rounded-lg hover:bg-muted">
                    {g.visible ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => removeGift(i)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Gifts to Place */}
      {availableGifts.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Добавить на баннер</h2>
          <div className="flex gap-2 flex-wrap">
            {availableGifts.map((gift, i) => (
              <button
                key={i}
                onClick={() => addGiftToBanner(gift!.id)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border hover:border-primary transition-colors"
              >
                <AnimatedEgg emoji={gift!.emoji} size={32} animationType={gift!.animation_type} />
                <span className="text-[10px] text-muted-foreground">{gift!.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
