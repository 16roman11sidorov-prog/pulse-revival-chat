import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VoicePlayerProps {
  src: string;
  isOwn: boolean;
  duration?: number;
}

export default function VoicePlayer({ src, isOwn, duration: initialDuration }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio && isPlaying && audio.duration) {
        setProgress(audio.currentTime / audio.duration);
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate fake waveform bars
  const bars = 24;
  const waveform = useRef(
    Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8)
  ).current;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isOwn ? "bg-white/20 hover:bg-white/30" : "bg-primary/15 hover:bg-primary/25"
        )}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-5">
          {waveform.map((h, i) => {
            const filled = progress > i / bars;
            return (
              <motion.div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  filled
                    ? isOwn ? "bg-white/90" : "bg-primary"
                    : isOwn ? "bg-white/30" : "bg-primary/25"
                )}
                style={{ height: `${h * 100}%` }}
                animate={isPlaying && filled ? { scaleY: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            );
          })}
        </div>
        <span className={cn("text-[10px]", isOwn ? "text-white/60" : "text-muted-foreground")}>
          {isPlaying
            ? formatTime((audioRef.current?.currentTime || 0))
            : formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
