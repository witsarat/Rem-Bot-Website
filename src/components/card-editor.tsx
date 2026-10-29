"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CARD_PRESETS, themeById } from "@/lib/card";
import { saveCardTheme } from "@/app/dashboard/actions";
import { SubmitButton } from "./submit-button";

interface Props {
  guildId: string;
  guildName: string;
  initialThemeId: string;
  previewOrigin: string;
}

type View = "profile" | "weekly";

/** หน้า Card Studio — เลือกธีมสี 16 แบบ แล้วดูพรีวิวจากตัวเรนเดอร์จริงของบอท */
export function CardEditor({ guildId, guildName, initialThemeId, previewOrigin }: Props) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const [view, setView] = useState<View>("profile");

  const theme = themeById(themeId);
  const previewUrl = useMemo(
    () => `${previewOrigin}/preview/${view}?theme=${encodeURIComponent(themeId)}`,
    [previewOrigin, themeId, view],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── พรีวิว ── */}
      <section className="card h-fit overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(["profile", "weekly"] as View[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  view === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item === "profile" ? "/profile" : "Weekly"}
              </button>
            ))}
          </div>
          <span className="truncate text-xs text-slate-400">{guildName}</span>
        </div>

        <div className="bg-slate-100/70 p-3 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${themeId}-${view}`}
            src={previewUrl}
            alt={`ตัวอย่างการ์ดธีม ${theme.name}`}
            className="w-full rounded-xl shadow-sm ring-1 ring-black/5"
            width={1000}
            height={view === "profile" ? 560 : 620}
          />
        </div>

        <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
          พรีวิวเรนเดอร์จากบอทจริง — บันทึกธีมแล้วมีผลกับการ์ด /profile และรายงาน Weekly ทันที
        </p>
      </section>

      {/* ── เลือกธีม ── */}
      <form action={saveCardTheme} className="card h-fit p-5">
        <input type="hidden" name="guild_id" value={guildId} />
        <input type="hidden" name="theme_id" value={themeId} />

        <h2 className="text-sm font-semibold text-slate-900">ธีมการ์ด</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          เลือกได้ 16 ธีม · ธีมปัจจุบัน: <span className="font-medium text-slate-700">{theme.name}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {CARD_PRESETS.map((preset) => {
            const active = preset.id === themeId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setThemeId(preset.id)}
                aria-pressed={active}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span
                  className="relative block h-14 w-full"
                  style={{ background: `linear-gradient(135deg, ${preset.colors.bgFrom}, ${preset.colors.bgTo})` }}
                >
                  <span
                    className="absolute left-2.5 top-2.5 h-2.5 w-2.5 rounded-full"
                    style={{ background: preset.colors.accent }}
                  />
                  <span
                    className="absolute bottom-2.5 left-2.5 h-1.5 w-10 rounded-full"
                    style={{ background: preset.colors.text, opacity: 0.85 }}
                  />
                  <span
                    className="absolute bottom-2.5 left-14 h-1.5 w-6 rounded-full"
                    style={{ background: preset.colors.accent, opacity: 0.9 }}
                  />
                </span>
                <span className="flex items-center justify-between gap-1 px-2.5 py-1.5">
                  <span className="truncate text-xs font-medium text-slate-700">{preset.name}</span>
                  {active ? <span className="text-[10px] font-semibold text-slate-900">✓</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <SubmitButton label="บันทึกธีม" />
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          <Link href={`/dashboard/${guildId}`} className="hover:text-slate-700">
            ← กลับหน้าตั้งค่าเซิร์ฟเวอร์
          </Link>
        </div>
      </form>
    </div>
  );
}
