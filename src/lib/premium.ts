/**
 * ระบบ Premium ของเว็บ — 29 บาท/เดือน ต่อเซิร์ฟเวอร์
 *
 * อ่านสถานะจากตาราง guild_subscriptions (ตารางเดียวกับที่บอทเขียน)
 * ทั้งบอทและเว็บใช้ "ราคา/ฟีเจอร์/เพดานประวัติ" ชุดเดียวกันจากไฟล์นี้
 */
import { getGuildSubscription, type GuildSubscription } from "./db";

/** ราคาแพ็กเกจ Premium (บาท/เดือน ต่อเซิร์ฟเวอร์) */
export const PREMIUM_PRICE_THB = 29;
/** จำนวนวันต่อ 1 รอบบิล */
export const PREMIUM_PERIOD_DAYS = 30;
/** เซิร์ฟเวอร์ฟรีดูประวัติย้อนหลังได้กี่วัน */
export const FREE_HISTORY_DAYS = 30;
/** หน้าเว็บแพ็กเกจ */
export const PREMIUM_PATH = "/premium";

const DAY_MS = 86_400_000;

/** สถานะ Premium ที่หน้าเว็บใช้ (วันที่เป็น ISO string เพื่อส่งข้าม Server Component ได้) */
export interface PremiumStatus {
  active: boolean;
  priceThb: number;
  /** วันหมดอายุรอบปัจจุบัน (ISO) */
  currentPeriodEnd: string | null;
  /** เหลืออีกกี่วัน (ปัดขึ้น) */
  daysLeft: number | null;
  grantedBy: string | null;
}

export const FREE_STATUS: PremiumStatus = {
  active: false,
  priceThb: PREMIUM_PRICE_THB,
  currentPeriodEnd: null,
  daysLeft: null,
  grantedBy: null,
};

/** สถานะ Premium แบบฟรี (ใช้เมื่อไม่มีฐานข้อมูล/ยังไม่สมัคร) */
export function toPremiumStatus(subscription: GuildSubscription | null): PremiumStatus {
  if (!subscription) return FREE_STATUS;
  if (subscription.status !== "active") {
    return { ...FREE_STATUS, grantedBy: subscription.grantedBy, currentPeriodEnd: subscription.currentPeriodEnd };
  }

  const endMs = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
  const active = endMs === null ? true : endMs > Date.now();

  return {
    active,
    priceThb: subscription.priceThb ?? PREMIUM_PRICE_THB,
    currentPeriodEnd: subscription.currentPeriodEnd,
    daysLeft: endMs === null ? null : Math.max(0, Math.ceil((endMs - Date.now()) / DAY_MS)),
    grantedBy: subscription.grantedBy,
  };
}

/** อ่านสถานะ Premium ของเซิร์ฟเวอร์จากฐานข้อมูล */
export async function getPremiumStatus(guildId: string): Promise<PremiumStatus> {
  return toPremiumStatus(await getGuildSubscription(guildId));
}

/**
 * จุดตัดของประวัติ voice log ที่แพ็กเกจนี้ดูได้
 * - Premium → null (ทั้งหมด)
 * - ฟรี → 30 วันล่าสุด
 */
export function historyCutoff(status: PremiumStatus, now = Date.now()): Date | null {
  return status.active ? null : new Date(now - FREE_HISTORY_DAYS * DAY_MS);
}

/** ตารางเทียบฟีเจอร์ (ใช้ทั้งหน้าแรกและหน้า /premium) */
export interface PremiumFeature {
  name: string;
  free: string;
  premium: string;
  /** ฟีเจอร์นี้มีเฉพาะ Premium (ใช้เน้นสี/ไอคอน) */
  premiumOnly?: boolean;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  { name: "บันทึกเข้า–ออก–ย้ายห้องเสียง", free: "ไม่จำกัด", premium: "ไม่จำกัด" },
  { name: "คำสั่ง /setup • /help • /shake", free: "✓", premium: "✓" },
  { name: "/top 7 วัน / 30 วัน", free: "✓", premium: "✓" },
  { name: "/top ทั้งหมด (ตลอดกาล)", free: "—", premium: "✓", premiumOnly: true },
  { name: "/profile การ์ดสมาชิก", free: "✓", premium: "✓" },
  { name: "รายงานประจำสัปดาห์อัตโนมัติ", free: "ส่งทดสอบเอง (embed)", premium: "การ์ดรูปภาพ + ส่งทุกจันทร์ 09:00 น." },
  { name: "ประวัติในแดชบอร์ด", free: `${FREE_HISTORY_DAYS} วันล่าสุด`, premium: "ทั้งหมด", premiumOnly: true },
  { name: "ส่งออก CSV", free: "—", premium: "✓", premiumOnly: true },
];

/** วันที่แบบไทยสั้น เช่น "12 พ.ย. 2569" */
const TH_DATE = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

/** แปลงวันที่หมดอายุเป็นข้อความไทย (คืน "—" ถ้าไม่มี) */
export function formatPremiumDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return TH_DATE.format(date);
}
