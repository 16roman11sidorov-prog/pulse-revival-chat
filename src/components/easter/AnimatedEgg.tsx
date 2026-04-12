import { motion } from "framer-motion";
import { useMemo } from "react";

interface AnimatedEggProps {
  emoji?: string;
  size?: number;
  animationType?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function AnimatedEgg({
  emoji = "🥚",
  size = 48,
  animationType = "bounce",
  className = "",
  onClick,
  style,
}: AnimatedEggProps) {
  const animation = useMemo(() => {
    switch (animationType) {
      case "spin-glow":
        return {
          animate: {
            rotate: [0, 360],
            filter: [
              "drop-shadow(0 0 8px rgba(251,191,36,0.6))",
              "drop-shadow(0 0 20px rgba(251,191,36,1))",
              "drop-shadow(0 0 8px rgba(251,191,36,0.6))",
            ],
          },
          transition: { rotate: { duration: 4, repeat: Infinity, ease: "linear" }, filter: { duration: 2, repeat: Infinity } },
        };
      case "bounce":
        return {
          animate: { y: [0, -12, 0] },
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        };
      case "wiggle":
        return {
          animate: { rotate: [-8, 8, -8] },
          transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
        };
      case "pulse-glow":
        return {
          animate: {
            scale: [1, 1.15, 1],
            filter: [
              "drop-shadow(0 0 6px rgba(139,92,246,0.4))",
              "drop-shadow(0 0 24px rgba(139,92,246,1))",
              "drop-shadow(0 0 6px rgba(139,92,246,0.4))",
            ],
          },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        };
      case "float":
        return {
          animate: { y: [0, -8, 0], x: [0, 4, -4, 0] },
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        };
      case "spin":
        return {
          animate: { rotate: [0, 360] },
          transition: { duration: 3, repeat: Infinity, ease: "linear" },
        };
      case "flame":
        return {
          animate: {
            scale: [1, 1.1, 0.95, 1.05, 1],
            filter: [
              "drop-shadow(0 0 4px rgba(239,68,68,0.5))",
              "drop-shadow(0 0 16px rgba(249,115,22,0.9))",
              "drop-shadow(0 0 4px rgba(239,68,68,0.5))",
            ],
          },
          transition: { duration: 1.2, repeat: Infinity },
        };
      case "sway":
        return {
          animate: { rotate: [-5, 5], y: [0, -4, 0] },
          transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
        };
      default:
        return {
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 2, repeat: Infinity },
        };
    }
  }, [animationType]);

  return (
    <motion.div
      className={`select-none cursor-pointer ${className}`}
      style={{ fontSize: size, lineHeight: 1, ...style }}
      onClick={onClick}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      {...animation}
    >
      {emoji}
    </motion.div>
  );
}
