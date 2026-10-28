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
