/**
 * เลย์เอาต์การ์ด (ฝั่งเว็บ) — ต้องตรงกับ src/utils/cardLayout.ts ของบอท
 * ค่าทั้งหมดเป็น px บนผืนการ์ด (origin = มุมซ้ายบน)
 */

export type CardVariant = "profile" | "weekly";

export interface CardLayout {
  version: 1;
  width: number;
  height: number;
  radius: number;
  colors: {
    bgFrom: string;
    bgTo: string;
    accent: string;
    accentSoft: string;
    text: string;
    muted: string;
  };
  avatar: { x: number; y: number; size: number };
  header: { x: number; y: number; titleSize: number; subtitleSize: number };
  name: { x: number; y: number; size: number };
  stats: { x: number; y: number; width: number; height: number; gap: number };
  band: { x: number; y: number; width: number; height: number; enabled: boolean };
  logo: { enabled: boolean; x: number; y: number; size: number };
}

export const DEFAULT_LAYOUT: CardLayout = {
  version: 1,
  width: 1000,
  height: 560,
  radius: 32,
  colors: {
    bgFrom: "#1b1310",
    bgTo: "#2b1a12",
    accent: "#ff8c42",
    accentSoft: "#ffb37a",
    text: "#fff4ec",
    muted: "#d0b3a3",
  },
  avatar: { x: 128, y: 132, size: 148 },
  header: { x: 64, y: 44, titleSize: 13, subtitleSize: 13 },
  name: { x: 232, y: 118, size: 42 },
  stats: { x: 64, y: 248, width: 280, height: 160, gap: 16 },
  band: { x: 64, y: 428, width: 872, height: 76, enabled: true },
  logo: { enabled: true, x: 936, y: 44, size: 30 },
};

export interface CardPreset {
  id: string;
  name: string;
  colors: CardLayout["colors"];
}

/** ธีมสำเร็จรูป 16 แบบ — ต้องตรงกับ CARD_PRESETS ฝั่งบอท */
export const CARD_PRESETS: CardPreset[] = [
  { id: "ruru", name: "Ruru Orange", colors: { bgFrom: "#1b1310", bgTo: "#2b1a12", accent: "#ff8c42", accentSoft: "#ffb37a", text: "#fff4ec", muted: "#d0b3a3" } },
  { id: "midnight", name: "Midnight", colors: { bgFrom: "#0b1020", bgTo: "#141c33", accent: "#5b8cff", accentSoft: "#9db8ff", text: "#eef2ff", muted: "#aab6d3" } },
  { id: "forest", name: "Forest", colors: { bgFrom: "#0d1512", bgTo: "#14261f", accent: "#4ade80", accentSoft: "#a7f3c4", text: "#f0fdf4", muted: "#a9c9b8" } },
  { id: "sakura", name: "Sakura", colors: { bgFrom: "#1a1013", bgTo: "#2b1620", accent: "#ff7aa8", accentSoft: "#ffb8ce", text: "#fff1f5", muted: "#d8b6c2" } },
  { id: "ocean", name: "Ocean", colors: { bgFrom: "#08161c", bgTo: "#0f2a34", accent: "#22d3ee", accentSoft: "#8ce8f7", text: "#ecfeff", muted: "#a6cbd3" } },
  { id: "sunset", name: "Sunset", colors: { bgFrom: "#1c1010", bgTo: "#331a17", accent: "#f97316", accentSoft: "#fdba74", text: "#fff7ed", muted: "#d9bcae" } },
  { id: "grape", name: "Grape", colors: { bgFrom: "#150f1f", bgTo: "#241436", accent: "#a78bfa", accentSoft: "#cbb8ff", text: "#f5f3ff", muted: "#c0b3d9" } },
  { id: "mono", name: "Mono", colors: { bgFrom: "#101012", bgTo: "#1c1c20", accent: "#d4d4d8", accentSoft: "#f4f4f5", text: "#fafafa", muted: "#a1a1aa" } },
  { id: "gold", name: "Gold Noir", colors: { bgFrom: "#12100a", bgTo: "#221b0e", accent: "#eab308", accentSoft: "#fde68a", text: "#fefce8", muted: "#cbbb92" } },
  { id: "mint", name: "Mint", colors: { bgFrom: "#0c1412", bgTo: "#12241f", accent: "#2dd4bf", accentSoft: "#99f6e4", text: "#f0fdfa", muted: "#a7ccc5" } },
  { id: "crimson", name: "Crimson", colors: { bgFrom: "#170d0d", bgTo: "#2a1212", accent: "#ef4444", accentSoft: "#fca5a5", text: "#fef2f2", muted: "#d3b0b0" } },
  { id: "sand", name: "Sand", colors: { bgFrom: "#1a1610", bgTo: "#2b2417", accent: "#d6a45c", accentSoft: "#ecd0a1", text: "#fdf8ef", muted: "#cdbfa9" } },
  { id: "cyber", name: "Cyber", colors: { bgFrom: "#0a0a14", bgTo: "#171233", accent: "#22d3ee", accentSoft: "#c084fc", text: "#f5f3ff", muted: "#b3aecf" } },
  { id: "coffee", name: "Coffee", colors: { bgFrom: "#17110d", bgTo: "#271b14", accent: "#c08457", accentSoft: "#e3b992", text: "#fbf3ea", muted: "#cbb5a2" } },
  { id: "arctic", name: "Arctic", colors: { bgFrom: "#f4f7fb", bgTo: "#dfe7f3", accent: "#2563eb", accentSoft: "#60a5fa", text: "#0f172a", muted: "#475569" } },
  { id: "blossom", name: "Blossom", colors: { bgFrom: "#fff6f2", bgTo: "#ffe3d6", accent: "#e2562b", accentSoft: "#f59e6c", text: "#2b1206", muted: "#6b4a3a" } },
];

