/**
 * การเชื่อมต่อฐานข้อมูลของเว็บ (read/write — ใช้ฐานข้อมูลเดียวกับบอท)
 * อ่าน/เขียน: guild_settings (ค่าห้อง) และอ่าน voice_logs (ประวัติ + สถิติ)
 */
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool | null {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) return null;
  if (!pool) {
    // PGSSLMODE=disable → PostgreSQL ในเครื่อง/เทสต์ (ปกติ Supabase/Neon ต้องใช้ SSL)
    const sslDisabled = /^(disable|false|0)$/i.test((process.env.PGSSLMODE ?? "").trim());
    pool = new Pool({
      connectionString: url,
      ssl: sslDisabled ? undefined : { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (error) => console.error("[web/db] pool error:", error.message));
  }
  return pool;
}

export function isDbConfigured(): boolean {
  return Boolean((process.env.DATABASE_URL ?? "").trim());
}

// ─────────────────────────── guild_settings ───────────────────────────

export interface GuildSettings {
  logChannelId: string | null;
  weeklyChannelId: string | null;
}

/** อ่านค่าห้องของเซิร์ฟเวอร์ (null = ยังไม่มีแถว) */
export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  const db = getPool();
  if (!db) return null;

  const result = await db.query<{ log_channel_id: string | null; weekly_channel_id: string | null }>(
    "SELECT log_channel_id, weekly_channel_id FROM guild_settings WHERE guild_id = $1",
    [guildId],
  );
  if (!result.rows.length) return null;
  return {
    logChannelId: result.rows[0].log_channel_id,
    weeklyChannelId: result.rows[0].weekly_channel_id,
  };
}

