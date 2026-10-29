/**
 * ธีมการ์ด (ฝั่งเว็บ) — ต้องตรงกับ CARD_PRESETS ใน src/utils/cardLayout.ts ของบอท
 *
 * ดีไซน์การ์ดถูกกำหนดตายตัวในตัวเรนเดอร์ของบอท (ลาก/ย่อ/แก้ทีละชิ้นไม่ได้แล้ว)
 * Card Studio จึงเหลือหน้าที่เดียว: เลือกธีมสี 16 แบบ
 */

export type CardVariant = "profile" | "weekly";

export interface CardColors {
  bgFrom: string;
  bgTo: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
}

export interface CardTheme {
  id: string;
  name: string;
  colors: CardColors;
}

/** ธีมสำเร็จรูป 16 แบบ — ต้องตรงกับฝั่งบอท */
export const CARD_PRESETS: CardTheme[] = [
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

export const DEFAULT_THEME_ID = "ruru";
export const DEFAULT_THEME: CardTheme = CARD_PRESETS[0];

/** หาธีมจาก id (ไม่พบ → ธีมเริ่มต้น) */
export function themeById(id: string | null | undefined): CardTheme {
  if (!id) return DEFAULT_THEME;
  return CARD_PRESETS.find((theme) => theme.id === id) ?? DEFAULT_THEME;
}

/**
 * อ่านค่าที่เก็บใน DB → theme id
 * รองรับรูปแบบใหม่ { themeId } และรูปแบบเก่า { colors: {...} } (จับคู่จาก bgFrom)
 */
export function resolveThemeId(raw: unknown): string {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  if (typeof input.themeId === "string") return themeById(input.themeId).id;

  const colors = input.colors;
  if (colors && typeof colors === "object") {
    const bgFrom = String((colors as Record<string, unknown>).bgFrom ?? "").toLowerCase();
    const matched = CARD_PRESETS.find((theme) => theme.colors.bgFrom.toLowerCase() === bgFrom);
    return matched?.id ?? DEFAULT_THEME_ID;
  }

  return DEFAULT_THEME_ID;
}

/** ข้อมูลที่เก็บลง card_layouts: { themeId, colors } */
export function themeToLayout(theme: CardTheme): { themeId: string; colors: CardColors } {
  return { themeId: theme.id, colors: { ...theme.colors } };
}
