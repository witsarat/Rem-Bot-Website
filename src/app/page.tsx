import Link from "next/link";
import { Brand } from "@/components/brand";
import { CopyInvite } from "@/components/copy-invite";
import {
  IconArrowsLeftRight,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconDatabase,
  IconDiscord,
  IconLayout,
  IconMic,
} from "@/components/icons";
import { getSiteStats } from "@/lib/db";
import { formatNumberTH } from "@/lib/format";
import { FREE_HISTORY_DAYS, PREMIUM_PRICE_THB } from "@/lib/premium";

export const dynamic = "force-dynamic";

const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1557023021825265775&permissions=8&integration_type=0&scope=bot+applications.commands";

const GITHUB_URL = "https://github.com/witsarat/Rem-Bot-Discord";

const FEATURES = [
  {
    icon: IconMic,
    title: "บันทึกเข้า–ออก–ย้าย",
    desc: "ทุกความเคลื่อนไหวในห้องเสียงถูกบันทึกทันที — ใคร เข้าห้องไหน เมื่อไร พร้อมชื่อห้องและเวลา",
  },
  {
    icon: IconChartBar,
    title: "จัดอันดับเวลาห้องเสียง",
    desc: "คำสั่ง /top — อันดับสมาชิกที่อยู่ในห้องเสียงนานที่สุด นับรวมทุกครั้ง เลือกช่วงเวลาได้ ดึงจากฐานข้อมูลโดยตรง",
  },
  {
    icon: IconCalendar,
    title: "รายงานประจำสัปดาห์",
    desc: "/weekly — สรุปภาพรวมของเซิร์ฟเวอร์ส่งอัตโนมัติทุกวันจันทร์ 09:00 น. พร้อมจัดอันดับ Top 5",
  },
  {
    icon: IconArrowsLeftRight,
    title: "เขย่าเรียกสมาชิก",
    desc: "/shake — ย้ายสมาชิกที่หลับคาห้องไปกลับ 5 ครั้งแล้วกลับห้องเดิม (ผู้ดูแลใช้ พร้อมคูลดาวน์กันกดรัว)",
  },
  {
    icon: IconLayout,
    title: "แดชบอร์ดจัดการเอง",
    desc: "เข้าสู่ระบบด้วย Discord แล้วเลือกห้องบันทึก ดูประวัติและสถิติ — เห็นเฉพาะเซิร์ฟเวอร์ที่คุณเป็นผู้ดูแล",
  },
  {
    icon: IconDatabase,
    title: "ข้อมูลอยู่ถาวร",
    desc: "ทุก log ถูกเก็บในฐานข้อมูล PostgreSQL — รีสตาร์ทหรือ deploy ใหม่กี่ครั้ง ประวัติก็ไม่หาย",
  },
];

const COMMANDS = [
  { cmd: "/setup", desc: "สร้างหรือเชื่อมห้อง #voice-logs และเปิดระบบบันทึกของเซิร์ฟเวอร์", access: "ผู้ดูแล" },
  { cmd: "/help", desc: "คู่มือการใช้งาน คำสั่งทั้งหมด และความหมายของสี — เห็นเฉพาะคุณ", access: "ทุกคน" },
  { cmd: "/top", desc: "อันดับเวลาอยู่ห้องเสียง — ทั้งหมด / 7 วัน / 30 วัน และดูรายคน", access: "ทุกคน" },
  { cmd: "/weekly", desc: "ตั้งค่าห้องรับรายงานประจำสัปดาห์ ปิด หรือส่งทดสอบ", access: "ผู้ดูแล" },
  { cmd: "/shake", desc: "เขย่าเรียกสมาชิกที่หลับคาห้อง ให้กลับมาว่องไว", access: "ผู้ดูแล" },
];

const STEPS = [
  {
    title: "เชิญบอทเข้าเซิร์ฟเวอร์",
    desc: "กดปุ่มเชิญ เลือกเซิร์ฟเวอร์ของคุณ แล้วกดอนุญาตสิทธิ์ — ใช้เวลาไม่ถึงหนึ่งนาที",
  },
  {
    title: "ให้ผู้ดูแลพิมพ์ /setup",
    desc: "บอทจะสร้างหรือเชื่อมห้อง #voice-logs ให้อัตโนมัติ ตั้งแต่นั้นระบบบันทึกทำงานเองทันที",
  },
  {
    title: "จัดการผ่านแดชบอร์ด",
    desc: "เข้าสู่ระบบด้วย Discord เพื่อเลือกห้อง ดูประวัติย้อนหลัง และสถิติได้ทุกเมื่อ",
  },
];

