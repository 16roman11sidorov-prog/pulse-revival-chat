// Easter Event Configuration
// Event activated: April 12, 2026, lasts exactly 24 hours

export const EASTER_EVENT_START = new Date('2026-04-12T12:00:00Z');
export const EASTER_EVENT_END = new Date('2026-04-13T12:00:00Z');
export const MAX_GIFTS_PER_USER = 5;

export function isEasterEventActive(): boolean {
  const now = new Date();
  return now >= EASTER_EVENT_START && now <= EASTER_EVENT_END;
}

export function getEventTimeRemaining(): { hours: number; minutes: number; seconds: number } | null {
  if (!isEasterEventActive()) return null;
  const diff = EASTER_EVENT_END.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

// Banner gradient generators
export const BANNER_RENDERERS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {};

export interface GiftPlacement {
  gift_id: string;
  emoji: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number; // 0.5-2
  visible: boolean;
}

export interface BannerConfig {
  type: string;
  colors: string[];
  angle: number;
  particles: string;
}

export const GIFT_ANIMATIONS: Record<string, string> = {
  'bounce': 'animate-bounce',
  'spin': 'animate-spin',
  'spin-glow': 'animate-spin',
  'pulse-glow': 'animate-pulse',
  'wiggle': 'animate-pulse',
  'float': 'animate-bounce',
  'flame': 'animate-pulse',
  'sway': 'animate-pulse',
};
