import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { displayName, exchangeCode, fetchMe } from "@/lib/discord";
import {
  createSessionToken,
  hasSessionSecret,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * รหัสสาเหตุที่ส่งกลับไปโชว์บนหน้า /dashboard
 * - state-missing : ไม่มี state ใน URL (Discord ไม่ได้ส่งกลับมา)
 * - state-cookie  : เบราว์เซอร์ไม่ส่งคุกกี้ state กลับมา (คุกกี้ถูกบล็อก/คนละโดเมน)
 * - state-mismatch: state ใน URL ไม่ตรงกับคุกกี้ (อาจกด login ซ้ำหลายแท็บ)
 * - config        : ยังไม่ได้ตั้งค่า SESSION_SECRET
 * - token         : แลก code เป็น token กับ Discord ไม่สำเร็จ (client secret / redirect URI ไม่ตรง)
 * - me            : แลก token ได้ แต่ดึงข้อมูลผู้ใช้ไม่สำเร็จ
 */
type FailReason = "state-missing" | "state-cookie" | "state-mismatch" | "config" | "token" | "me";

/** รับ code จาก Discord → แลก token → สร้างเซสชัน → เข้าแดชบอร์ด */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const discordError = url.searchParams.get("error");

  const jar = await cookies();
  const savedState = jar.get(OAUTH_STATE_COOKIE)?.value;

  const fail = (reason: FailReason) => {
    if (discordError) console.warn("[auth] Discord ส่ง error กลับมา:", discordError);
    const res = NextResponse.redirect(new URL(`/dashboard?login=failed&reason=${reason}`, url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  };

  if (!code) return fail("state-missing");
  if (!state) return fail("state-missing");
  if (!savedState) return fail("state-cookie");
  if (state !== savedState) return fail("state-mismatch");
  if (!hasSessionSecret()) return fail("config");

  let accessToken: string;
  try {
    accessToken = await exchangeCode(`${url.origin}/api/auth/callback`, code);
  } catch (error) {
    console.error("[auth] แลก token ไม่สำเร็จ:", error);
    return fail("token");
  }

  try {
    const me = await fetchMe(accessToken);

    const sessionToken = createSessionToken({
      id: me.id,
      username: me.username,
      displayName: displayName(me),
      avatar: me.avatar,
      accessToken,
    });

    const res = NextResponse.redirect(new URL("/dashboard", url));
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(url.protocol === "https:"));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (error) {
    console.error("[auth] ดึงข้อมูลผู้ใช้ไม่สำเร็จ:", error);
    return fail("me");
  }
}
