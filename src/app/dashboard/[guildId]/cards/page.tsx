import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashHeader } from "@/components/dash-header";
import { CardEditor } from "@/components/card-editor";
import { Note } from "@/components/note";
import { loadGuildAccess } from "@/lib/auth";
import { getCardLayoutRow } from "@/lib/db";
import { resolveThemeId } from "@/lib/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Studio",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "เซสชันหมดอายุหรือคุณไม่มีสิทธิ์ในเซิร์ฟเวอร์นี้ — กรุณาเข้าสู่ระบบใหม่",
  invalid: "ธีมที่เลือกไม่ถูกต้อง กรุณาลองใหม่",
  save: "บันทึกไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง",
};

type CardsPageProps = {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CardsPage(props: CardsPageProps) {
  const { guildId } = await props.params;
  const searchParams = await props.searchParams;

  const access = await loadGuildAccess(guildId);
  if (!access.ok) redirect("/dashboard");

  const { session, guild } = access.data;
  const saved = searchParams.saved === "1";
  const errorCode = Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error;

  const stored = await getCardLayoutRow(guildId, "profile");
  const themeId = resolveThemeId(stored ?? undefined);
  const previewOrigin = (process.env.CARD_PREVIEW_ORIGIN ?? "https://rem-bot-discord.onrender.com").replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-slate-50">
      <DashHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href={`/dashboard/${guildId}`} className="text-sm text-slate-500 transition-colors hover:text-slate-800">
          ← กลับหน้าตั้งค่าเซิร์ฟเวอร์
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Card Studio</h1>
            <p className="mt-1 text-sm text-slate-500">
              เลือกธีมสีของการ์ด <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">/profile</code> และรายงาน
              Weekly ของ <span className="font-medium text-slate-700">{guild.name}</span> — พรีวิวมาจากตัวเรนเดอร์จริงของบอท
            </p>
          </div>
        </div>

        {saved ? <Note tone="emerald">บันทึกธีมการ์ดเรียบร้อย — มีผลกับการ์ด /profile และ Weekly ทันที</Note> : null}
        {errorCode ? <Note tone="rose">{ERROR_MESSAGES[errorCode] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}</Note> : null}

        <div className="mt-6">
          <CardEditor
            guildId={guildId}
            guildName={guild.name}
            initialThemeId={themeId}
            previewOrigin={previewOrigin}
          />
        </div>

        <div className="h-10" />
      </main>
    </div>
  );
}