/** หาธีมที่ตรงกับสีปัจจุบัน (สำหรับไฮไลต์ปุ่ม) */
export function matchPreset(layout: CardLayout): string | null {
  const found = CARD_PRESETS.find(
    (preset) => preset.colors.bgFrom === layout.colors.bgFrom && preset.colors.accent === layout.colors.accent,
  );
  return found?.id ?? null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function num(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** ตรวจ/clamp ค่าจากฟอร์ม — กันข้อมูลพังก่อนบันทึกขึ้น DB */
export function normalizeLayout(raw: unknown): CardLayout {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_LAYOUT;

  const width = num(input.width, d.width, 600, 1600);
  const height = num(input.height, d.height, 320, 900);
  const colorsIn = (input.colors ?? {}) as Record<string, unknown>;
  const avatarIn = (input.avatar ?? {}) as Record<string, unknown>;
  const headerIn = (input.header ?? {}) as Record<string, unknown>;
  const nameIn = (input.name ?? {}) as Record<string, unknown>;
  const statsIn = (input.stats ?? {}) as Record<string, unknown>;
  const bandIn = (input.band ?? {}) as Record<string, unknown>;
  const logoIn = (input.logo ?? {}) as Record<string, unknown>;

  return {
    version: 1,
    width,
    height,
    radius: num(input.radius, d.radius, 0, 48),
    colors: {
      bgFrom: color(colorsIn.bgFrom, d.colors.bgFrom),
      bgTo: color(colorsIn.bgTo, d.colors.bgTo),
      accent: color(colorsIn.accent, d.colors.accent),
      accentSoft: color(colorsIn.accentSoft, d.colors.accentSoft),
      text: color(colorsIn.text, d.colors.text),
      muted: color(colorsIn.muted, d.colors.muted),
    },
    avatar: {
      x: num(avatarIn.x, d.avatar.x, 0, width),
      y: num(avatarIn.y, d.avatar.y, 0, height),
      size: num(avatarIn.size, d.avatar.size, 48, Math.min(360, height - 40)),
    },
    header: {
      x: num(headerIn.x, d.header.x, 0, width),
      y: num(headerIn.y, d.header.y, 0, height),
      titleSize: num(headerIn.titleSize, d.header.titleSize, 9, 24),
      subtitleSize: num(headerIn.subtitleSize, d.header.subtitleSize, 9, 24),
    },
    name: {
      x: num(nameIn.x, d.name.x, 0, width),
      y: num(nameIn.y, d.name.y, 0, height),
      size: num(nameIn.size, d.name.size, 16, 72),
    },
    stats: {
      x: num(statsIn.x, d.stats.x, 0, width),
      y: num(statsIn.y, d.stats.y, 0, height),
      width: num(statsIn.width, d.stats.width, 140, 460),
      height: num(statsIn.height, d.stats.height, 96, 300),
      gap: num(statsIn.gap, d.stats.gap, 0, 80),
    },
    band: {
      x: num(bandIn.x, d.band.x, 0, width),
      y: num(bandIn.y, d.band.y, 0, height),
      width: num(bandIn.width, d.band.width, 200, width),
      height: num(bandIn.height, d.band.height, 56, 160),
      enabled: bool(bandIn.enabled, d.band.enabled),
    },
    logo: {
      enabled: bool(logoIn.enabled, d.logo.enabled),
      x: num(logoIn.x, d.logo.x, 0, width),
      y: num(logoIn.y, d.logo.y, 0, height),
      size: num(logoIn.size, d.logo.size, 16, 64),
    },
  };
}

/** base64url ของ JSON (เหมือนฝั่งบอท — ใช้แนบใน URL พรีวิว) */
export function encodeLayout(layout: CardLayout): string {
  const bytes = new TextEncoder().encode(JSON.stringify(layout));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
