import type { Metadata } from "next";
import Link from "next/link";
import { LiteHeader } from "@/components/lite-header";
import { IconCheck } from "@/components/icons";
import { FREE_HISTORY_DAYS, PREMIUM_FEATURES, PREMIUM_PERIOD_DAYS, PREMIUM_PRICE_THB } from "@/lib/premium";

export const metadata: Metadata = {
  title: "แพ็กเกจ Premium",
  description: `Ruru Premium ${PREMIUM_PRICE_THB} บาท/เดือน ต่อเซิร์ฟเวอร์ — อันดับตลอดกาล การ์ดสมาชิกเต็มรูปแบบ รายงานอัตโนมัติ ประวัติทั้งหมด และส่งออก CSV`,
};

const CONTACT_URL = `https://github.com/witsarat/Rem-Bot-Discord/issues/new?title=${encodeURIComponent(
  "ขอเปิดใช้ Premium",
)}&body=${encodeURIComponent("เซิร์ฟเวอร์ (ชื่อ + ID):\nแพ็กเกจที่ต้องการ: Premium 29 บาท/เดือน\nช่องทางติดต่อกลับ:")}`;

const FAQS = [
  {
    q: `"ต่อเซิร์ฟเวอร์" หมายความว่าอย่างไร?`,
    a: `จ่าย ${PREMIUM_PRICE_THB} บาทต่อเดือนสำหรับ 1 เซิร์ฟเวอร์ (1 Discord server) — ถ้าคุณดูแล 3 เซิร์ฟเวอร์ที่ต้องการฟีเจอร์ Premium ก็เปิดแยกทีละเซิร์ฟเวอร์ได้ ไม่ผูกกับบัญชีผู้ใช้`,
  },
  {
    q: "ยกเลิกแล้วข้อมูลที่บันทึกไว้หายไหม?",
    a: "ไม่หาย — ระบบยังบันทึก voice log ต่อและเก็บข้อมูลเดิมไว้ครบ เพียงแต่แดชบอร์ดจะแสดงย้อนหลัง 30 วัน และอันดับตลอดกาลจะถูกล็อก จนกว่าจะต่ออายุอีกครั้ง",
  },
  {
    q: "ชำระเงินอย่างไร?",
    a: `ตอนนี้ยังไม่เปิดระบบชำระเงินออนไลน์ — ติดต่อเจ้าของบอทผ่าน GitHub Issues เพื่อขอเปิดใช้ (${PREMIUM_PRICE_THB} บาท/เดือน) เจ้าของบอทจะเปิดสิทธิ์ให้ด้วยคำสั่ง /premium grant`,
  },
  {
    q: "ต่ออายุอัตโนมัติหรือไม่?",
    a: `ยังไม่มีระบบตัดเงินอัตโนมัติ — แต่ละรอบคือ ${PREMIUM_PERIOD_DAYS} วัน เมื่อใกล้หมดอายุให้ติดต่อขอต่อรอบถัดไป ระบบจะนับต่อจากวันเดิมถ้ายังไม่หมด (ไม่เสียวันที่เหลือ)`,
  },
  {
    q: "ราคาอาจขึ้นภายหลังหรือไม่?",
    a: "ราคาที่คุณจ่ายในแต่ละรอบถูกบันทึกไว้ในฐานข้อมูล หากมีการปรับราคาในอนาคต จะมีผลกับรอบใหม่เท่านั้น ไม่ย้อนหลัง",
  },
];

