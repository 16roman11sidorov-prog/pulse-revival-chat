import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AnimatedEgg } from "./AnimatedEgg";
import { ProfileBanner } from "./ProfileBanner";
import { motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GiftPlacement, BannerConfig } from "@/lib/easter-config";

export default function BannerEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<any[]>([]);
  const [activeBannerId, setActiveBannerId] = useState<string | null>(null);
  const [ownedBannerIds, setOwnedBannerIds] = useState<string[]>([]);
  const [ownedGifts, setOwnedGifts] = useState<any[]>([]);
  const [giftsLayout, setGiftsLayout] = useState<GiftPlacement[]>([]);
  const [allGiftTypes, setAllGiftTypes] = useState<any[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [resizing, setResizing] = useState<number | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    const [{ data: allBanners }, { data: inventory }, { data: config }, { data: giftTypes }] =
      await Promise.all([
        supabase.from("easter_banners" as any).select("*"),
        supabase.from("user_inventory" as any).select("*").eq("user_id", user.id),
        supabase.from("user_banner_config" as any).select("*").eq("user_id", user.id).single(),
        supabase.from("easter_gifts" as any).select("*"),
      ]);

    setBanners((allBanners as any[]) || []);
    setAllGiftTypes((giftTypes as any[]) || []);

    const inv = (inventory as any[]) || [];
    setOwnedBannerIds(inv.filter((i) => i.item_type === "banner").map((i) => i.item_id));
    setOwnedGifts(inv.filter((i) => i.item_type === "gift"));

    if (config) {
      setActiveBannerId((config as any).active_banner_id);
      setGiftsLayout(((config as any).gifts_layout as GiftPlacement[]) || []);
    }
  }

  async function saveBannerConfig(bannerId: string | null, layout: GiftPlacement[]) {
    if (!user) return;

    const { data: existing } = await supabase
      .from("user_banner_config" as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase
        .from("user_banner_config" as any)
        .update({ active_banner_id: bannerId, gifts_layout: layout, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_banner_config" as any).insert({
        user_id: user.id,
        active_banner_id: bannerId,
        gifts_layout: layout,
      });
    }
  }

  function selectBanner(id: string) {
    setActiveBannerId(id);
    saveBannerConfig(id, giftsLayout);
  }

  function addGiftToBanner(giftId: string) {
    const giftType = allGiftTypes.find((g) => g.id === giftId);
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
    saveBannerConfig(activeBannerId, updated);
  }

  function toggleGiftVisibility(index: number) {
    const updated = giftsLayout.map((g, i) =>
      i === index ? { ...g, visible: !g.visible } : g
    );
    setGiftsLayout(updated);
    saveBannerConfig(activeBannerId, updated);
  }

  function removeGift(index: number) {
    const updated = giftsLayout.filter((_, i) => i !== index);
    setGiftsLayout(updated);
    saveBannerConfig(activeBannerId, updated);
  }

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !bannerRef.current) return;
      const rect = bannerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const updated = giftsLayout.map((g, i) =>
        i === dragging ? { ...g, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : g
      );
      setGiftsLayout(updated);
    },
    [dragging, giftsLayout]
  );

  const handlePointerUp = useCallback(() => {
    if (dragging !== null) {
      saveBannerConfig(activeBannerId, giftsLayout);
    }
    setDragging(null);
  }, [dragging, activeBannerId, giftsLayout]);

  function changeScale(index: number, delta: number) {
    const updated = giftsLayout.map((g, i) =>
      i === index ? { ...g, scale: Math.max(0.5, Math.min(2.5, g.scale + delta)) } : g
    );
    setGiftsLayout(updated);
    saveBannerConfig(activeBannerId, updated);
  }

  const activeBanner = banners.find((b) => b.id === activeBannerId);
  const placedGiftIds = giftsLayout.map((g) => g.gift_id);
  const availableGifts = ownedGifts.filter(
    (g) => !placedGiftIds.includes(g.item_id)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">Кастомизация</h1>
      </div>

      {/* Banner Preview */}
      <div
        ref={bannerRef}
        className="relative touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="w-full h-36 overflow-hidden"
          style={
            activeBanner
              ? buildGradient(activeBanner.gradient_config as BannerConfig)
              : { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }
          }
        >
          {/* Draggable gifts */}
          {giftsLayout.map((g, i) => {
            const giftType = allGiftTypes.find((gt) => gt.id === g.gift_id);
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
                <AnimatedEgg
                  emoji={giftType?.emoji || g.emoji}
                  size={28}
                  animationType={giftType?.animation_type || "bounce"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner Selection */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-bold text-foreground mb-2">Баннеры</h2>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {banners
            .filter((b) => ownedBannerIds.includes(b.id))
            .map((b) => (
              <button
                key={b.id}
                onClick={() => selectBanner(b.id)}
                className={`flex-shrink-0 w-20 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                  activeBannerId === b.id ? "border-primary shadow-lg scale-105" : "border-border"
                }`}
                style={buildGradient(b.gradient_config as BannerConfig)}
              >
                <span className="text-[9px] text-white/80 font-bold drop-shadow">{b.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Gifts on Banner */}
      {giftsLayout.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Подарки на баннере</h2>
          <div className="space-y-2">
            {giftsLayout.map((g, i) => {
              const giftType = allGiftTypes.find((gt) => gt.id === g.gift_id);
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2"
                  layout
                >
                  <span className="text-xl">{giftType?.emoji || g.emoji}</span>
                  <span className="text-sm font-medium flex-1">{giftType?.name || "Подарок"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeScale(i, -0.2)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="text-xs text-muted-foreground w-8 text-center">
                      {(g.scale * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => changeScale(i, 0.2)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold"
                    >
                      +
                    </button>
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
          <h2 className="text-sm font-bold text-foreground mb-2">Доступные подарки</h2>
          <div className="flex gap-2 flex-wrap">
            {availableGifts.map((g, i) => {
              const giftType = allGiftTypes.find((gt) => gt.id === g.item_id);
              return (
                <button
                  key={i}
                  onClick={() => addGiftToBanner(g.item_id)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-card border border-border hover:border-primary transition-colors"
                >
                  <AnimatedEgg emoji={giftType?.emoji || "🎁"} size={32} animationType={giftType?.animation_type} />
                  <span className="text-[10px] text-muted-foreground">{giftType?.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
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
