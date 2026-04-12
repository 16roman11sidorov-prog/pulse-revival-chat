import { AnimatedEgg } from "./AnimatedEgg";
import { motion } from "framer-motion";
import {
  type GiftPlacement,
  EASTER_BANNERS,
  EASTER_GIFTS,
  getBannerConfig,
  buildGradientCSS,
} from "@/lib/easter-config";

interface ProfileBannerProps {
  userId: string;
  children?: React.ReactNode;
}

export function ProfileBanner({ userId, children }: ProfileBannerProps) {
  const config = getBannerConfig(userId);
  const banner = EASTER_BANNERS.find((b) => b.id === config.activeBannerId);

  if (!banner) {
    return (
      <div className="gradient-pulse px-4 pb-10 pt-6 relative">
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ ...buildGradientCSS(banner.gradient_config), minHeight: 160 }}>
      {/* Particles */}
      <ParticleOverlay type={banner.gradient_config.particles} />

      {/* Placed gifts */}
      {config.giftsLayout
        .filter((g: GiftPlacement) => g.visible !== false)
        .map((g: GiftPlacement, i: number) => {
          const giftInfo = EASTER_GIFTS.find((eg) => eg.id === g.gift_id);
          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                transform: `translate(-50%, -50%) scale(${g.scale || 1})`,
              }}
            >
              <AnimatedEgg emoji={giftInfo?.emoji || g.emoji} size={24} animationType={giftInfo?.animation_type || "bounce"} />
            </div>
          );
        })}

      {/* Content overlay */}
      <div className="relative z-10 px-4 pb-10 pt-6">
        {children}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}

function ParticleOverlay({ type }: { type: string }) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: 6 + Math.random() * 10,
  }));

  const emoji: Record<string, string> = {
    sparkle: "✨", leaves: "🍃", stars: "⭐", orbs: "🔮",
    petals: "🌸", glitch: "⚡", fireflies: "💫", snow: "❄️",
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute opacity-50"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{ y: [-4, 4, -4], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: p.delay }}
        >
          {emoji[type] || "✨"}
        </motion.span>
      ))}
    </div>
  );
}