const FAQS = [
  {
    q: "บอทเก็บข้อมูลอะไรบ้าง?",
    a: "เก็บเฉพาะข้อมูลที่จำเป็นต่อระบบ voice log — ไอดีและชื่อผู้ใช้ Discord, เหตุการณ์เข้า–ออก–ย้ายห้องเสียง, ชื่อห้อง และเวลา ไม่เก็บข้อความแชท เนื้อหาเสียง หรือข้อมูลอื่น รายละเอียดทั้งหมดดูได้ในนโยบายความเป็นส่วนตัว",
  },
  {
    q: "ใช้ฟรีไหม จำกัดจำนวนเซิร์ฟเวอร์หรือเปล่า?",
    a: `ฟีเจอร์หลักใช้ฟรีและไม่จำกัดจำนวนเซิร์ฟเวอร์ — เป็นโปรเจกต์โอเพนซอร์ส โค้ดทั้งหมดดูได้บน GitHub ส่วนฟีเจอร์เชิงลึก (อันดับตลอดกาล, ประวัติเกิน ${FREE_HISTORY_DAYS} วัน, ส่งออก CSV และรายงานอัตโนมัติ) อยู่ในแพ็กเกจ Premium ${PREMIUM_PRICE_THB} บาท/เดือน ต่อเซิร์ฟเวอร์ — ดูรายละเอียดได้ที่หน้าแพ็กเกจ`,
  },
  {
    q: "ทำไมบางคนมองไม่เห็นคำสั่ง?",
    a: "ให้ลองกด Ctrl+R เพื่อรีเฟรช Discord สักครั้ง และตรวจว่าเชิญบอทด้วย scope applications.commands แล้ว — หรือลองให้ผู้ดูแลรัน npm run deploy ฝั่งเซิร์ฟเวอร์อีกครั้ง",
  },
  {
    q: "เปิดไมค์ ปิดกล้อง จะถูกบันทึกไหม?",
    a: "ไม่บันทึก — ระบบนับเฉพาะการเข้า ออก และย้ายห้องเสียงเท่านั้น และการเคลื่อนไหวของบอทด้วยกันเองก็ถูกข้ามเช่นกัน",
  },
  {
    q: "ดูประวัติย้อนหลังได้ที่ไหน?",
    a: "ที่แดชบอร์ดเว็บนี้ — เข้าสู่ระบบด้วย Discord แล้วเลือกเซิร์ฟเวอร์ที่คุณเป็นผู้ดูแล จะเห็นประวัติทั้งหมดพร้อมกรองตามประเภทเหตุการณ์",
  },
  {
    q: "Linked Roles (ยศแบบเชื่อมต่อ) ใช้ยังไง?",
    a: "ตั้งค่าเซิร์ฟเวอร์ → บทบาท → เลือกบทบาท → ลิงก์ → เพิ่มเงื่อนไข แล้วเลือก Ruru จากนั้นสมาชิกกดเชื่อมต่อบัญชีเพื่อรับยศอัตโนมัติ",
  },
];

const PREVIEW_ROWS = [
  { dot: "bg-emerald-500", text: "@SpecialXR เข้าห้องเสียง #General", time: "15:02" },
  { dot: "bg-amber-400", text: "@zeenLZP ย้ายห้อง #Lounge → #Gaming", time: "15:47" },
  { dot: "bg-rose-500", text: "@SpecialXR ออกจากห้องเสียง #General", time: "16:10" },
];

const LEADERBOARD_ROWS = [
  { rank: "1", name: "zeenLZP", time: "13 ชม. 40 น." },
  { rank: "2", name: "Ram", time: "5 ชม. 19 น." },
  { rank: "3", name: "Dewwy", time: "4 ชม. 15 น." },
];

function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {desc ? <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p> : null}
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />;
}

