/**
 * /api/briefing/today
 *
 * GET  — return the briefing data + Markdown for inline rendering.
 * POST — same, plus write to Obsidian vault as
 *        TKC-Briefing-YYYY-MM-DD.md (overwrites if exists).
 *
 * Auth: protected by site middleware (tkc_access cookie).
 *
 * The Obsidian write goes to the same vault path as the export endpoint
 * (`OBSIDIAN_VAULT_PATH` env var, default `~/Documents/SecondBrain/03-Topics/TKC`).
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadBriefing, renderBriefingMarkdown } from "@/lib/briefing";
import { logApiError } from "@/lib/api";

function expandHome(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}
const VAULT_DEFAULT = "~/Documents/SecondBrain/03-Topics/TKC";

export async function GET() {
  try {
    const briefing = await loadBriefing();
    const markdown = renderBriefingMarkdown(briefing);
    return NextResponse.json({ ok: true, briefing, markdown });
  } catch (err) {
    logApiError("api/briefing/today GET", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const briefing = await loadBriefing();
    const markdown = renderBriefingMarkdown(briefing);

    const vaultRoot = expandHome(process.env.OBSIDIAN_VAULT_PATH ?? VAULT_DEFAULT);
    const target = path.join(vaultRoot, `TKC-Briefing-${briefing.date}.md`);

    let written = false;
    try {
      await fs.mkdir(vaultRoot, { recursive: true });
      await fs.writeFile(target, markdown, "utf-8");
      written = true;
    } catch (err) {
      // Vault not accessible — return success but flag
      logApiError("api/briefing/today POST (vault write)", err);
    }

    return NextResponse.json({
      ok: true,
      briefing,
      markdown,
      vault_target: target,
      vault_written: written,
    });
  } catch (err) {
    logApiError("api/briefing/today POST", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
