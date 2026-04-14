// Easter Event Configuration — fully client-side
// Event activated: April 12, 2026 12:00 UTC, lasts exactly 24 hours

export const EASTER_EVENT_START = new Date('2026-04-12T12:00:00Z');
export const EASTER_EVENT_END = new Date('2026-04-13T12:00:00Z');
export const MAX_GIFTS_PER_USER = 5;
export const MAX_GIFTS_PER_USER_PRO = 10;

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

export interface GiftPlacement {
  gift_id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  visible: boolean;
}

export interface BannerConfig {
  type: string;
  colors: string[];
  angle: number;
  particles: string;
}

export interface EasterBanner {
  id: string;
  name: string;
  gradient_config: BannerConfig;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface EasterGift {
  id: string;
  name: string;
  emoji: string;
  animation_type: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// === Predefined banners ===
export const EASTER_BANNERS: EasterBanner[] = [
  { id: 'b1', name: 'Aurora Egg', gradient_config: { type: 'radial', colors: ['#7c3aed', '#ec4899', '#f59e0b'], angle: 135, particles: 'sparkle' }, rarity: 'rare' },
  { id: 'b2', name: 'Neon Garden', gradient_config: { type: 'linear', colors: ['#10b981', '#06b6d4', '#8b5cf6'], angle: 45, particles: 'leaves' }, rarity: 'common' },
  { id: 'b3', name: 'Golden Dawn', gradient_config: { type: 'conic', colors: ['#f59e0b', '#ef4444', '#fbbf24'], angle: 0, particles: 'stars' }, rarity: 'epic' },
  { id: 'b4', name: 'Mystic Violet', gradient_config: { type: 'linear', colors: ['#6d28d9', '#db2777', '#4f46e5'], angle: 180, particles: 'orbs' }, rarity: 'rare' },
  { id: 'b5', name: 'Spring Bloom', gradient_config: { type: 'radial', colors: ['#f472b6', '#fb923c', '#facc15'], angle: 90, particles: 'petals' }, rarity: 'common' },
  { id: 'b6', name: 'Cyber Egg', gradient_config: { type: 'linear', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'], angle: 225, particles: 'glitch' }, rarity: 'epic' },
  { id: 'b7', name: 'Sunset Meadow', gradient_config: { type: 'linear', colors: ['#f97316', '#ec4899', '#a855f7'], angle: 135, particles: 'fireflies' }, rarity: 'common' },
  { id: 'b8', name: 'Crystal Ice', gradient_config: { type: 'radial', colors: ['#67e8f9', '#a5f3fc', '#e0f2fe'], angle: 0, particles: 'snow' }, rarity: 'legendary' },
];

export const EASTER_GIFTS: EasterGift[] = [
  { id: 'g1', name: 'Golden Egg', emoji: '🥚', animation_type: 'spin-glow', rarity: 'epic' },
  { id: 'g2', name: 'Chocolate Bunny', emoji: '🐰', animation_type: 'bounce', rarity: 'common' },
  { id: 'g3', name: 'Magic Carrot', emoji: '🥕', animation_type: 'wiggle', rarity: 'common' },
  { id: 'g4', name: 'Crystal Egg', emoji: '💎', animation_type: 'pulse-glow', rarity: 'legendary' },
  { id: 'g5', name: 'Rainbow Candy', emoji: '🍬', animation_type: 'float', rarity: 'rare' },
  { id: 'g6', name: 'Star Egg', emoji: '⭐', animation_type: 'spin', rarity: 'rare' },
  { id: 'g7', name: 'Fire Egg', emoji: '🔥', animation_type: 'flame', rarity: 'epic' },
  { id: 'g8', name: 'Flower Crown', emoji: '🌸', animation_type: 'sway', rarity: 'common' },
];

// === LocalStorage helpers ===
const STORAGE_PREFIX = 'pulse_easter_';

export function getInventory(userId: string): { banners: string[]; gifts: string[] } {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}inventory_${userId}`);
  if (raw) return JSON.parse(raw);
  return { banners: [], gifts: [] };
}

export function setInventory(userId: string, inv: { banners: string[]; gifts: string[] }) {
  localStorage.setItem(`${STORAGE_PREFIX}inventory_${userId}`, JSON.stringify(inv));
}

export function getBannerConfig(userId: string): { activeBannerId: string | null; giftsLayout: GiftPlacement[] } {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}banner_config_${userId}`);
  if (raw) return JSON.parse(raw);
  return { activeBannerId: null, giftsLayout: [] };
}

export function setBannerConfig(userId: string, config: { activeBannerId: string | null; giftsLayout: GiftPlacement[] }) {
  localStorage.setItem(`${STORAGE_PREFIX}banner_config_${userId}`, JSON.stringify(config));
}

export function getGiftSendCount(userId: string): number {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}gift_sends_${userId}`);
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementGiftSendCount(userId: string) {
  const count = getGiftSendCount(userId) + 1;
  localStorage.setItem(`${STORAGE_PREFIX}gift_sends_${userId}`, String(count));
}

export function grantRandomBanner(userId: string): string | null {
  const inv = getInventory(userId);
  if (inv.banners.length > 0) return inv.banners[0]; // already has one

  const randomBanner = EASTER_BANNERS[Math.floor(Math.random() * EASTER_BANNERS.length)];
  inv.banners.push(randomBanner.id);
  setInventory(userId, inv);

  // Auto-set as active
  const config = getBannerConfig(userId);
  if (!config.activeBannerId) {
    setBannerConfig(userId, { ...config, activeBannerId: randomBanner.id });
  }

  return randomBanner.id;
}

export function addGiftToInventory(userId: string, giftId: string) {
  const inv = getInventory(userId);
  inv.gifts.push(giftId);
  setInventory(userId, inv);
}

export function buildGradientCSS(config: BannerConfig): React.CSSProperties {
  if (!config?.colors?.length) return { background: 'linear-gradient(135deg, #7c3aed, #ec4899)' };
  const colors = config.colors.join(', ');
  switch (config.type) {
    case 'radial': return { background: `radial-gradient(ellipse at 30% 50%, ${colors})` };
    case 'conic': return { background: `conic-gradient(from ${config.angle}deg, ${colors})` };
    default: return { background: `linear-gradient(${config.angle || 135}deg, ${colors})` };
  }
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};