/** บันทึกค่าห้อง (สร้างแถวอัตโนมัติถ้ายังไม่มี) */
export async function upsertGuildSettings(
  guildId: string,
  logChannelId: string | null,
  weeklyChannelId: string | null,
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO guild_settings (guild_id, log_channel_id, weekly_channel_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (guild_id)
     DO UPDATE SET
       log_channel_id = EXCLUDED.log_channel_id,
       weekly_channel_id = EXCLUDED.weekly_channel_id,
       updated_at = now()`,
    [guildId, logChannelId, weeklyChannelId],
  );
}

// ─────────────────────────── voice_logs ───────────────────────────

export type VoiceEvent = "join" | "leave" | "move";

export interface VoiceLogRow {
  id: string;
  userId: string;
  username: string;
  event: VoiceEvent;
  channelName: string | null;
  fromChannelName: string | null;
  toChannelName: string | null;
  createdAt: string;
}

export interface VoiceLogsPage {
  rows: VoiceLogRow[];
  total: number;
}

export interface VoiceLogsQuery {
  page: number;
  perPage: number;
  event?: VoiceEvent | null;
  /** แสดงเฉพาะรายการตั้งแต่วันที่นี้เป็นต้นมา (ไม่ใส่/null = ทั้งหมด) — ใช้จำกัดประวัติของแพ็กเกจฟรี */
  since?: Date | null;
}

interface VoiceLogRawRow {
  id: string;
  user_id: string;
  username: string;
  event: VoiceEvent;
  channel_name: string | null;
  from_channel_name: string | null;
  to_channel_name: string | null;
  created_at: Date;
}

function mapVoiceLogRow(row: VoiceLogRawRow): VoiceLogRow {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    event: row.event,
    channelName: row.channel_name,
    fromChannelName: row.from_channel_name,
    toChannelName: row.to_channel_name,
    createdAt: row.created_at.toISOString(),
  };
}

/** สร้างเงื่อนไข WHERE ร่วมของประวัติ (เซิร์ฟเวอร์ + ประเภทเหตุการณ์ + ช่วงเวลา) */
function voiceLogFilters(guildId: string, event: VoiceEvent | null, since: Date | null) {
  const params: Array<string | Date> = [guildId];
  const where = ["guild_id = $1"];
  if (event) {
    params.push(event);
    where.push(`event = $${params.length}`);
  }
  if (since) {
    params.push(since);
    where.push(`created_at >= $${params.length}`);
  }
  return { params, whereSql: where.join(" AND ") };
}

/** อ่านประวัติ voice log แบบแบ่งหน้า (ใหม่สุดก่อน) */
export async function getVoiceLogs(guildId: string, options: VoiceLogsQuery): Promise<VoiceLogsPage> {
  const db = getPool();
  if (!db) return { rows: [], total: 0 };

  const { page, perPage, event = null, since = null } = options;
  const offset = (page - 1) * perPage;
  const { params, whereSql } = voiceLogFilters(guildId, event, since);
  const listParams: Array<string | number | Date> = [...params, perPage, offset];

  const countQuery = `SELECT count(*)::int AS total FROM voice_logs WHERE ${whereSql}`;
  const listQuery = `
    SELECT id::text AS id, user_id, username, event,
           channel_name, from_channel_name, to_channel_name,
           created_at
      FROM voice_logs
     WHERE ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `;

  const [countResult, listResult] = await Promise.all([
    db.query<{ total: number }>(countQuery, params),
    db.query<VoiceLogRawRow>(listQuery, listParams),
  ]);

  return {
    total: countResult.rows[0]?.total ?? 0,
    rows: listResult.rows.map(mapVoiceLogRow),
  };
}

/** อ่านประวัติทั้งหมด (ไม่มีแบ่งหน้า) สำหรับส่งออก CSV — จำกัด 50,000 แถวล่าสุด */
export async function getVoiceLogsForExport(
  guildId: string,
  options: { event?: VoiceEvent | null; since?: Date | null } = {},
): Promise<VoiceLogRow[]> {
  const db = getPool();
  if (!db) return [];

  const { event = null, since = null } = options;
  const { params, whereSql } = voiceLogFilters(guildId, event, since);

  const result = await db.query<VoiceLogRawRow>(
    `SELECT id::text AS id, user_id, username, event,
            channel_name, from_channel_name, to_channel_name,
            created_at
       FROM voice_logs
      WHERE ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT 50000`,
    params,
  );

  return result.rows.map(mapVoiceLogRow);
}

export interface GuildStats {
  total: number;
  members: number;
  lastAt: string | null;
}

/** สถิติรวมของเซิร์ฟเวอร์ (จำนวนเหตุการณ์ / จำนวนสมาชิก / ล่าสุดเมื่อไร) */
export async function getGuildStats(guildId: string): Promise<GuildStats> {
  const db = getPool();
  if (!db) return { total: 0, members: 0, lastAt: null };

  const result = await db.query<{ total: number; members: number; last_at: Date | null }>(
    `SELECT count(*)::int AS total,
            count(DISTINCT user_id)::int AS members,
            max(created_at) AS last_at
       FROM voice_logs
      WHERE guild_id = $1`,
    [guildId],
  );
  const row = result.rows[0];
  return {
    total: row?.total ?? 0,
    members: row?.members ?? 0,
    lastAt: row?.last_at ? row.last_at.toISOString() : null,
  };
}

// ─────────────────────────── อันดับ (leaderboard) ───────────────────────────

export interface VoiceStatEventRow {
  user_id: string;
  username: string;
  event: VoiceEvent;
  created_at: Date;
}

/** เหตุการณ์ทั้งหมดของเซิร์ฟเวอร์ เรียงเก่า → ใหม่ (ใช้คำนวณอันดับเวลาห้องเสียง) */
export async function getVoiceStatEvents(guildId: string, since: Date | null): Promise<VoiceStatEventRow[]> {
  const db = getPool();
  if (!db) return [];

  if (since) {
    const result = await db.query<VoiceStatEventRow>(
      `SELECT user_id, username, event, created_at
         FROM voice_logs
        WHERE guild_id = $1 AND created_at >= $2
        ORDER BY created_at ASC, id ASC`,
      [guildId, since],
    );
    return result.rows;
  }

  const result = await db.query<VoiceStatEventRow>(
    `SELECT user_id, username, event, created_at
       FROM voice_logs
      WHERE guild_id = $1
      ORDER BY created_at ASC, id ASC`,
    [guildId],
  );
  return result.rows;
}

// ─────────────────────────── สถิติรวมทั้งระบบ (ใช้ในหน้าแรก) ───────────────────────────

export interface SiteStats {
  total: number;
  guilds: number;
  users: number;
}

/** สถิติรวมทั้งระบบ — คืน null ถ้าฐานข้อมูลไม่พร้อม (หน้าเว็บจะแสดง "—") */
export async function getSiteStats(): Promise<SiteStats | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const result = await db.query<{ total: number; guilds: number; users: number }>(
      `SELECT count(*)::int AS total,
              count(DISTINCT guild_id)::int AS guilds,
              count(DISTINCT user_id)::int AS users
         FROM voice_logs`,
    );
    const row = result.rows[0];
    return row ? { total: row.total, guilds: row.guilds, users: row.users } : null;
  } catch (error) {
    console.error("[web/db] อ่านสถิติรวมไม่สำเร็จ:", error);
    return null;
  }
}

// ─────────────────────────── bot_guilds (ดิสที่บอทอยู่) ───────────────────────────

/**
 * รายชื่อ id เซิร์ฟเวอร์ที่มีบอทอยู่ (จากตาราง bot_guilds ที่บอทเขียนไว้)
 * คืน null = อ่านไม่ได้/ยังไม่มีตาราง → ให้ผู้เรียก fallback ไปใช้ REST แทน
 */
export async function getBotGuildIdsFromDb(): Promise<Set<string> | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const result = await db.query<{ guild_id: string }>("SELECT guild_id FROM bot_guilds");
    return new Set(result.rows.map((row) => row.guild_id));
  } catch (error) {
    console.error("[web/db] อ่านรายชื่อดิสของบอทจาก DB ไม่สำเร็จ:", error);
    return null;
  }
}

// ─────────────────────────── voice_snapshot (ห้องเสียงปัจจุบัน) ───────────────────────────

export interface VoiceSnapshotChannel {
  id: string;
  name: string;
  position: number;
  userLimit: number | null;
}

export interface VoiceSnapshotOccupant {
  userId: string;
  displayName: string;
  avatar: string | null;
  channelId: string;
}

export interface VoiceSnapshot {
  channels: VoiceSnapshotChannel[];
  occupants: VoiceSnapshotOccupant[];
  updatedAt: string | null;
}

/** Snapshot ห้องเสียงล่าสุดที่บอทซิงก์ไว้ (คืน null ถ้ายังไม่มี/อ่านไม่ได้) */
export async function getVoiceSnapshot(guildId: string): Promise<VoiceSnapshot | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const result = await db.query<{
      data: { channels?: VoiceSnapshotChannel[]; occupants?: VoiceSnapshotOccupant[] } | null;
      updated_at: Date | null;
    }>("SELECT data, updated_at FROM voice_snapshot WHERE guild_id = $1", [guildId]);
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      channels: Array.isArray(row.data?.channels) ? row.data.channels : [],
      occupants: Array.isArray(row.data?.occupants) ? row.data.occupants : [],
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
  } catch (error) {
    console.error("[web/db] อ่าน snapshot ห้องเสียงไม่สำเร็จ:", error);
    return null;
  }
}


// ─────────────────────────── Achievements + Role rewards ───────────────────────────

export const DEFAULT_ACHIEVEMENT_TIERS = [
  { tier: "copper", thresholdSeconds: 3_600 },
  { tier: "bronze", thresholdSeconds: 10_800 },
  { tier: "silver", thresholdSeconds: 36_000 },
  { tier: "gold", thresholdSeconds: 90_000 },
];

export interface RewardConfig {
  announceChannelId: string | null;
  achievementsEnabled: boolean;
  rewardsEnabled: boolean;
  retention: "all" | "highest";
}

export interface AchievementTierRow {
  tier: string;
  thresholdSeconds: number;
  enabled: boolean;
}

export interface RoleRewardRow {
  id: string;
  thresholdSeconds: number;
  roleId: string;
}

export interface RewardSettings {
  config: RewardConfig;
  tiers: AchievementTierRow[];
  roleRewards: RoleRewardRow[];
  counts: { achievements: number; roles: number };
}

const EMPTY_REWARD_CONFIG: RewardConfig = {
  announceChannelId: null,
  achievementsEnabled: false,
  rewardsEnabled: false,
  retention: "all",
};

/** อ่านค่าตั้ง Achievements/Role rewards ทั้งชุด (ตารางยังไม่มี → ค่าเริ่มต้น) */
export async function getRewardSettings(guildId: string): Promise<RewardSettings> {
  const db = getPool();
  if (!db) {
    return {
      config: { ...EMPTY_REWARD_CONFIG },
      tiers: DEFAULT_ACHIEVEMENT_TIERS.map((tier) => ({ ...tier, enabled: true })),
      roleRewards: [],
      counts: { achievements: 0, roles: 0 },
    };
  }

  const [configResult, tierResult, rewardResult, countResult] = await Promise.all([
    db.query<{
      announce_channel_id: string | null;
      achievements_enabled: boolean;
      rewards_enabled: boolean;
      retention: string;
    }>("SELECT announce_channel_id, achievements_enabled, rewards_enabled, retention FROM guild_reward_config WHERE guild_id = $1", [guildId]),
    db.query<{ tier: string; threshold_seconds: string; enabled: boolean }>(
      "SELECT tier, threshold_seconds, enabled FROM guild_achievements WHERE guild_id = $1 AND kind = 'voice'",
      [guildId],
    ),
    db.query<{ id: string; threshold_seconds: string; role_id: string }>(
      "SELECT id::text AS id, threshold_seconds, role_id FROM guild_role_rewards WHERE guild_id = $1 AND kind = 'voice' ORDER BY threshold_seconds ASC",
      [guildId],
    ),
    db.query<{ achievements: number; roles: number }>(
      `SELECT
         (SELECT count(*)::int FROM member_achievements WHERE guild_id = $1) AS achievements,
         (SELECT count(*)::int FROM member_role_awards WHERE guild_id = $1) AS roles`,
      [guildId],
    ),
  ]);

  const cfg = configResult.rows[0];
  const config: RewardConfig = cfg
    ? {
        announceChannelId: cfg.announce_channel_id,
        achievementsEnabled: cfg.achievements_enabled,
        rewardsEnabled: cfg.rewards_enabled,
        retention: cfg.retention === "highest" ? "highest" : "all",
      }
    : { ...EMPTY_REWARD_CONFIG };

  const tiers = tierResult.rows.length
    ? tierResult.rows
        .map((row) => ({ tier: row.tier, thresholdSeconds: Number(row.threshold_seconds), enabled: row.enabled }))
        .sort((a, b) => a.thresholdSeconds - b.thresholdSeconds)
    : DEFAULT_ACHIEVEMENT_TIERS.map((tier) => ({ ...tier, enabled: true }));

  return {
    config,
    tiers,
    roleRewards: rewardResult.rows.map((row) => ({
      id: row.id,
      thresholdSeconds: Number(row.threshold_seconds),
      roleId: row.role_id,
    })),
    counts: {
      achievements: countResult.rows[0]?.achievements ?? 0,
      roles: countResult.rows[0]?.roles ?? 0,
    },
  };
}

/** บันทึกการเปิด/ปิดโมดูล + ห้องประกาศ + โหมดเก็บยศ */
export async function saveRewardConfigDb(
  guildId: string,
  input: { announceChannelId: string | null; achievementsEnabled: boolean; rewardsEnabled: boolean; retention: "all" | "highest" },
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO guild_reward_config (guild_id, announce_channel_id, achievements_enabled, rewards_enabled, retention, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (guild_id) DO UPDATE SET
       announce_channel_id = EXCLUDED.announce_channel_id,
       achievements_enabled = EXCLUDED.achievements_enabled,
       rewards_enabled = EXCLUDED.rewards_enabled,
       retention = EXCLUDED.retention,
       updated_at = now()`,
    [guildId, input.announceChannelId, input.achievementsEnabled, input.rewardsEnabled, input.retention],
  );
}

