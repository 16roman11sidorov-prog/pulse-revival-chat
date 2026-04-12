import { useEaster } from "./EasterThemeProvider";
import { motion, AnimatePresence } from "framer-motion";

export function EasterCountdown() {
  const { isActive, timeRemaining } = useEaster();

  if (!isActive || !timeRemaining) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="easter-countdown-bar"
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4">
        <span className="easter-egg-mini">🥚</span>
        <span className="text-xs font-bold tracking-wide uppercase text-white/90">
          Пасхальный Ивент
        </span>
        <div className="flex gap-1 ml-2">
          <AnimatePresence mode="popLayout">
            <TimeBlock key={`h-${timeRemaining.hours}`} value={timeRemaining.hours} label="ч" />
            <span className="text-white/60 text-xs font-bold self-center">:</span>
            <TimeBlock key={`m-${timeRemaining.minutes}`} value={timeRemaining.minutes} label="м" />
            <span className="text-white/60 text-xs font-bold self-center">:</span>
            <TimeBlock key={`s-${timeRemaining.seconds}`} value={timeRemaining.seconds} label="с" />
          </AnimatePresence>
        </div>
        <span className="easter-egg-mini">🐰</span>
      </div>
    </motion.div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      initial={{ scale: 1.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-baseline"
    >
      <span className="text-sm font-black text-white tabular-nums min-w-[1.2rem] text-center">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/50 font-medium">{label}</span>
    </motion.div>
  );
}
