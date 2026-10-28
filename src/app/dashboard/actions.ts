"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loadGuildAccess } from "@/lib/auth";
import { upsertGuildSettings, upsertCardLayout } from "@/lib/db";
import { normalizeLayout } from "@/lib/card";

function normalizeChannelId(value: FormDataEntryValue | null): string | null | "invalid" {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^\d{17,20}$/.test(raw)) return "invalid";
  return raw;
}

/** บันทึกค่าห้อง (log + รายงานประจำสัปดาห์) — ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ทุกครั้ง */
export async function saveSettings(formData: FormData): Promise<void> {
  const guildId = String(formData.get("guild_id") ?? "").trim();
  if (!/^\d{17,20}$/.test(guildId)) redirect("/dashboard");

  const logChannel = normalizeChannelId(formData.get("log_channel"));
  const weeklyChannel = normalizeChannelId(formData.get("weekly_channel"));
  if (logChannel === "invalid" || weeklyChannel === "invalid") {
    redirect(`/dashboard/${guildId}?error=invalid`);
  }

  // สำคัญ: อย่าเชื่อ UI — ตรวจสิทธิ์จริงจากฝั่งเซิร์ฟเวอร์เสมอ
  const access = await loadGuildAccess(guildId);
  if (!access.ok) {
    redirect(`/dashboard/${guildId}?error=auth`);
  }

  try {
    await upsertGuildSettings(guildId, logChannel, weeklyChannel);
  } catch (error) {
    console.error("[dashboard] บันทึกค่าไม่สำเร็จ:", error);
    redirect(`/dashboard/${guildId}?error=save`);
  }

  revalidatePath(`/dashboard/${guildId}`);
  redirect(`/dashboard/${guildId}?saved=1`);
}

/** บันทึกเลย์เอาต์การ์ดจากหน้า Card Studio (ตรวจสิทธิ์ + clamp ค่าก่อนเก็บ) */
export async function saveCardLayout(formData: FormData): Promise<void> {
  const guildId = String(formData.get("guild_id") ?? "").trim();
  if (!/^\d{17,20}$/.test(guildId)) redirect("/dashboard");

  const access = await loadGuildAccess(guildId);
  if (!access.ok) redirect(`/dashboard/${guildId}/cards?error=auth`);

  const raw = formData.get("layout");
  const text = typeof raw === "string" ? raw : "";
  if (!text || text.length > 20_000) redirect(`/dashboard/${guildId}/cards?error=invalid`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    redirect(`/dashboard/${guildId}/cards?error=invalid`);
  }

  try {
    await upsertCardLayout(guildId, normalizeLayout(parsed), "profile");
  } catch (error) {
    console.error("[cards] บันทึกเลย์เอาต์ไม่สำเร็จ:", error);
    redirect(`/dashboard/${guildId}/cards?error=save`);
  }

  revalidatePath(`/dashboard/${guildId}/cards`);
  redirect(`/dashboard/${guildId}/cards?saved=1`);
}
