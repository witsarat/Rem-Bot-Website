"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_LAYOUT, encodeLayout, type CardLayout } from "@/lib/card";
import { saveCardLayout } from "@/app/dashboard/actions";
import { SubmitButton } from "./submit-button";

interface Props {
  guildId: string;
  guildName: string;
  initialLayout: CardLayout;
  previewOrigin: string;
}

type BlockKind = "avatar" | "name" | "stats" | "band" | "logo";

const BLOCKS: Array<{ kind: BlockKind; label: string }> = [
  { kind: "avatar", label: "รูปโปรไฟล์" },
  { kind: "name", label: "ชื่อ" },
  { kind: "stats", label: "การ์ดสถิติ" },
  { kind: "band", label: "แถบอันดับ" },
  { kind: "logo", label: "โลโก้ RURU" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** หน้า Card Studio — ลาก/ย่อบล็อกบนพรีวิว แล้วบันทึกเป็นเลย์เอาต์ให้บอทใช้ */
export function CardEditor({ guildId, guildName, initialLayout, previewOrigin }: Props) {
  const [layout, setLayout] = useState<CardLayout>(initialLayout);
  const [debounced, setDebounced] = useState<CardLayout>(initialLayout);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showGuides, setShowGuides] = useState(true);
  const [active, setActive] = useState<BlockKind | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // พรีวิว: หน่วง 220ms กันยิงบอทถี่ตอนลาก
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(layout), 220);
    return () => clearTimeout(timer);
  }, [layout]);

  useEffect(() => {
    setPreviewUrl(`${previewOrigin}/preview/profile?layout=${encodeLayout(debounced)}`);
  }, [debounced, previewOrigin]);

  /** เริ่มลาก/ย่อบล็อก (mode = move | resize) */
  const start = (event: React.PointerEvent, kind: BlockKind, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();

    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = layout.width / rect.width;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = structuredClone(layout);
    setActive(kind);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) * scale;
      const dy = (moveEvent.clientY - startY) * scale;

      setLayout((prev) => {
        const next = structuredClone(prev);
        if (mode === "move") {
          if (kind === "avatar") {
            next.avatar.x = clamp(origin.avatar.x + dx, 0, next.width);
            next.avatar.y = clamp(origin.avatar.y + dy, 0, next.height);
          } else if (kind === "name") {
            next.name.x = clamp(origin.name.x + dx, 0, next.width);
            next.name.y = clamp(origin.name.y + dy, 0, next.height);
          } else if (kind === "stats") {
            next.stats.x = clamp(origin.stats.x + dx, 0, next.width);
            next.stats.y = clamp(origin.stats.y + dy, 0, next.height);
          } else if (kind === "band") {
            next.band.x = clamp(origin.band.x + dx, 0, next.width);
            next.band.y = clamp(origin.band.y + dy, 0, next.height);
          } else {
            next.logo.x = clamp(origin.logo.x + dx, 0, next.width);
            next.logo.y = clamp(origin.logo.y + dy, 0, next.height);
          }
        } else if (kind === "avatar") {
          next.avatar.size = clamp(origin.avatar.size + Math.max(dx, dy), 48, Math.min(360, next.height - 40));
        } else if (kind === "name") {
          next.name.size = clamp(origin.name.size + dy, 16, 72);
        } else if (kind === "stats") {
          next.stats.width = clamp(origin.stats.width + dx, 140, 460);
          next.stats.height = clamp(origin.stats.height + dy, 96, 300);
        } else if (kind === "band") {
          next.band.width = clamp(origin.band.width + dx, 200, next.width);
          next.band.height = clamp(origin.band.height + dy, 56, 160);
        } else {
          next.logo.size = clamp(origin.logo.size + Math.max(dx, dy), 16, 64);
        }
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setActive(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  const box = (kind: BlockKind) => {
    const style: React.CSSProperties = {
      left: pct(
        kind === "avatar" ? layout.avatar.x - layout.avatar.size / 2
        : kind === "name" ? layout.name.x
        : kind === "stats" ? layout.stats.x
        : kind === "band" ? layout.band.x
        : layout.logo.x - layout.logo.size,
        layout.width,
      ),
      top: pct(
        kind === "avatar" ? layout.avatar.y - layout.avatar.size / 2
        : kind === "name" ? layout.name.y - layout.name.size
        : kind === "stats" ? layout.stats.y
        : kind === "band" ? layout.band.y
        : layout.logo.y - layout.logo.size,
        layout.height,
      ),
      width: pct(
        kind === "avatar" ? layout.avatar.size
        : kind === "name" ? Math.max(200, layout.width - layout.name.x - 40)
        : kind === "stats" ? layout.stats.width * 3 + layout.stats.gap * 2
        : kind === "band" ? layout.band.width
        : layout.logo.size + 70,
        layout.width,
      ),
      height: pct(
        kind === "avatar" ? layout.avatar.size
        : kind === "name" ? layout.name.size * 2.1
        : kind === "stats" ? layout.stats.height
        : kind === "band" ? layout.band.height
        : layout.logo.size,
        layout.height,
      ),
    };

    return style;
  };

  const colorField = (key: keyof CardLayout["colors"], label: string) => (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="color"
          value={layout.colors[key]}
          onChange={(event) =>
            setLayout((prev) => ({ ...prev, colors: { ...prev.colors, [key]: event.target.value } }))
          }
          className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
        <code className="w-[68px] text-[11px] text-slate-500">{layout.colors[key]}</code>
      </span>
    </label>
  );

  const numberField = (
    label: string,
    value: number,
    onChange: (next: number) => void,
    min: number,
    max: number,
  ) => (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs tabular-nums"
      />
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── พรีวิว + กรอบลาก ── */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            ลากบล็อกเพื่อย้าย • ลากมุมขวาล่างเพื่อย่อ/ขยาย • พรีวิวเรนเดอร์จริงจากบอท
          </p>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(event) => setShowGuides(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            แสดงกรอบ
          </label>
        </div>

        <div
          ref={frameRef}
          className="relative select-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-900"
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="ตัวอย่างการ์ด"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">กำลังโหลดพรีวิว…</div>
          )}

          {showGuides
            ? BLOCKS.map(({ kind, label }) => (
                <div
                  key={kind}
                  onPointerDown={(event) => start(event, kind, "move")}
                  className={`absolute cursor-move rounded-lg border-2 border-dashed transition-colors ${
                    active === kind ? "border-blue-500 bg-blue-500/10" : "border-white/45 hover:border-white/80"
                  }`}
                  style={box(kind)}
                  title={`ลากเพื่อย้าย ${label}`}
                >
                  <span className="pointer-events-none absolute -top-2.5 left-1 rounded bg-white/90 px-1.5 text-[10px] font-medium text-slate-700">
                    {label}
                  </span>
                  <span
                    onPointerDown={(event) => start(event, kind, "resize")}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-blue-600"
                    title="ลากเพื่อย่อ/ขยาย"
                  />
                </div>
              ))
            : null}
        </div>

        <p className="mt-2 text-xs text-slate-400">
          ขนาดผืนการ์ด {layout.width} × {layout.height} px • ใช้กับ /profile ของเซิร์ฟเวอร์นี้
        </p>
      </div>

      {/* ── แผงควบคุม ── */}
      <form action={saveCardLayout} className="card h-fit p-5">
        <input type="hidden" name="guild_id" value={guildId} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />

        <h2 className="text-sm font-semibold text-slate-900">ปรับแต่งการ์ด</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{guildName}</p>

        <div className="mt-4 space-y-2">
          {numberField("ความกว้างผืนการ์ด", layout.width, (v) => setLayout({ ...layout, width: v }), 600, 1600)}
          {numberField("ความสูงผืนการ์ด", layout.height, (v) => setLayout({ ...layout, height: v }), 320, 900)}
          {numberField("ความโค้งมุม", layout.radius, (v) => setLayout({ ...layout, radius: v }), 0, 48)}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500">สี</p>
          {colorField("bgFrom", "พื้นหลัง (บน)")}
          {colorField("bgTo", "พื้นหลัง (ล่าง)")}
          {colorField("accent", "สีหลัก")}
          {colorField("accentSoft", "สีรอง")}
          {colorField("text", "ข้อความ")}
          {colorField("muted", "ข้อความรอง")}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500">ตำแหน่ง/ขนาด</p>
          {numberField("รูป X", layout.avatar.x, (v) => setLayout({ ...layout, avatar: { ...layout.avatar, x: v } }), 0, layout.width)}
          {numberField("รูป Y", layout.avatar.y, (v) => setLayout({ ...layout, avatar: { ...layout.avatar, y: v } }), 0, layout.height)}
          {numberField("ขนาดรูป", layout.avatar.size, (v) => setLayout({ ...layout, avatar: { ...layout.avatar, size: v } }), 48, 360)}
          {numberField("ชื่อ X", layout.name.x, (v) => setLayout({ ...layout, name: { ...layout.name, x: v } }), 0, layout.width)}
          {numberField("ชื่อ Y", layout.name.y, (v) => setLayout({ ...layout, name: { ...layout.name, y: v } }), 0, layout.height)}
          {numberField("ขนาดชื่อ", layout.name.size, (v) => setLayout({ ...layout, name: { ...layout.name, size: v } }), 16, 72)}
          {numberField("การ์ดสถิติ X", layout.stats.x, (v) => setLayout({ ...layout, stats: { ...layout.stats, x: v } }), 0, layout.width)}
          {numberField("การ์ดสถิติ Y", layout.stats.y, (v) => setLayout({ ...layout, stats: { ...layout.stats, y: v } }), 0, layout.height)}
          {numberField("ความกว้าง/ใบ", layout.stats.width, (v) => setLayout({ ...layout, stats: { ...layout.stats, width: v } }), 140, 460)}
          {numberField("ความสูง/ใบ", layout.stats.height, (v) => setLayout({ ...layout, stats: { ...layout.stats, height: v } }), 96, 300)}
          {numberField("ช่องไฟ", layout.stats.gap, (v) => setLayout({ ...layout, stats: { ...layout.stats, gap: v } }), 0, 80)}
          {numberField("แถบอันดับ X", layout.band.x, (v) => setLayout({ ...layout, band: { ...layout.band, x: v } }), 0, layout.width)}
          {numberField("แถบอันดับ Y", layout.band.y, (v) => setLayout({ ...layout, band: { ...layout.band, y: v } }), 0, layout.height)}
          {numberField("แถบอันดับ กว้าง", layout.band.width, (v) => setLayout({ ...layout, band: { ...layout.band, width: v } }), 200, layout.width)}
          {numberField("แถบอันดับ สูง", layout.band.height, (v) => setLayout({ ...layout, band: { ...layout.band, height: v } }), 56, 160)}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layout.band.enabled}
              onChange={(event) => setLayout({ ...layout, band: { ...layout.band, enabled: event.target.checked } })}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            แสดงแถบอันดับ
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layout.logo.enabled}
              onChange={(event) => setLayout({ ...layout, logo: { ...layout.logo, enabled: event.target.checked } })}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            แสดงโลโก้ RURU
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SubmitButton label="บันทึกการ์ด" />
          <button
            type="button"
            onClick={() => setLayout(structuredClone(DEFAULT_LAYOUT))}
            className="btn-secondary btn-sm"
          >
            รีเซ็ต
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <Link href={`/dashboard/${guildId}`} className="hover:text-slate-700">
            ← กลับหน้าตั้งค่าเซิร์ฟเวอร์
          </Link>
          <span>บันทึกแล้วมีผลทันทีกับ /profile</span>
        </div>
      </form>
    </div>
  );
}
