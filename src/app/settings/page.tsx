import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader } from "@/components/dash-header";
import { LoginPrompt } from "@/components/login-prompt";
import { Note } from "@/components/note";
import { SubmitButton } from "@/components/submit-button";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/owner";
import { getBotPresence } from "@/lib/db";
import { saveBotPresenceAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ตั้งค่าบอท",
};

const ACTIVITY_OPTIONS = [
  { value: "Playing", label: "กำลังเล่น (Playing)" },
  { value: "Watching", label: "กำลังดู (Watching)" },
  { value: "Listening", label: "กำลังฟัง (Listening)" },
  { value: "Competing", label: "กำลังแข่งขัน (Competing)" },
] as const;

const STATUS_OPTIONS = [
  { value: "online", label: "ออนไลน์ (online)" },
  { value: "idle", label: "รอสาย (idle)" },
  { value: "dnd", label: "ห้ามรบกวน (dnd)" },
  { value: "invisible", label: "ล่องหน (invisible)" },
] as const;

const TYPE_VERBS: Record<string, string> = {
  Playing: "กำลังเล่น",
  Watching: "กำลังดู",
  Listening: "กำลังฟัง",
  Competing: "กำลังแข่งขัน",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "เฉพาะเจ้าของบอทเท่านั้นที่ตั้งค่าได้ — กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของ",
  invalid: "รูปแบบค่าที่ส่งมาไม่ถูกต้อง กรุณาลองใหม่",
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
  const sample = `${TYPE_VERBS[presence.activityType] ?? "กำลังดู"} ${presence.activityText}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm text-slate-500 transition-colors hover:text-slate-800">
          ← เซิร์ฟเวอร์ทั้งหมด
        </Link>

        <div className="mt-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">ตั้งค่าบอท</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            ตั้งค่าสถานะ (Rich Presence) ที่แสดงใต้ชื่อบอทในดิสคอร์ด — หน้านี้เห็นและแก้ไขได้เฉพาะเจ้าของบอทเท่านั้น
          </p>
        </div>

        {saved ? (
          <Note tone="emerald">บันทึกการตั้งค่าเรียบร้อยแล้ว — บอทจะอัปเดตสถานะภายใน ~30 วินาที</Note>
        ) : null}
        {errorCode ? (
          <Note tone="rose">{ERROR_MESSAGES[errorCode] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}</Note>
        ) : null}

        <form action={saveBotPresenceAction} className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-slate-900">สถานะที่แสดง (Rich Presence)</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            ตัวอย่างปัจจุบัน: <span className="font-medium text-slate-700">{sample}</span>
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="activity_type">
                ประเภทกิจกรรม
              </label>
              <select id="activity_type" name="activity_type" defaultValue={presence.activityType} className="input">
                {ACTIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">คำนำหน้าที่แสดงก่อนข้อความ เช่น “กำลังดู …”</p>
            </div>
            <div>
              <label className="label" htmlFor="status">
                สถานะออนไลน์
              </label>
              <select id="status" name="status" defaultValue={presence.status} className="input">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">จุดสีข้างชื่อบอท (ล่องหน = ดูเหมือนออฟไลน์)</p>
            </div>
          </div>

          <div className="mt-5">
            <label className="label" htmlFor="activity_text">
              ข้อความสถานะ
            </label>
            <input
              id="activity_text"
              name="activity_text"
              maxLength={128}
              defaultValue={presence.activityText}
              placeholder="บันทึก Voice Log 🔊"
              className="input"
            />
            <p className="mt-1.5 text-xs leading-5 text-slate-400">ไม่เกิน 128 ตัวอักษร — แสดงกับบอททุกเซิร์ฟเวอร์</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <SubmitButton label="บันทึกการตั้งค่า" />
            <p className="text-xs text-slate-400">เฉพาะเจ้าของบอทเท่านั้นที่บันทึกได้</p>
          </div>
        </form>
      </main>
    </div>
  );
}
