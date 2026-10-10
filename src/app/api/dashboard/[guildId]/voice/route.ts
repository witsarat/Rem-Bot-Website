import { NextResponse } from "next/server";
import { loadGuildAccess } from "@/lib/auth";
import { getVoiceSnapshot } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ข้อมูลสด: ห้องเสียง + คนที่อยู่ในห้อง (อ่านจาก snapshot ที่บอทซิงก์ไว้) */
export async function GET(_request: Request, context: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await context.params;
  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const access = await loadGuildAccess(guildId);
  if (!access.ok) {
    const status =
      access.reason === "no-session" ? 401 : access.reason === "no-access" ? 403 : 502;
    return NextResponse.json({ error: access.reason }, { status });
  }

  const snapshot = await getVoiceSnapshot(guildId);
  return NextResponse.json({ snapshot });
}
