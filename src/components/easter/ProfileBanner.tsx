import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedEgg } from "./AnimatedEgg";
import type { BannerConfig, GiftPlacement } from "@/lib/easter-config";
import { motion } from "framer-motion";

interface ProfileBannerProps {
  userId: string;
  children?: React.ReactNode; // avatar overlay
  editable?: boolean;
}

export function ProfileBanner({ userId, children, editable = false }: ProfileBannerProps) {
  const [banner, setBanner] = useState<{ id: string; gradient_config: BannerConfig } | null>(null);
  const [gifts, setGifts] = useState<GiftPlacement[]>([]);
  const [allGifts, setAllGifts] = useState<any[]>([]);

  useEffect(() => {
    loadBannerConfig();
  }, [userId]);

  async function loadBannerConfig() {
    const { data: config } = await supabase
      .from("user_banner_config" as any)
      .select("active_banner_id, gifts_layout")
      .eq("user_id", userId)
      .single();

    if (config && (config as any).active_banner_id) {
      const { data: bannerData } = await supabase
        .from("easter_banners" as any)
        .select("id, gradient_config")
        .eq("id", (config as any).active_banner_id)
        .single();

      if (bannerData) {
        setBanner(bannerData as any);
      }
      setGifts(((config as any).gifts_layout as GiftPlacement[]) || []);
    }

    // Load gift details for emojis
    const { data: giftData } = await supabase
      .from("easter_gifts" as any)
      .select("id, emoji, animation_type");
    if (giftData) setAllGifts(giftData as any[]);
  }

  const gradientStyle = banner ? buildGradient(banner.gradient_config) : {};

  return (
    <div className="relative w-full h-36 overflow-hidden rounded-b-3xl" style={gradientStyle}>
      {/* Particle overlay */}
      {banner && <ParticleOverlay type={banner.gradient_config.particles} />}

      {/* Placed gifts */}
      {gifts
        .filter((g) => g.visible !== false)
        .map((g, i) => {
          const giftInfo = allGifts.find((ag) => ag.id === g.gift_id);
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                transform: `scale(${g.scale || 1})`,
              }}
            >
              <AnimatedEgg
                emoji={giftInfo?.emoji || g.emoji}
                size={28}
                animationType={giftInfo?.animation_type || "bounce"}
              />
            </div>
          );
        })}

      {/* Avatar overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-start px-4 translate-y-1/2">
        {children}
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent" />
    </div>
  );
}

function buildGradient(config: BannerConfig): React.CSSProperties {
  if (!config?.colors?.length) {
    return { background: "linear-gradient(135deg, #7c3aed, #ec4899)" };
  }
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

function ParticleOverlay({ type }: { type: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: 4 + Math.random() * 8,
  }));

  const emoji = {
    sparkle: "✨",
    leaves: "🍃",
    stars: "⭐",
    orbs: "🔮",
    petals: "🌸",
    glitch: "⚡",
    fireflies: "💫",
    snow: "❄️",
  }[type] || "✨";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute opacity-60"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
          }}
          animate={{
            y: [-5, 5, -5],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: p.delay,
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
