"use client";

import { useEffect, useState } from "react";
import type { VoiceSnapshot } from "@/lib/db";

/** รูปโปรไฟล์จาก hash (หรือรูป default ตามรหัสผู้ใช้) */
function avatarUrl(userId: string, avatar: string | null): string {
  if (avatar) return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=64`;
  let index = 0;
  try {
    index = Number((BigInt(userId) >> 22n) % 6n);
  } catch {
    index = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** เวลาแบบไทย (เวลาไทยคงที่ — กัน hydration mismatch) */
function timeTH(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

/** การ์ด "ห้องเสียงตอนนี้" — แสดงเฉพาะห้องที่มีคนอยู่ · รีเฟรชอัตโนมัติทุก 20 วินาที */
export function VoiceLive({ guildId, initial }: { guildId: string; initial: VoiceSnapshot | null }) {
  const [snapshot, setSnapshot] = useState<VoiceSnapshot | null>(initial);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/dashboard/${guildId}/voice`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { snapshot: VoiceSnapshot | null };
        if (!stop) setSnapshot(json.snapshot ?? null);
      } catch {
        // เงียบไว้ — รอบถัดไปลองใหม่
      }
    };
    const timer = setInterval(load, 20_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [guildId]);

  const activeChannels = snapshot
    ? snapshot.channels.filter((channel) =>
        snapshot.occupants.some((person) => person.channelId === channel.id),
      )
    : [];
  const emptyTotal = snapshot ? snapshot.channels.length - activeChannels.length : 0;

  return (
    <section className="mt-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">ห้องเสียงตอนนี้</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              ข้อมูลสดจากบอท — รีเฟรชอัตโนมัติทุก 20 วินาที
            </p>
          </div>
          <p className="text-xs tabular-nums text-slate-400" suppressHydrationWarning>
            {snapshot?.updatedAt ? `อัปเดตล่าสุด ${timeTH(snapshot.updatedAt)} น.` : "รอข้อมูลจากบอท…"}
          </p>
        </div>

        {!snapshot ? (
          <p className="mt-4 text-sm text-slate-500">
            ยังไม่มีข้อมูล — บอทกำลังซิงก์ข้อมูลสักครู่ แล้วลองรีเฟรชอีกครั้ง
          </p>
        ) : activeChannels.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            ตอนนี้ไม่มีใครอยู่ในห้องเสียง — เมื่อมีคนเข้าห้อง เดี๋ยวรายชื่อจะขึ้นที่นี่เอง
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {activeChannels.map((channel) => {
              const people = snapshot.occupants.filter((person) => person.channelId === channel.id);
              return (
                <div key={channel.id} className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{channel.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {channel.userLimit ? `${people.length}/${channel.userLimit} คน` : `${people.length} คน`}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {people.map((person) => (
                      <span
                        key={person.userId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-xs font-medium text-slate-700"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarUrl(person.userId, person.avatar)}
                          alt=""
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full bg-slate-100"
                        />
                        {person.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {emptyTotal > 0 ? (
              <p className="pt-1 text-xs text-slate-400">ห้องอื่นว่างอยู่อีก {emptyTotal} ห้อง</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
