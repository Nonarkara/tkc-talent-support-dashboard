/**
 * POST /api/auth/login
 *
 * Body: { password: string }
 * Sets `tkc_session` cookie on success. Redirects on match.
 */

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: string };
  const provided = String(body.password ?? "").trim();
  const expected = process.env.DASHBOARD_PASSWORD ?? "";

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("tkc_session", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // 8 hours — one work session. Browser-close + 8 hours of idle both
    // end the session. Re-enter the password the next time you open it.
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
