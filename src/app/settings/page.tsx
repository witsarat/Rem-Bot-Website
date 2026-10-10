import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader } from "@/components/dash-header";
import { LoginPrompt } from "@/components/login-prompt";
import { Note } from "@/components/note";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/owner";
import { getBotPresence } from "@/lib/db";
import { PresenceForm } from "./presence-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ตั้งค่าบอท",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "เฉพาะเจ้าของบอทเท่านั้นที่ตั้งค่าได้ — กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของ",
  invalid:
    "ค่าไม่ถูกต้อง — ลิงก์ต้องขึ้นต้นด้วย https:// · ปุ่มต้องกรอกคู่ (ป้าย + ลิงก์) · ข้อความห้ามยาวเกินกำหนด",
  save: "บันทึกค่าไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง",
};

function one(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function SettingsPage(props: PageProps<"/settings">) {
  const searchParams = await props.searchParams;
  const saved = one(searchParams.saved) === "1";
  const errorCode = one(searchParams.error);

  const session = await getSession();

  // ต้องเข้าสู่ระบบด้วยบัญชีเจ้าของบอทเท่านั้น
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashHeader session={null} />
        <LoginPrompt variant="login" />
      </div>
    );
  }

  if (!isOwner(session.id)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashHeader session={session} />
        <div className="mx-auto max-w-md px-4 py-20">
          <div className="card p-8 text-center">
            <h1 className="text-lg font-semibold text-slate-900">เฉพาะเจ้าของบอทเท่านั้น</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              หน้านี้ใช้ตั้งค่าสถานะของบอท (Rich Presence) — แก้ไขได้เฉพาะบัญชีเจ้าของบอทเท่านั้น
            </p>
            <Link href="/dashboard" className="btn-secondary mt-6">
              กลับไปหน้าแดชบอร์ด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const presence = await getBotPresence();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm text-slate-500 transition-colors hover:text-slate-800">
          ← เซิร์ฟเวอร์ทั้งหมด
        </Link>

        <div className="mt-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">ตั้งค่าบอท</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            ปรับสถานะ (Rich Presence) แนวเดียวกับส่วนขยาย Discord ของ VS Code — ข้อความหลัก บรรทัดรายละเอียด
            เวลาทำงาน รูปภาพ และปุ่มลิงก์ · เห็นและแก้ไขได้เฉพาะเจ้าของบอท
          </p>
        </div>

        {saved ? (
          <Note tone="emerald">บันทึกการตั้งค่าเรียบร้อยแล้ว — บอทจะอัปเดตสถานะภายใน ~30 วินาที</Note>
        ) : null}
        {errorCode ? (
          <Note tone="rose">{ERROR_MESSAGES[errorCode] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}</Note>
        ) : null}

        <PresenceForm defaults={presence} />
      </main>
    </div>
  );
}
