/**
 * POST /api/auth/login
 *
 * Body: { password: string }
 * Sets `tkc_access` cookie on success. Redirects on match.
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
  res.cookies.set("tkc_access", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return res;
}
