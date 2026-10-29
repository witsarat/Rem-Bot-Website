import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashHeader } from "@/components/dash-header";
import { CardEditor } from "@/components/card-editor";
import { removeCardBackground, uploadCardBackground } from "../../actions";
import { Note } from "@/components/note";
import { loadGuildAccess } from "@/lib/auth";
import { getCardBackgroundInfo, getCardLayoutRow } from "@/lib/db";
import { resolveThemeId } from "@/lib/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Studio",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "เซสชันหมดอายุหรือคุณไม่มีสิทธิ์ในเซิร์ฟเวอร์นี้ — กรุณาเข้าสู่ระบบใหม่",
  invalid: "ธีมที่เลือกไม่ถูกต้อง กรุณาลองใหม่",
  save: "บันทึกไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง",
  bg_missing: "ยังไม่ได้เลือกไฟล์ PNG",
  bg_size: "ไฟล์ใหญ่เกิน 2 MB — ลดขนาดหรือบีบอัดก่อนอัปโหลด",
  bg_type: "รองรับเฉพาะไฟล์ PNG เท่านั้น (ส่งออกจาก Canva เป็น PNG)",
  bg_dim: "ขนาดภาพไม่ตรง — /profile ต้อง 1000×560 px และ Weekly ต้อง 1000×620 px",
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
  const backgrounds = {
    profile: await getCardBackgroundInfo(guildId, "profile"),
    weekly: await getCardBackgroundInfo(guildId, "weekly"),
  };
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

        {/* ── พื้นหลังที่ออกแบบเอง (Canva) ── */}
        <section className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-slate-900">พื้นหลังการ์ดจาก Canva</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            อัปโหลดภาพพื้นหลังที่ออกแบบเอง (PNG) — บอทจะวาดข้อมูลทับในตำแหน่งเดิมโดยอัตโนมัติ
            {" "}ถ้าไม่อัปโหลดจะใช้ gradient ของธีมที่เลือก
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              { variant: "profile" as const, label: "การ์ด /profile", size: "1000×560 px" },
              { variant: "weekly" as const, label: "การ์ด Weekly", size: "1000×620 px" },
            ]).map((item) => {
              const info = backgrounds[item.variant];
              return (
                <div key={item.variant} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400">ต้องเป็น PNG ขนาด {item.size} • ไม่เกิน 2 MB</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        info ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {info ? "ใช้พื้นหลังแล้ว" : "ยังไม่มี"}
                    </span>
                  </div>

                  {info ? (
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {info.filename ?? "background.png"} · {(info.bytes / 1024).toFixed(0)} KB
                    </p>
                  ) : null}

                  <form action={uploadCardBackground} encType="multipart/form-data" className="mt-3 space-y-2">
                    <input type="hidden" name="guild_id" value={guildId} />
                    <input type="hidden" name="variant" value={item.variant} />
                    <input
                      type="file"
                      name="background"
                      accept="image/png"
                      required
                      className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
                    />
                    <button type="submit" className="btn-secondary btn-sm">
                      อัปโหลดพื้นหลัง
                    </button>
                  </form>

                  {info ? (
                    <form action={removeCardBackground} className="mt-2">
                      <input type="hidden" name="guild_id" value={guildId} />
                      <input type="hidden" name="variant" value={item.variant} />
                      <button type="submit" className="text-xs font-medium text-rose-600 hover:text-rose-700">
                        ลบพื้นหลังนี้
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            เคล็ดลับ: เปิดภาพ &quot;แม่แบบช่อง&quot; ในแชท แล้ววางเป็นเลเยอร์ล่างสุดใน Canva เพื่อดูว่าตรงไหนห้ามวางตัวอักษร
            — พื้นที่กรอบทั้งหมดบอทจะวาดทับ
          </p>
        </section>

        <div className="h-10" />
      </main>
    </div>
  );
}
