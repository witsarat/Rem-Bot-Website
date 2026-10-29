import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashHeader } from "@/components/dash-header";
import { Note } from "@/components/note";
import { SubmitButton } from "@/components/submit-button";
import { loadGuildAccess } from "@/lib/auth";
import { fetchGuildRoles, fetchGuildTextChannels, type DiscordChannel, type DiscordRole } from "@/lib/discord";
import { getRewardSettings } from "@/lib/db";
import { FREE_ROLE_REWARD_LIMIT, getPremiumStatus } from "@/lib/premium";
import { addRoleReward, removeRoleReward, saveRewardModule } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Role rewards",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "เซสชันหมดอายุหรือคุณไม่มีสิทธิ์ในเซิร์ฟเวอร์นี้ — กรุณาเข้าสู่ระบบใหม่",
  invalid: "ค่าที่ส่งมาไม่ถูกต้อง — ชั่วโมงต้องมากกว่า 0 และไม่เกิน 2000",
  limit: `แพ็กเกจฟรีตั้งเกณฑ์ให้ยศได้ ${FREE_ROLE_REWARD_LIMIT} เกณฑ์ — อัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด`,
  save: "บันทึกไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง",
};

function one(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

type Props = {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RewardsPage(props: Props) {
  const { guildId } = await props.params;
  const searchParams = await props.searchParams;

  const access = await loadGuildAccess(guildId);
  if (!access.ok) redirect("/dashboard");

  const { session, guild, botGuildIds } = access.data;
  const botIn = botGuildIds.has(guildId);
  const saved = one(searchParams.saved) === "1";
  const errorCode = one(searchParams.error);

  const [settings, premium] = await Promise.all([getRewardSettings(guildId), getPremiumStatus(guildId)]);
  const [channels, roles] = botIn
    ? await Promise.all([
        fetchGuildTextChannels(guildId).catch(() => [] as DiscordChannel[]),
        fetchGuildRoles(guildId).catch(() => [] as DiscordRole[]),
      ])
    : ([[], []] as [DiscordChannel[], DiscordRole[]]);

  const roleName = new Map(roles.map((role) => [role.id, role.name]));
  const limitReached = !premium.active && settings.roleRewards.length >= FREE_ROLE_REWARD_LIMIT;
  const limitLabel = premium.active ? "ไม่จำกัด" : `${FREE_ROLE_REWARD_LIMIT} เกณฑ์`;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href={`/dashboard/${guildId}`} className="text-sm text-slate-500 transition-colors hover:text-slate-800">
          ← กลับหน้าตั้งค่าเซิร์ฟเวอร์
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Role rewards</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ให้ยศอัตโนมัติเมื่อ <span className="font-medium text-slate-700">ชั่วโมงสะสมในห้องเสียง</span> ของ{" "}
              <span className="font-medium text-slate-700">{guild.name}</span> ถึงเกณฑ์ — ใช้เฉพาะ voice log ไม่ต้องเปิดสิทธิ์อ่านข้อความ
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              premium.active ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {premium.active ? "⭐ Premium" : "แพ็กเกจฟรี"}
          </span>
        </div>

        {saved ? <Note tone="emerald">บันทึกแล้ว — บอทจะให้ยศในรอบตรวจถัดไป (ทุก 10 นาที)</Note> : null}
        {errorCode ? <Note tone="rose">{ERROR_MESSAGES[errorCode] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}</Note> : null}
        {!botIn ? (
          <Note tone="amber">บอท Ruru ยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้ — เพิ่มบอทก่อนจึงจะให้ยศและประกาศได้</Note>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500">เกณฑ์ที่ตั้งไว้</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {settings.roleRewards.length}
              <span className="ml-1 text-xs font-normal text-slate-400">/ {limitLabel}</span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">ยศที่ให้ไปแล้ว</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{settings.awardedCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">ประกาศลงห้อง</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">
              {settings.config.announceChannelId
                ? `#${channels.find((c) => c.id === settings.config.announceChannelId)?.name ?? settings.config.announceChannelId}`
                : "— ยังไม่ตั้ง —"}
            </p>
          </div>
        </div>

        {/* ── 1) เปิด/ปิดโมดูล ── */}
        <form action={saveRewardModule} className="card mt-6 p-6">
          <input type="hidden" name="guild_id" value={guildId} />
          <h2 className="text-base font-semibold text-slate-900">โมดูลและห้องประกาศ</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            เปิดโมดูลเพื่อให้บอทจ่ายยศตามเกณฑ์ — ปิดไว้ได้ถ้ายังไม่พร้อม
          </p>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="rewards_enabled"
              defaultChecked={settings.config.rewardsEnabled}
              className="h-4 w-4 rounded border-slate-300"
            />
            เปิด Role rewards (ให้ยศอัตโนมัติเมื่อถึงเกณฑ์)
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="announce_channel">
                ห้องประกาศ
              </label>
              <select
                id="announce_channel"
                name="announce_channel"
                defaultValue={settings.config.announceChannelId ?? ""}
                className="input"
              >
                <option value="">— ไม่ประกาศ —</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
                {settings.config.announceChannelId &&
                !channels.some((channel) => channel.id === settings.config.announceChannelId) ? (
                  <option value={settings.config.announceChannelId}># ช่องเดิม (ไม่พบในรายการ)</option>
                ) : null}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">บอทต้องมีสิทธิ์ “ส่งข้อความ” ในห้องนี้</p>
            </div>

            <div>
              <label className="label" htmlFor="retention">
                เมื่อได้ยศที่สูงขึ้น
              </label>
              <select id="retention" name="retention" defaultValue={settings.config.retention} className="input">
                <option value="all">เก็บยศเดิมไว้ทั้งหมด</option>
                <option value="highest">เก็บเฉพาะยศสูงสุด (ถอดยศที่เบากว่า)</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-400">ถอดเฉพาะยศที่ตั้งไว้ในโมดูลนี้เท่านั้น</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <SubmitButton label="บันทึกการตั้งค่า" />
            <span className="text-xs text-slate-400">บอทตรวจทุก 10 นาที</span>
          </div>
        </form>

        {/* ── 2) เกณฑ์ให้ยศ ── */}
        <section className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-slate-900">เกณฑ์ให้ยศ</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            ให้ยศอัตโนมัติเมื่อชั่วโมงสะสมถึงเกณฑ์ — บอทต้องมีสิทธิ์ <strong>Manage Roles</strong> และยศของบอทต้องอยู่สูงกว่ายศที่ให้
          </p>

          {settings.roleRewards.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              ยังไม่มีเกณฑ์ให้ยศ — เพิ่มด้านล่างได้เลย
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">เมื่อครบ</th>
                    <th className="px-4 py-2.5 font-medium">ยศที่ให้</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settings.roleRewards.map((reward, index) => {
                    const inactive = !premium.active && index >= FREE_ROLE_REWARD_LIMIT;
                    return (
                      <tr key={reward.id} className={inactive ? "opacity-50" : undefined}>
                        <td className="px-4 py-2.5 tabular-nums text-slate-700">{reward.thresholdSeconds / 3600} ชม.</td>
                        <td className="px-4 py-2.5 text-slate-800">
                          {roleName.get(reward.roleId) ?? <code className="text-xs text-slate-500">{reward.roleId}</code>}
                          {inactive ? <span className="ml-2 text-xs text-slate-400">(ต้องอัปเกรด)</span> : null}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <form action={removeRoleReward} className="inline">
                            <input type="hidden" name="guild_id" value={guildId} />
                            <input type="hidden" name="reward_id" value={reward.id} />
                            <button type="submit" className="text-xs font-medium text-rose-600 hover:text-rose-700">
                              ลบ
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {limitReached ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              แพ็กเกจฟรีตั้งได้ {FREE_ROLE_REWARD_LIMIT} เกณฑ์ —{" "}
              <Link href="/premium" className="font-medium underline">
                อัปเกรด Premium 29 บาท/เดือน
              </Link>{" "}
              เพื่อเพิ่มได้ไม่จำกัด
            </div>
          ) : (
            <form
              action={addRoleReward}
              className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-end"
            >
              <input type="hidden" name="guild_id" value={guildId} />
              <div>
                <label className="label" htmlFor="threshold_hours">
                  เมื่อครบ (ชม.)
                </label>
                <input
                  id="threshold_hours"
                  name="threshold_hours"
                  type="number"
                  min={0.5}
                  max={2000}
                  step={0.5}
                  defaultValue={5}
                  className="input text-right tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="role_id">
                  ยศ
                </label>
                <select id="role_id" name="role_id" className="input" required defaultValue="">
                  <option value="" disabled>
                    — เลือกยศ —
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      @ {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton label="เพิ่มเกณฑ์" />
            </form>
          )}

          {roles.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              ยังโหลดรายชื่อยศไม่ได้ — ตรวจสอบว่า `DISCORD_TOKEN` ของเว็บยังใช้ได้และบอทอยู่ในเซิร์ฟเวอร์
            </p>
          ) : null}
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          หมายเหตุ: ชั่วโมงนับจาก voice log ที่บันทึกไว้ + เซสชันที่กำลังอยู่ในห้องตอนนี้ • การให้ยศจะเกิดขึ้นในรอบตรวจถัดไป (ทุก 10 นาที)
          • การลบเกณฑ์ไม่ถอดยศที่ให้ไปแล้ว • ฟรี {FREE_ROLE_REWARD_LIMIT} เกณฑ์ / Premium ไม่จำกัด
        </p>

        <div className="h-10" />
      </main>
    </div>
  );
}
