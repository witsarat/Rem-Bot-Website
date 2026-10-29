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


// ─────────────────────────── Role rewards ───────────────────────────

export interface RewardConfig {
  announceChannelId: string | null;
  rewardsEnabled: boolean;
  retention: "all" | "highest";
}

export interface RoleRewardRow {
  id: string;
  thresholdSeconds: number;
  roleId: string;
}

export interface RewardSettings {
  config: RewardConfig;
  roleRewards: RoleRewardRow[];
  /** จำนวนยศที่ให้ไปแล้วทั้งหมดในเซิร์ฟเวอร์ */
  awardedCount: number;
}

const EMPTY_REWARD_CONFIG: RewardConfig = {
  announceChannelId: null,
  rewardsEnabled: false,
  retention: "all",
};

/** อ่านค่าตั้ง Role rewards (ตารางยังไม่มี → ค่าเริ่มต้น) */
export async function getRewardSettings(guildId: string): Promise<RewardSettings> {
  const db = getPool();
  if (!db) {
    return { config: { ...EMPTY_REWARD_CONFIG }, roleRewards: [], awardedCount: 0 };
  }

  const [configResult, rewardResult, countResult] = await Promise.all([
    db.query<{ announce_channel_id: string | null; rewards_enabled: boolean; retention: string }>(
      "SELECT announce_channel_id, rewards_enabled, retention FROM guild_reward_config WHERE guild_id = $1",
      [guildId],
    ),
    db.query<{ id: string; threshold_seconds: string; role_id: string }>(
      "SELECT id::text AS id, threshold_seconds, role_id FROM guild_role_rewards WHERE guild_id = $1 AND kind = 'voice' ORDER BY threshold_seconds ASC",
      [guildId],
    ),
    db.query<{ roles: number }>(
      "SELECT count(*)::int AS roles FROM member_role_awards WHERE guild_id = $1",
      [guildId],
    ),
  ]);

  const cfg = configResult.rows[0];
  const config: RewardConfig = cfg
    ? {
        announceChannelId: cfg.announce_channel_id,
        rewardsEnabled: cfg.rewards_enabled,
        retention: cfg.retention === "highest" ? "highest" : "all",
      }
    : { ...EMPTY_REWARD_CONFIG };

  return {
    config,
    roleRewards: rewardResult.rows.map((row) => ({
      id: row.id,
      thresholdSeconds: Number(row.threshold_seconds),
      roleId: row.role_id,
    })),
    awardedCount: countResult.rows[0]?.roles ?? 0,
  };
}

/** บันทึกการเปิด/ปิดโมดูล + ห้องประกาศ + โหมดเก็บยศ */
export async function saveRewardConfigDb(
  guildId: string,
  input: { announceChannelId: string | null; rewardsEnabled: boolean; retention: "all" | "highest" },
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO guild_reward_config (guild_id, announce_channel_id, rewards_enabled, retention, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (guild_id) DO UPDATE SET
       announce_channel_id = EXCLUDED.announce_channel_id,
       rewards_enabled = EXCLUDED.rewards_enabled,
       retention = EXCLUDED.retention,
       updated_at = now()`,
    [guildId, input.announceChannelId, input.rewardsEnabled, input.retention],
  );
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

/** จำนวนเกณฑ์ที่ตั้งไว้ของเซิร์ฟเวอร์ (ใช้ตรวจเพดานแพ็กเกจฟรี) */
export async function countRoleRewards(guildId: string): Promise<number> {
  const db = getPool();
  if (!db) return 0;
  const result = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM guild_role_rewards WHERE guild_id = $1 AND kind = 'voice'",
    [guildId],
  );
  return result.rows[0]?.n ?? 0;
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

// ─────────────────────────── พื้นหลังการ์ด (Canva) ───────────────────────────

export interface CardBackgroundInfo {
  filename: string | null;
  mime: string;
  bytes: number;
  updatedAt: string;
}

/** ข้อมูลพื้นหลังการ์ดที่อัปโหลดไว้ (ไม่ดึงไฟล์จริง — ใช้แสดงสถานะในหน้าเว็บ) */
export async function getCardBackgroundInfo(
  guildId: string,
  variant: "profile" | "weekly",
): Promise<CardBackgroundInfo | null> {
  const db = getPool();
  if (!db) return null;

  const result = await db.query<{ filename: string | null; mime: string; bytes: number; updated_at: string }>(
    "SELECT filename, mime, bytes, updated_at::text AS updated_at FROM card_backgrounds WHERE guild_id = $1 AND variant = $2",
    [guildId, variant],
  );
  const row = result.rows[0];
  return row ? { filename: row.filename, mime: row.mime, bytes: row.bytes, updatedAt: row.updated_at } : null;
}

/** บันทึก/แทนที่พื้นหลังการ์ด */
export async function upsertCardBackground(
  guildId: string,
  variant: "profile" | "weekly",
  input: { mime: string; filename: string; data: Buffer },
): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query(
    `INSERT INTO card_backgrounds (guild_id, variant, mime, filename, bytes, data, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (guild_id, variant) DO UPDATE SET
       mime = EXCLUDED.mime,
       filename = EXCLUDED.filename,
       bytes = EXCLUDED.bytes,
       data = EXCLUDED.data,
       updated_at = now()`,
    [guildId, variant, input.mime, input.filename, input.data.length, input.data],
  );
}

/** ลบพื้นหลังการ์ด (กลับไปใช้ gradient ของธีม) */
export async function deleteCardBackground(guildId: string, variant: "profile" | "weekly"): Promise<void> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL ยังไม่ได้ตั้งค่า");

  await db.query("DELETE FROM card_backgrounds WHERE guild_id = $1 AND variant = $2", [guildId, variant]);
}