export default async function HomePage() {
  const stats = await getSiteStats();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ───── Nav ───── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <Brand />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">ฟีเจอร์</a>
            <a href="#commands" className="transition-colors hover:text-slate-900">คำสั่ง</a>
            <a href="#dashboard" className="transition-colors hover:text-slate-900">แดชบอร์ด</a>
            <a href="#pricing" className="transition-colors hover:text-slate-900">ราคา</a>
            <a href="#howto" className="transition-colors hover:text-slate-900">วิธีใช้งาน</a>
            <a href="#faq" className="transition-colors hover:text-slate-900">คำถามที่พบบ่อย</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block">
              เข้าสู่ระบบ
            </Link>
            <a href={INVITE_URL} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
              เพิ่มบอท
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ───── Hero ───── */}
        <section className="mx-auto grid max-w-6xl gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-20 lg:pt-20">
          <div>
            <p className="eyebrow">Voice Log Bot · Discord</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.18] tracking-tight sm:text-5xl lg:text-[54px]">
              บันทึก<span className="hl">ทุกเสียง</span>
              <br />
              ครบ<span className="hl">ทุกห้อง</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Ruru เก็บทุกการเข้า–ออก–ย้ายห้องเสียงของสมาชิกเป็น log อัตโนมัติ พร้อมอันดับเวลาห้องเสียง
              รายงานประจำสัปดาห์ และแดชบอร์ดสำหรับผู้ดูแล — เริ่มใช้ฟรีทุกเซิร์ฟเวอร์
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={INVITE_URL} target="_blank" rel="noreferrer" className="btn-primary">
                <IconDiscord className="h-4 w-4" />
                เพิ่มบอทเข้าเซิร์ฟเวอร์
              </a>
              <Link href="/dashboard" className="btn-secondary">
                เปิดแดชบอร์ด →
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-slate-500">
              <span>เริ่มใช้ฟรีทุกเซิร์ฟเวอร์</span>
              <Dot />
              <span>Premium 29 บาท/เดือน</span>
              <Dot />
              <span>ตั้งค่าใน 1 นาที</span>
              <Dot />
              <span>ข้อมูลเก็บถาวรในฐานข้อมูล</span>
            </div>
          </div>

          {/* คอลลาจการ์ดตัวอย่าง */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(10,10,16,0.35)]">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="ml-2 text-xs font-medium text-slate-500"># voice-logs</span>
                <span className="ml-auto text-[11px] text-slate-400">ตัวอย่าง</span>
              </div>
              <div className="divide-y divide-slate-100">
                {PREVIEW_ROWS.map((row) => (
                  <div key={row.time} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                    <span className="truncate text-slate-700">{row.text}</span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-400">{row.time}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                <span>ดูย้อนหลังทั้งหมดได้ในแดชบอร์ด</span>
                <Link href="/dashboard" className="font-medium text-blue-600 hover:text-blue-700">
                  เปิดแดชบอร์ด →
                </Link>
              </div>
            </div>

            <div className="relative z-10 -mt-5 ml-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-28px_rgba(10,10,16,0.35)]">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                อันดับเวลาห้องเสียง · ตัวอย่าง
              </p>
              <div className="mt-2 space-y-1">
                {LEADERBOARD_ROWS.map((row, index) => (
                  <div
                    key={row.rank}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${index === 0 ? "bg-blue-50" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                        index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{row.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───── สถิติจริง ───── */}
        <section className="border-y border-slate-200">
          <div className="mx-auto grid max-w-6xl px-4 sm:grid-cols-3 sm:px-6">
            {[
              { n: stats ? `${formatNumberTH(stats.total)}+` : "—", l: "รายการบันทึกแล้ว" },
              { n: stats ? formatNumberTH(stats.guilds) : "—", l: "เซิร์ฟเวอร์ที่ใช้งาน" },
              { n: stats ? formatNumberTH(stats.users) : "—", l: "สมาชิกที่มีข้อมูล" },
            ].map((item, index) => (
              <div
                key={item.l}
                className={`border-b border-slate-200 py-6 last:border-b-0 sm:border-b-0 ${
                  index > 0 ? "sm:border-l sm:border-slate-200 sm:pl-8" : ""
                }`}
              >
                <p className="text-3xl font-bold tabular-nums text-slate-900">{item.n}</p>
                <p className="mt-1 text-[12.5px] text-slate-500">{item.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── Features ───── */}
        <section id="features" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHead
              kicker="Features"
              title="ทำอะไรได้บ้าง"
              desc="ครบทุกอย่างที่เซิร์ฟเวอร์ต้องการ — พร้อมใช้งานทันทีหลังเชิญ ไม่ต้องเขียนโค้ดหรือตั้งค่าเพิ่ม"
            />
            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 p-6 transition-colors hover:border-blue-300"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Commands ───── */}
        <section id="commands" className="scroll-mt-20 border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHead
              kicker="Commands"
              title="คำสั่งทั้งหมดของ Ruru"
              desc="ติดตั้งอัตโนมัติให้ทุกเซิร์ฟเวอร์ที่บอทอยู่ — ขึ้นทันทีหลังเชิญ"
            />
            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {COMMANDS.map((command, index) => (
                <div
                  key={command.cmd}
                  className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 ${index !== 0 ? "border-t border-slate-100" : ""}`}
                >
                  <code className="w-24 shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-center text-[13px] font-bold text-blue-700">
                    {command.cmd}
                  </code>
                  <p className="min-w-0 flex-1 text-sm text-slate-600">{command.desc}</p>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      command.access === "ผู้ดูแล"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {command.access}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Pricing ───── */}
        <section id="pricing" className="scroll-mt-20 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHead
              kicker="Pricing"
              title="เริ่มฟรี — อัปเกรดเมื่ออยากได้ข้อมูลลึกขึ้น"
              desc={`ฟีเจอร์หลักใช้ฟรีทุกเซิร์ฟเวอร์ ส่วนแพ็กเกจ Premium ${PREMIUM_PRICE_THB} บาท/เดือน ต่อเซิร์ฟเวอร์ เพิ่มอันดับตลอดกาล ประวัติทั้งหมด รายงานอัตโนมัติ และส่งออก CSV`}
            />

            <div className="mt-11 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-slate-900">ฟรี</h3>
                  <p className="text-2xl font-bold text-slate-900">
                    0 <span className="text-sm font-medium text-slate-500">บาท</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-400">ทุกเซิร์ฟเวอร์ ไม่จำกัดจำนวน</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  {[
                    "บันทึกเข้า–ออก–ย้ายห้องเสียงไม่จำกัด",
                    "/top 7 วัน และ 30 วัน",
                    "/profile การ์ดสมาชิกแบบรูปภาพ",
                    `/ประวัติในแดชบอร์ด ${FREE_HISTORY_DAYS} วันล่าสุด`,
                    "/weekly ส่งทดสอบเองได้",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-6">
                <span className="absolute right-5 top-5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  แนะนำ
                </span>
                <div className="flex items-baseline justify-between pr-16">
                  <h3 className="text-base font-bold text-blue-700">Premium</h3>
                  <p className="text-2xl font-bold text-slate-900">
                    {PREMIUM_PRICE_THB} <span className="text-sm font-medium text-slate-500">บาท/เดือน</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">ต่อเซิร์ฟเวอร์ • ยกเลิกได้ทุกเมื่อ</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                  {[
                    "ทุกอย่างในแพ็กเกจฟรี",
                    "/top อันดับตลอดกาล",
                                        "รายงานประจำสัปดาห์ส่งอัตโนมัติทุกจันทร์ 09:00",
                    "ประวัติทั้งหมดในแดชบอร์ด + ส่งออก CSV",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/premium" className="btn-secondary">
                ดูรายละเอียดแพ็กเกจ →
              </Link>
              <p className="text-xs text-slate-400">ยังไม่เปิดชำระเงินออนไลน์ — ติดต่อเจ้าของบอทเพื่อเปิดใช้</p>
            </div>
          </div>
        </section>

        {/* ───── Dashboard ───── */}
        <section id="dashboard" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHead
                kicker="Dashboard"
                title="จัดการทุกอย่างได้เอง ไม่ต้องง้อคำสั่ง"
                desc="เข้าสู่ระบบด้วย Discord แล้วดูแลเซิร์ฟเวอร์ของคุณได้จากเบราว์เซอร์ — เห็นเฉพาะเซิร์ฟเวอร์ที่คุณเป็นผู้ดูแลเท่านั้น"
              />
              <ul className="mt-7 space-y-3 text-sm text-slate-600">
                {[
                  "เลือกห้องบันทึก voice log และห้องรับรายงานของแต่ละเซิร์ฟเวอร์",
                  "ดูประวัติการเข้า–ออก–ย้ายย้อนหลังทั้งหมด พร้อมกรองตามประเภท",
                  "ดูอันดับเวลาห้องเสียงและสถิติรวมของเซิร์ฟเวอร์",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className="btn-primary mt-7">
                <IconDiscord className="h-4 w-4" />
                เข้าสู่ระบบด้วย Discord
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(10,10,16,0.3)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">เซิร์ฟเวอร์ของคุณ</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> บอทออนไลน์
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                    SV
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">เซิร์ฟเวอร์ของฉัน</span>
                    <span className="text-[11px] text-emerald-700">บอทพร้อมใช้งาน</span>
                  </span>
                  <span className="text-slate-300">→</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    SV
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">เซิร์ฟเวอร์เพื่อน</span>
                    <span className="text-[11px] text-amber-700">ยังไม่ได้เพิ่มบอท</span>
                  </span>
                  <span className="text-slate-300">→</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── How to ───── */}
        <section id="howto" className="scroll-mt-20 border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHead
              kicker="How it works"
              title="เริ่มใช้ใน 3 ขั้นตอน"
              desc="ไม่ต้องมีความรู้เทคนิค — เชิญบอทแล้วใช้เซิร์ฟเวอร์ตามปกติได้เลย"
            />
            <div className="mt-11 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="text-4xl font-bold tabular-nums text-blue-600">0{index + 1}</span>
                  <h3 className="mt-3 text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
              <span className="font-medium text-slate-800">สีของ log:</span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> เขียว = เข้าห้อง
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> แดง = ออกจากห้อง
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> เหลือง = ย้ายห้อง
              </span>
            </div>
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <SectionHead kicker="FAQ" title="เรื่องที่คนถามบ่อย" />
            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="shrink-0 text-lg leading-none text-slate-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm leading-6 text-slate-600">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───── CTA ───── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-6 py-14 text-center sm:px-12">
            <p className="eyebrow">Get started</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              พร้อมให้ทุกห้องเสียงมีบันทึกหรือยัง?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              เชิญบอท แล้วให้ผู้ดูแลพิมพ์ /setup ในเซิร์ฟเวอร์ของคุณ — ใช้เวลาไม่ถึงหนึ่งนาที
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={INVITE_URL} target="_blank" rel="noreferrer" className="btn-primary">
                <IconDiscord className="h-4 w-4" />
                เพิ่มบอทเข้าเซิร์ฟเวอร์
              </a>
              <CopyInvite url={INVITE_URL} />
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              บอท Discord สำหรับบันทึกการเข้า–ออก–ย้ายห้องเสียง พร้อมระบบสถิติและแดชบอร์ดจัดการเซิร์ฟเวอร์
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">เมนู</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-slate-800">ฟีเจอร์</a></li>
              <li><a href="#commands" className="hover:text-slate-800">คำสั่ง</a></li>
              <li><a href="#pricing" className="hover:text-slate-800">ราคา</a></li>
              <li><a href="#howto" className="hover:text-slate-800">วิธีใช้งาน</a></li>
              <li><a href="#faq" className="hover:text-slate-800">คำถามที่พบบ่อย</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">ลิงก์</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/dashboard" className="hover:text-slate-800">แดชบอร์ด</Link></li>
              <li><Link href="/premium" className="hover:text-slate-800">แพ็กเกจ Premium</Link></li>
              <li><a href={INVITE_URL} target="_blank" rel="noreferrer" className="hover:text-slate-800">เพิ่มบอท</a></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-slate-800">GitHub</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">ข้อกำหนด</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/terms" className="hover:text-slate-800">ข้อกำหนดการให้บริการ</Link></li>
              <li><Link href="/privacy" className="hover:text-slate-800">นโยบายความเป็นส่วนตัว</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
          © 2569 Ruru — บอทบันทึกห้องเสียง Discord · โปรเจกต์โอเพนซอร์ส ไม่มีความเกี่ยวข้องกับ Discord Inc.
        </div>
      </footer>
    </div>
  );
}
