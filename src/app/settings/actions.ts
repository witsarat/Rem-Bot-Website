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

/** บันทึกค่าสถานะบอท (Rich Presence) — เฉพาะเจ้าของบอท (ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ทุกครั้ง) */
export async function saveBotPresenceAction(formData: FormData): Promise<void> {
  // สำคัญ: อย่าเชื่อ UI — ตรวจจากเซสชันที่เซ็นแล้วฝั่งเซิร์ฟเวอร์เท่านั้น
  const session = await getSession();
  if (!session || !isOwner(session.id)) redirect("/settings?error=auth");

  const activityType = one(formData.get("activity_type"));
  const activityText = one(formData.get("activity_text"));
  const status = one(formData.get("status"));

  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType)) redirect("/settings?error=invalid");
  if (!(STATUSES as readonly string[]).includes(status)) redirect("/settings?error=invalid");
  if (!activityText || activityText.length > 128) redirect("/settings?error=invalid");

  try {
    await saveBotPresence({ activityType, activityText, status });
  } catch (error) {
    console.error("[settings] บันทึกค่าสถานะบอทไม่สำเร็จ:", error);
    redirect("/settings?error=save");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
