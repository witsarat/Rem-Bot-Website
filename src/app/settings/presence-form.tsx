"use client";

import { useEffect, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { BotPresenceSettings } from "@/lib/db";
import { saveBotPresenceAction } from "./actions";

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

const STATUS_TEXT: Record<string, string> = {
  online: "ออนไลน์",
  idle: "รอสาย",
  dnd: "ห้ามรบกวน",
  invisible: "ล่องหน",
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  dnd: "bg-rose-500",
  invisible: "bg-slate-400",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function isHttps(value: string): boolean {
  return /^https:\/\/\S+/i.test(value.trim());
}

export function PresenceForm({ defaults }: { defaults: BotPresenceSettings }) {
  const [activityType, setActivityType] = useState(defaults.activityType);
  const [activityText, setActivityText] = useState(defaults.activityText);
  const [status, setStatus] = useState(defaults.status);
  const [details, setDetails] = useState(defaults.details);
  const [stateText, setStateText] = useState(defaults.state);
  const [showElapsed, setShowElapsed] = useState(defaults.showElapsed);
  const [largeImage, setLargeImage] = useState(defaults.largeImage);
  const [largeText, setLargeText] = useState(defaults.largeText);
  const [smallImage, setSmallImage] = useState(defaults.smallImage);
  const [smallText, setSmallText] = useState(defaults.smallText);
  const [btn1Label, setBtn1Label] = useState(defaults.button1Label);
  const [btn1Url, setBtn1Url] = useState(defaults.button1Url);
  const [btn2Label, setBtn2Label] = useState(defaults.button2Label);
  const [btn2Url, setBtn2Url] = useState(defaults.button2Url);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!showElapsed) return;
    const timer = setInterval(() => setElapsedSec((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [showElapsed]);

  const previewButtons = [
    { label: btn1Label, url: btn1Url },
    { label: btn2Label, url: btn2Url },
  ].filter((button) => button.label || button.url);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ─── ฟอร์ม ─── */}
      <form action={saveBotPresenceAction} className="card order-2 p-6 lg:order-1">
        <h2 className="text-base font-semibold text-slate-900">สถานะที่แสดง (Rich Presence)</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          เติมได้ครบทุกช่อง — เว้นว่างช่องที่ไม่ใช้ได้เลย
        </p>

        {/* ข้อมูลหลัก */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="activity_type">
              ประเภทกิจกรรม
            </label>
            <select
              id="activity_type"
              name="activity_type"
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
              className="input"
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">
              สถานะออนไลน์
            </label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="input"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="label" htmlFor="activity_text">
            ข้อความหลัก
          </label>
          <input
            id="activity_text"
            name="activity_text"
            maxLength={128}
            value={activityText}
            onChange={(event) => setActivityText(event.target.value)}
            placeholder="บันทึก Voice Log 🔊"
            className="input"
          />
          <p className="mt-1.5 text-xs leading-5 text-slate-400">
            แสดงบรรทัดหลักใต้ชื่อบอท เช่น “กำลังดู บันทึก Voice Log 🔊”
          </p>
        </div>

        {/* บรรทัดรายละเอียด */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">บรรทัดรายละเอียด (แบบ VS Code)</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="details">
                บรรทัดที่ 1 — รายละเอียด
              </label>
              <input
                id="details"
                name="details"
                maxLength={128}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="เช่น กำลังบันทึกเสียงอยู่ 12 เซิร์ฟเวอร์"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="state">
                บรรทัดที่ 2 — สถานะ
              </label>
              <input
                id="state"
                name="state"
                maxLength={128}
                value={stateText}
                onChange={(event) => setStateText(event.target.value)}
                placeholder="เช่น Workspace: MasterDarkMD"
                className="input"
              />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="show_elapsed"
              value="1"
              checked={showElapsed}
              onChange={(event) => setShowElapsed(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
            />
            แสดงเวลาทำงาน (elapsed) — นับจากเวลาที่บอทออนไลน์
          </label>
        </div>

        {/* รูปภาพ */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">รูปภาพ (ไม่บังคับ — ลิงก์ https://)</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="large_image">
                รูปใหญ่
              </label>
              <input
                id="large_image"
                name="large_image"
                value={largeImage}
                onChange={(event) => setLargeImage(event.target.value)}
                placeholder="https://..."
                className="input"
              />
              <label className="label mt-3" htmlFor="large_text">
                ข้อความเมื่อชี้ที่รูปใหญ่
              </label>
              <input
                id="large_text"
                name="large_text"
                maxLength={128}
                value={largeText}
                onChange={(event) => setLargeText(event.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="small_image">
                รูเล็ก (มุมขวาล่าง)
              </label>
              <input
                id="small_image"
                name="small_image"
                value={smallImage}
                onChange={(event) => setSmallImage(event.target.value)}
                placeholder="https://..."
                className="input"
              />
              <label className="label mt-3" htmlFor="small_text">
                ข้อความเมื่อชี้ที่รูเล็ก
              </label>
              <input
                id="small_text"
                name="small_text"
                maxLength={128}
                value={smallText}
                onChange={(event) => setSmallText(event.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* ปุ่มลิงก์ */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">ปุ่มลิงก์ (สูงสุด 2 ปุ่ม)</h3>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
              <input
                name="button1_label"
                maxLength={32}
                value={btn1Label}
                onChange={(event) => setBtn1Label(event.target.value)}
                placeholder="ป้ายปุ่ม 1"
                className="input"
              />
              <input
                name="button1_url"
                value={btn1Url}
                onChange={(event) => setBtn1Url(event.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
              <input
                name="button2_label"
                maxLength={32}
                value={btn2Label}
                onChange={(event) => setBtn2Label(event.target.value)}
                placeholder="ป้ายปุ่ม 2"
                className="input"
              />
              <input
                name="button2_url"
                value={btn2Url}
                onChange={(event) => setBtn2Url(event.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">กรอกคู่กันทั้งป้ายและลิงก์ — เว้นว่างทั้งคู่เพื่อไม่ใช้</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
          <SubmitButton label="บันทึกการตั้งค่า" />
          <p className="text-xs text-slate-400">เฉพาะเจ้าของบอทเท่านั้นที่บันทึกได้ — บอทอัปเดตภายใน ~30 วินาที</p>
        </div>
      </form>

      {/* ─── พรีวิวสด ─── */}
      <aside className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-6">
          <p className="text-xs font-medium text-slate-500">ตัวอย่าง (จำลองการแสดงผลในดิสคอร์ด)</p>
          <div className="mt-2 rounded-2xl bg-slate-900 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
                R
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  Rem
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[status] ?? "bg-slate-400"}`} />
                  <span className="text-[11px] font-normal text-slate-300">{STATUS_TEXT[status] ?? ""}</span>
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {TYPE_VERBS[activityType] ?? "กำลังดู"}
                </p>
                <p className="text-[13px] font-medium leading-5 text-slate-100">{activityText || "—"}</p>
                {details ? <p className="mt-1 text-xs leading-5 text-slate-300">{details}</p> : null}
                {stateText ? <p className="text-xs leading-5 text-slate-300">{stateText}</p> : null}
                {showElapsed ? (
                  <p className="mt-1 text-[11px] tabular-nums text-slate-400">
                    ⏱ ทำงานมาแล้ว {formatHMS(elapsedSec)}
                  </p>
                ) : null}
              </div>
              {isHttps(largeImage) || isHttps(smallImage) ? (
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  {isHttps(largeImage) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={largeImage}
                      alt=""
                      title={largeText || undefined}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : null}
                  {isHttps(smallImage) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={smallImage}
                      alt=""
                      title={smallText || undefined}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            {previewButtons.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {previewButtons.map((button, index) =>
                  isHttps(button.url) ? (
                    <a
                      key={index}
                      href={button.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-slate-700/80 px-3 py-1.5 text-center text-xs font-medium text-slate-100 hover:bg-slate-700"
                    >
                      {button.label || "ปุ่มลิงก์"}
                    </a>
                  ) : (
                    <span
                      key={index}
                      className="rounded-md bg-slate-700/80 px-3 py-1.5 text-center text-xs font-medium text-slate-100"
                    >
                      {button.label || "ปุ่มลิงก์"}
                    </span>
                  ),
                )}
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            หมายเหตุ: บัญชีบอทของ Discord แสดงบางฟิลด์ได้จำกัด — ข้อความหลัก · บรรทัดสถานะ · จุดสี
            แสดงแน่นอน ส่วนเวลา/รูป/ปุ่ม ขึ้นกับเวอร์ชัน Discord
          </p>
        </div>
      </aside>
    </div>
  );
}
