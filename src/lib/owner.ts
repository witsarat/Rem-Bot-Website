/**
 * ผู้ดูแลบอท (เจ้าของ) — เฉพาะบัญชี Discord นี้เท่านั้นที่ตั้งค่าเกี่ยวกับบอทได้
 * ใช้ตรวจทั้งตอนแสดงหน้า และตอนบันทึก (ตรวจฝั่งเซิร์ฟเวอร์เสมอ)
 */

/** Discord ID ของเจ้าของบอท */
export const OWNER_DISCORD_ID = "677454970269728768";

/** ตรวจว่าผู้ใช้ที่ login อยู่เป็นเจ้าของบอทหรือไม่ */
export function isOwner(userId: string | null | undefined): boolean {
  return typeof userId === "string" && userId === OWNER_DISCORD_ID;
}
