# Ruru — เว็บไซต์ + แดชบอร์ด (`Rem-Bot-Website`)

เว็บประชาสัมพันธ์ + **แดชบอร์ดจัดการบอท Discord "Ruru"** — Next.js 16 + Tailwind CSS 4 (ธีมขาว–ฟ้า)

🌍 **Live:** https://rem-bot.vercel.app — Vercel project `rem-bot`
> 🤖 ตัวบอท Discord อยู่ในอีก repo: https://github.com/witsarat/Rem-Bot-Discord (deploy บน Render)

## หน้า / เส้นทาง

| หน้า | ทำอะไร |
|---|---|
| `/` | หน้าแรก — ฟีเจอร์ คำสั่ง ราคา วิธีใช้งาน |
| `/premium` | แพ็กเกจ **Premium 29 บาท/เดือน** — เทียบฟีเจอร์ + วิธีเปิดใช้ |
| `/dashboard` | เข้าสู่ระบบด้วย Discord → เลือกเซิร์ฟเวอร์ (เห็นเฉพาะที่ตัวเองเป็นผู้ดูแล) |
| `/dashboard/<guildId>` | ตั้งค่าห้อง log / ห้องรายงาน + สถิติ + อันดับผู้ใช้ + ประวัติ voice log (ป้าย Premium / ล็อกฟีเจอร์ฝั่งฟรี) |
| `/dashboard/<guildId>/cards` | **Card Studio** — ลาก/ย่อ/ปรับสีการ์ด /profile พร้อมพรีวิวสดจากบอท |
| `/api/dashboard/<guildId>/export` | ส่งออกประวัติเป็น CSV — **เฉพาะเซิร์ฟเวอร์ Premium** (ตรวจสิทธิ์ทุกครั้ง) |
| `/terms` · `/privacy` | ข้อกำหนดการให้บริการ · นโยบายความเป็นส่วนตัว |
| `/api/auth/login` · `/api/auth/callback` | OAuth2 login แดชบอร์ด (scope: identify + guilds) |
| `/api/linked-roles/verify` | URL ยืนยัน Linked Roles (กรอกใน Developer Portal) |

## ⭐ ระบบ Premium (29 บาท/เดือน ต่อเซิร์ฟเวอร์)

เว็บอ่านสถานะจากตาราง `guild_subscriptions` (ตารางเดียวกับที่บอทเขียน) — ไม่มี env เพิ่ม

| ฟีเจอร์ | ฟรี | Premium |
|---|---|---|
| บันทึก log / `/top` 7–30 วัน / `/profile` 7–30 วัน | ✓ | ✓ |
| อันดับตลอดกาล (`/top`, แดชบอร์ด) | — | ✓ |
| ประวัติในแดชบอร์ด | 30 วันล่าสุด | ทั้งหมด |
| ส่งออก CSV | — | ✓ |
| รายงานอัตโนมัติทุกจันทร์ | ส่งทดสอบเอง (embed) | การ์ดรูปภาพ + ส่งอัตโนมัติ |
| `/profile` เวลาตลอดกาล + อันดับ + ห้องยอดนิยม | — | ✓ |

- ราคา/เพดานวัน/รายการฟีเจอร์ อยู่ที่ `src/lib/premium.ts` ที่เดียว (`PREMIUM_PRICE_THB = 29`)
- เปิดใช้ตอนนี้ทำผ่านบอท: `/premium grant` (เจ้าของบอท, ต้องตั้ง `OWNER_ID` ฝั่งบอท)
- ยังไม่ต่อระบบชำระเงิน — เมื่อต่อแล้วแค่เรียก `grantPremium()` ฝั่งบอท หน้าเว็บจะเห็นสิทธิ์ทันที

## Env ที่ต้องใช้

ตั้งใน **Vercel → Project → Settings → Environment Variables** (และ `.env.local` สำหรับรันในเครื่อง):

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `DISCORD_CLIENT_ID` | OAuth2 / ลิงก์เชิญ / role connection |
| `DISCORD_CLIENT_SECRET` | แลก token ตอน login + linked roles (จาก Developer Portal → OAuth2) |
| `DISCORD_TOKEN` | โทเคนบอท — ใช้ดึงรายชื่อห้องในเซิร์ฟเวอร์ |
| `DATABASE_URL` | PostgreSQL (Supabase pooler) — ฐานข้อมูลเดียวกับบอท |
| `SESSION_SECRET` | คีย์เซ็นเซสชัน (`openssl rand -hex 32`) |
| `CARD_PREVIEW_ORIGIN` | (ไม่บังคับ) base URL ของบอทสำหรับพรีวิวการ์ด — ค่าเริ่มต้น `https://rem-bot-discord.onrender.com` |

## Developer Portal — ตั้งค่าครั้งเดียว

1. **OAuth2 → Redirects** เพิ่ม:
   - `https://rem-bot.vercel.app/api/auth/callback`
   - `https://rem-bot.vercel.app/api/linked-roles/verify`
2. **General Information**:
   - Linked Roles Verification URL → `https://rem-bot.vercel.app/api/linked-roles/verify`
   - Terms of Service URL → `https://rem-bot.vercel.app/terms`
   - Privacy Policy URL → `https://rem-bot.vercel.app/privacy`
3. ลงทะเบียนฟิลด์ยศ (ครั้งเดียว): `node --env-file=.env.local scripts/register-role-metadata.mts`

## รัน / deploy

```bash
npm install
npm run dev                      # local → http://localhost:3000
npx vercel deploy --prod --yes   # หรือ push ขึ้น main → Vercel deploy อัตโนมัติ
```