export default function PremiumPage() {
  const freeFeatures = PREMIUM_FEATURES.filter((row) => row.free !== "—");
  const premiumFeatures = PREMIUM_FEATURES.filter((row) => row.premium !== row.free);

  return (
    <div className="min-h-screen bg-white">
      <LiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        {/* Hero */}
        <div className="max-w-2xl">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            แพ็กเกจ <span className="hl">Premium</span> — {PREMIUM_PRICE_THB} บาท/เดือน
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            ต่อเซิร์ฟเวอร์ • ยกเลิกได้ทุกเมื่อ • ข้อมูล voice log ไม่หายแม้กลับไปใช้แพ็กเกจฟรี
            <br />
            ฟีเจอร์หลักยังใช้ฟรีทุกเซิร์ฟเวอร์ — Premium ปลดล็อกข้อมูลเชิงลึก ข้อมูลย้อนหลังทั้งหมด
            และรายงานอัตโนมัติ
          </p>
        </div>

        {/* การ์ดแพ็กเกจ */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Free</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              0 <span className="text-base font-medium text-slate-500">บาท</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">ทุกเซิร์ฟเวอร์ ไม่จำกัดจำนวน</p>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
              {freeFeatures.map((row) => (
                <li key={row.name} className="flex items-start gap-2.5">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {row.name}
                    <span className="text-slate-400"> — {row.free}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs leading-5 text-slate-400">
              ประวัติในแดชบอร์ด: {FREE_HISTORY_DAYS} วันล่าสุด • อันดับทั้งหมดและ CSV เป็นฟีเจอร์ Premium
            </p>
          </section>

          <section className="relative overflow-hidden rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-6">
            <span className="absolute right-5 top-5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              แนะนำ
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Premium</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {PREMIUM_PRICE_THB} <span className="text-base font-medium text-slate-500">บาท/เดือน</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">ต่อ 1 เซิร์ฟเวอร์ • รอบละ {PREMIUM_PERIOD_DAYS} วัน</p>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
              {premiumFeatures.map((row) => (
                <li key={row.name} className="flex items-start gap-2.5">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    {row.name}
                    <span className="text-slate-500"> — {row.premium}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
              ติดต่อขอเปิดใช้
            </a>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              ยังไม่เปิดชำระเงินออนไลน์ — เจ้าของบอทเปิดสิทธิ์ให้ภายใน 1 วันทำการ
            </p>
          </section>
        </div>

        {/* ตารางเทียบ */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">เทียบฟีเจอร์ทั้งหมด</h2>
          <div className="card mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ฟีเจอร์</th>
                    <th className="px-4 py-3 font-medium">ฟรี</th>
                    <th className="px-4 py-3 font-medium text-blue-700">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PREMIUM_FEATURES.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3 text-slate-500">{row.free}</td>
                      <td className={`px-4 py-3 ${row.premiumOnly ? "font-medium text-blue-700" : "text-slate-700"}`}>
                        {row.premium}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* วิธีเปิดใช้ */}
        <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">เปิดใช้ Premium ตอนนี้</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>
              <span className="font-semibold text-slate-800">1. เตรียมเซิร์ฟเวอร์</span> — เชิญบอทเข้าเซิร์ฟเวอร์และให้คุณมีสิทธิ์ผู้ดูแล
            </li>
            <li>
              <span className="font-semibold text-slate-800">2. ติดต่อเจ้าของบอท</span> — แจ้งชื่อเซิร์ฟเวอร์ + ID ผ่าน{" "}
              <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="link">
                GitHub Issues
              </a>
            </li>
            <li>
              <span className="font-semibold text-slate-800">3. เจ้าของบอทเปิดสิทธิ์</span> — รัน{" "}
              <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12.5px]">
                /premium grant
              </code>{" "}
              แล้วเช็กสถานะด้วย{" "}
              <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12.5px]">
                /premium status
              </code>
            </li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            สิทธิ์มีผลทันทีทั้งใน Discord และแดชบอร์ด (ไม่ต้องรีสตาร์ทบอท) — เมื่อระบบชำระเงินออนไลน์พร้อม
            หน้านี้จะเปลี่ยนเป็นหน้าชำระเงินอัตโนมัติ
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">คำถามเกี่ยวกับ Premium</h2>
          <div className="mt-5 space-y-3">
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
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn-secondary">
            ไปที่แดชบอร์ด
          </Link>
          <Link href="/" className="btn-secondary">
            กลับหน้าแรก
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-slate-400 sm:px-6">
          <span>© 2569 Ruru — บอทบันทึกห้องเสียง Discord</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-600">
              ข้อกำหนดการให้บริการ
            </Link>
            <Link href="/privacy" className="hover:text-slate-600">
              นโยบายความเป็นส่วนตัว
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
