"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loadGuildAccess } from "@/lib/auth";
import {
  addRoleRewardDb,
  countRoleRewards,
  deleteRoleRewardDb,
  saveRewardConfigDb,
  upsertCardLayout,
  upsertGuildSettings,
} from "@/lib/db";
import { FREE_ROLE_REWARD_LIMIT, getPremiumStatus } from "@/lib/premium";
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

// ── Role rewards ───────────────────────────────────────────────

function checkbox(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

/** "3" ชั่วโมง → 10800 วินาที (คืน null ถ้าไม่ถูกต้อง) */
function parseHours(value: FormDataEntryValue | null): number | null {
  const hours = Number(typeof value === "string" ? value : "");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 2000) return null;
  return Math.round(hours * 3600);
}

async function requireGuildAdmin(formData: FormData): Promise<string> {
  const guildId = String(formData.get("guild_id") ?? "").trim();
  if (!/^\d{17,20}$/.test(guildId)) redirect("/dashboard");

  const access = await loadGuildAccess(guildId);
  if (!access.ok) redirect(`/dashboard/${guildId}/rewards?error=auth`);
  return guildId;
}

/** เปิด/ปิดโมดูล + ห้องประกาศ + โหมดเก็บยศ */
export async function saveRewardModule(formData: FormData): Promise<void> {
  const guildId = await requireGuildAdmin(formData);

  const rawChannel = String(formData.get("announce_channel") ?? "").trim();
  if (rawChannel && !/^\d{17,20}$/.test(rawChannel)) {
    redirect(`/dashboard/${guildId}/rewards?error=invalid`);
  }

  const retention = formData.get("retention") === "highest" ? "highest" : "all";

  try {
    await saveRewardConfigDb(guildId, {
      announceChannelId: rawChannel || null,
      rewardsEnabled: checkbox(formData, "rewards_enabled"),
      retention,
    });
  } catch (error) {
    console.error("[rewards] บันทึกค่าตั้งไม่สำเร็จ:", error);
    redirect(`/dashboard/${guildId}/rewards?error=save`);
  }

  revalidatePath(`/dashboard/${guildId}/rewards`);
  redirect(`/dashboard/${guildId}/rewards?saved=1`);
}

/** เพิ่มเกณฑ์ให้ยศ (ฟรีจำกัดจำนวนเกณฑ์) */
export async function addRoleReward(formData: FormData): Promise<void> {
  const guildId = await requireGuildAdmin(formData);

  const hours = parseHours(formData.get("threshold_hours"));
  const roleId = String(formData.get("role_id") ?? "").trim();

  if (hours === null || !/^\d{17,20}$/.test(roleId)) {
    redirect(`/dashboard/${guildId}/rewards?error=invalid`);
  }

  try {
    const [status, current] = await Promise.all([getPremiumStatus(guildId), countRoleRewards(guildId)]);
    if (!status.active && current >= FREE_ROLE_REWARD_LIMIT) {
      redirect(`/dashboard/${guildId}/rewards?error=limit`);
    }
    await addRoleRewardDb(guildId, hours, roleId);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("[rewards] เพิ่มเกณฑ์ยศไม่สำเร็จ:", error);
    redirect(`/dashboard/${guildId}/rewards?error=save`);
  }

  revalidatePath(`/dashboard/${guildId}/rewards`);
  redirect(`/dashboard/${guildId}/rewards?saved=1`);
}

/** ลบเกณฑ์ให้ยศ */
export async function removeRoleReward(formData: FormData): Promise<void> {
  const guildId = await requireGuildAdmin(formData);
  const id = String(formData.get("reward_id") ?? "").trim();
  if (!/^\d+$/.test(id)) redirect(`/dashboard/${guildId}/rewards?error=invalid`);

  try {
    await deleteRoleRewardDb(guildId, id);
  } catch (error) {
    console.error("[rewards] ลบเกณฑ์ยศไม่สำเร็จ:", error);
    redirect(`/dashboard/${guildId}/rewards?error=save`);
  }

  revalidatePath(`/dashboard/${guildId}/rewards`);
  redirect(`/dashboard/${guildId}/rewards?saved=1`);
}
