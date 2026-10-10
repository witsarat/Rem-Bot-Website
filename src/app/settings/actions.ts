"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/owner";
import { saveBotPresence } from "@/lib/db";

const ACTIVITY_TYPES = ["Playing", "Watching", "Listening", "Competing"] as const;
const STATUSES = ["online", "idle", "dnd", "invisible"] as const;

function one(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpsUrl(value: string): boolean {
  return value === "" || /^https:\/\/\S+$/i.test(value);
}

/** บันทึกค่าสถานะบอท (Rich Presence) — เฉพาะเจ้าของบอท (ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ทุกครั้ง) */
export async function saveBotPresenceAction(formData: FormData): Promise<void> {
  // สำคัญ: อย่าเชื่อ UI — ตรวจจากเซสชันที่เซ็นแล้วฝั่งเซิร์ฟเวอร์เท่านั้น
  const session = await getSession();
  if (!session || !isOwner(session.id)) redirect("/settings?error=auth");

  const activityType = one(formData.get("activity_type"));
  const activityText = one(formData.get("activity_text"));
  const status = one(formData.get("status"));
  const details = one(formData.get("details"));
  const state = one(formData.get("state"));
  const showElapsed = one(formData.get("show_elapsed")) === "1";
  const largeImage = one(formData.get("large_image"));
  const largeText = one(formData.get("large_text"));
  const smallImage = one(formData.get("small_image"));
  const smallText = one(formData.get("small_text"));
  const button1Label = one(formData.get("button1_label"));
  const button1Url = one(formData.get("button1_url"));
  const button2Label = one(formData.get("button2_label"));
  const button2Url = one(formData.get("button2_url"));

  const invalid = (): never => redirect("/settings?error=invalid");

  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType)) invalid();
  if (!(STATUSES as readonly string[]).includes(status)) invalid();
  if (!activityText || activityText.length > 128) invalid();
  if (details.length > 128 || state.length > 128) invalid();
  if (largeText.length > 128 || smallText.length > 128) invalid();
  if (!isHttpsUrl(largeImage) || largeImage.length > 512) invalid();
  if (!isHttpsUrl(smallImage) || smallImage.length > 512) invalid();
  if (button1Label.length > 32 || button2Label.length > 32) invalid();
  if (!isHttpsUrl(button1Url) || button1Url.length > 512) invalid();
  if (!isHttpsUrl(button2Url) || button2Url.length > 512) invalid();
  // ปุ่มต้องกรอกคู่กัน (ป้าย + ลิงก์) ไม่งั้นถือว่าไม่ถูกต้อง
  if ((button1Label === "") !== (button1Url === "")) invalid();
  if ((button2Label === "") !== (button2Url === "")) invalid();

  try {
    await saveBotPresence({
      activityType,
      activityText,
      status,
      details,
      state,
      showElapsed,
      largeImage,
      largeText,
      smallImage,
      smallText,
      button1Label,
      button1Url,
      button2Label,
      button2Url,
    });
  } catch (error) {
    console.error("[settings] บันทึกค่าสถานะบอทไม่สำเร็จ:", error);
    redirect("/settings?error=save");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
