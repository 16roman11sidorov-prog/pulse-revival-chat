import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type FrameType = "gold" | "silver" | "neon" | "gradient" | "animated" | null;

interface AvatarFrameProps {
  frame: FrameType;
  size?: number;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

const frameStyles: Record<string, { border: string; shadow: string; animate?: boolean }> = {
  gold: {
    border: "border-[3px] border-yellow-400",
    shadow: "shadow-[0_0_12px_rgba(250,204,21,0.5)]",
  },
  silver: {
    border: "border-[3px] border-gray-300",
    shadow: "shadow-[0_0_12px_rgba(209,213,219,0.5)]",
  },
  neon: {
    border: "border-[3px] border-cyan-400",
    shadow: "shadow-[0_0_16px_rgba(34,211,238,0.6)]",
  },
  gradient: {
    border: "border-[3px] border-transparent",
    shadow: "shadow-[0_0_14px_rgba(168,85,247,0.5)]",
  },
  animated: {
    border: "border-[3px] border-transparent",
    shadow: "shadow-[0_0_20px_rgba(236,72,153,0.5)]",
    animate: true,
  },
};

export function AvatarFrame({ frame, children, className, glow }: AvatarFrameProps) {
  if (!frame) {
    return (
      <div className={cn("relative", className)}>
        {glow && (
          <motion.div
            className="absolute inset-[-4px] rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {children}
      </div>
    );
  }

  const style = frameStyles[frame];
  const isGradientBorder = frame === "gradient" || frame === "animated";

  return (
    <div className={cn("relative", className)}>
      {/* Glow effect for Pro */}
      {glow && (
        <motion.div
          className="absolute inset-[-6px] rounded-full opacity-60"
          style={{
            background: frame === "gold"
              ? "radial-gradient(circle, rgba(250,204,21,0.4), transparent 70%)"
              : frame === "neon"
              ? "radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)"
              : "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)"
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Gradient/animated ring */}
      {isGradientBorder && (
        <motion.div
          className="absolute inset-[-3px] rounded-full"
          style={{
            background: frame === "gradient"
              ? "conic-gradient(from 0deg, #a855f7, #ec4899, #f59e0b, #10b981, #3b82f6, #a855f7)"
              : "conic-gradient(from 0deg, #ec4899, #f59e0b, #10b981, #3b82f6, #a855f7, #ec4899)",
          }}
          animate={style?.animate ? { rotate: 360 } : undefined}
          transition={style?.animate ? { duration: 3, repeat: Infinity, ease: "linear" } : undefined}
        />
      )}

      <div
        className={cn(
          "relative rounded-full overflow-hidden",
          !isGradientBorder && style?.border,
          style?.shadow,
        )}
        style={isGradientBorder ? { padding: "3px" } : undefined}
      >
        {isGradientBorder ? (
          <div className="rounded-full overflow-hidden bg-background">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export type { FrameType };