/** บันทึกเกณฑ์ achievement 4 ระดับ (วินาที) */
export async function saveAchievementTiersDb(
  guildId: string,
  tiers: Array<{ tier: string; thresholdSeconds: number }>,
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  for (const tier of tiers) {
    await db.query(
      `INSERT INTO guild_achievements (guild_id, kind, tier, threshold_seconds, enabled)
       VALUES ($1, 'voice', $2, $3, true)
       ON CONFLICT (guild_id, kind, tier) DO UPDATE SET
         threshold_seconds = EXCLUDED.threshold_seconds,
         enabled = true`,
      [guildId, tier.tier, tier.thresholdSeconds],
    );
  }
}

/** เพิ่มเกณฑ์ให้ยศ (ถ้าซ้ำจะไม่สร้างแถวใหม่) */
export async function addRoleRewardDb(guildId: string, thresholdSeconds: number, roleId: string): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO guild_role_rewards (guild_id, kind, threshold_seconds, role_id)
     VALUES ($1, 'voice', $2, $3)
     ON CONFLICT (guild_id, kind, threshold_seconds, role_id) DO NOTHING`,
    [guildId, thresholdSeconds, roleId],
  );
}

/** ลบเกณฑ์ให้ยศ (ไม่ถอดยศที่ให้ไปแล้วออก) */
export async function deleteRoleRewardDb(guildId: string, id: string): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query("DELETE FROM guild_role_rewards WHERE guild_id = $1 AND id = $2::bigint", [guildId, id]);
}

// ─────────────────────────── card_layouts (Card Studio) ───────────────────────────

/** อ่านเลย์เอาต์การ์ดที่บันทึกไว้ (null = ยังไม่เคยตั้ง / อ่านไม่ได้) */
export async function getCardLayoutRow(
  guildId: string,
  variant: "profile" | "weekly" = "profile",
): Promise<unknown | null> {
  const db = getPool();
  if (!db) return null;
  try {
    const result = await db.query<{ layout: unknown }>(
      "SELECT layout FROM card_layouts WHERE guild_id = $1 AND variant = $2",
      [guildId, variant],
    );
    return result.rows.length ? result.rows[0].layout : null;
  } catch (error) {
    console.error("[web/db] อ่านเลย์เอาต์การ์ดไม่สำเร็จ:", error);
    return null;
  }
}

/** บันทึกเลย์เอาต์การ์ด (สร้าง/ทับแถวเดิม) */
export async function upsertCardLayout(
  guildId: string,
  layout: unknown,
  variant: "profile" | "weekly" = "profile",
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO card_layouts (guild_id, variant, layout, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (guild_id, variant)
     DO UPDATE SET layout = EXCLUDED.layout, updated_at = now()`,
    [guildId, variant, JSON.stringify(layout)],
  );
}

