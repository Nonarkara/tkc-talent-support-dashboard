/**
 * POST /api/auth/logout
 *
 * Clears the `tkc_session` cookie immediately. Next request will be
 * redirected to /login by the middleware.
 */

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tkc_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // expire immediately
    path: "/",
  });
  return res;
}
