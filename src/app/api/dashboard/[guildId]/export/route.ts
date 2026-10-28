/**
 * GET /api/dashboard/[guildId]/export
 * ส่งออกประวัติ voice log เป็นไฟล์ CSV — เฉพาะแพ็กเกจ Premium
 * - ตรวจสิทธิ์ผู้ดูแลเซิร์ฟเวอร์จากเซสชันจริงทุกครั้ง (ไม่เชื่อ URL)
 * - จำกัด 50,000 แถวล่าสุด (กันหน่วยความจำระเบิดบน serverless)
 */
import { loadGuildAccess } from "@/lib/auth";
import { getVoiceLogsForExport, type VoiceEvent } from "@/lib/db";
import { getPremiumStatus } from "@/lib/premium";
import { formatDateTimeTH } from "@/lib/format";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<VoiceEvent, string> = {
  join: "เข้าห้อง",
  leave: "ออกจากห้อง",
  move: "ย้ายห้อง",
};

/** ห่อค่าด้วยเครื่องหมายคำพูดและ escape " ภายใน (มาตรฐาน CSV) */
function cell(value: string | null | undefined): string {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, context: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await context.params;

  if (!/^\d{17,20}$/.test(guildId)) {
    return new Response("ไอดีเซิร์ฟเวอร์ไม่ถูกต้อง", { status: 400 });
  }

  const access = await loadGuildAccess(guildId);
  if (!access.ok) {
    return new Response("ไม่มีสิทธิ์เข้าถึงเซิร์ฟเวอร์นี้ — กรุณาเข้าสู่ระบบใหม่", { status: 403 });
  }

  const premium = await getPremiumStatus(guildId);
  if (!premium.active) {
    return new Response("การส่งออก CSV เป็นฟีเจอร์ Premium — ดูรายละเอียดที่ /premium", { status: 403 });
  }

  const rows = await getVoiceLogsForExport(guildId);

  const header = ["เวลา", "สมาชิก", "User ID", "เหตุการณ์", "ห้อง", "จากห้อง", "ไปห้อง"];
  const lines = [
    header.map(cell).join(","),
    ...rows.map((row) =>
      [
        cell(formatDateTimeTH(row.createdAt)),
        cell(row.username),
        cell(row.userId),
        cell(EVENT_LABELS[row.event] ?? row.event),
        cell(row.channelName),
        cell(row.fromChannelName),
        cell(row.toChannelName),
      ].join(","),
    ),
  ];

  // \uFEFF (BOM) ให้ Excel อ่านภาษาไทยถูกต้อง
  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rem-voice-log-${guildId}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