// ─────────────────────────── guild_subscriptions (Premium 29 บาท/เดือน) ───────────────────────────

export type SubscriptionStatus = "active" | "revoked";

export interface GuildSubscription {
  guildId: string;
  plan: string;
  status: SubscriptionStatus;
  priceThb: number;
  startedAt: string;
  currentPeriodEnd: string | null;
  grantedBy: string | null;
  note: string | null;
}

interface SubscriptionRawRow {
  guild_id: string;
  plan: string;
  status: SubscriptionStatus;
  price_thb: number;
  started_at: Date;
  current_period_end: Date | null;
  granted_by: string | null;
  note: string | null;
}

function mapSubscription(row: SubscriptionRawRow): GuildSubscription {
  return {
    guildId: row.guild_id,
    plan: row.plan,
    status: row.status,
    priceThb: row.price_thb,
    startedAt: row.started_at.toISOString(),
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
    grantedBy: row.granted_by,
    note: row.note,
  };
}

/** อ่านสถานะ Premium ของเซิร์ฟเวอร์ (null = ยังไม่เคยสมัคร / ยังไม่มีตาราง) */
export async function getGuildSubscription(guildId: string): Promise<GuildSubscription | null> {
  const db = getPool();
  if (!db) return null;

  try {
    const result = await db.query<SubscriptionRawRow>(
      `SELECT guild_id, plan, status, price_thb, started_at, current_period_end, granted_by, note
         FROM guild_subscriptions
        WHERE guild_id = $1`,
      [guildId],
    );
    return result.rows.length ? mapSubscription(result.rows[0]) : null;
  } catch (error) {
    // ตารางอาจยังไม่ถูกสร้าง (บอทยังไม่บูตหลังอัปเดต) — ถือว่าฟรี ไม่ทำให้หน้าเว็บพัง
    console.error("[web/db] อ่านสถานะ Premium ไม่สำเร็จ:", error);
    return null;
  }
}

/** อ่านสถานะ Premium ของหลายเซิร์ฟเวอร์พร้อมกัน (ใช้แสดงป้ายในหน้าแดชบอร์ดรวม) */
export async function getGuildSubscriptions(guildIds: string[]): Promise<Map<string, GuildSubscription>> {
  const map = new Map<string, GuildSubscription>();
  const db = getPool();
  if (!db || guildIds.length === 0) return map;

  try {
    const result = await db.query<SubscriptionRawRow>(
      `SELECT guild_id, plan, status, price_thb, started_at, current_period_end, granted_by, note
         FROM guild_subscriptions
        WHERE guild_id = ANY($1::text[])`,
      [guildIds],
    );
    for (const row of result.rows) map.set(row.guild_id, mapSubscription(row));
  } catch (error) {
    console.error("[web/db] อ่านสถานะ Premium หลายเซิร์ฟเวอร์ไม่สำเร็จ:", error);
  }
  return map;
}
