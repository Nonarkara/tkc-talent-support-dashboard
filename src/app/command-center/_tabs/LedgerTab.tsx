"use client";

/**
 * LedgerTab — the in-app status mirror for the Google Sheets pipe.
 *
 * Three stacked subway-flat panels:
 *   1. Setup checklist — which env vars / sheet grants / tabs are live
 *   2. Mirror coverage — which DB write fires which tab row
 *   3. Bootstrap control — idempotent tab-creation button (disabled
 *      until env is set and missing.length > 0)
 *
 * Never echoes service-account key contents — detects presence only via
 * `/api/sheets/health` (server-side) which returns `enabled` as a bool.
 *
 * The header `SyncDot` still owns its own 60-s poll in page.tsx;
 * LedgerTab runs a separate 30-s poll so this screen stays fresh while
 * the tab is open.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MenuWindow } from "@/components/MenuWindow";
import { translate, useLocale } from "@/lib/i18n";
import { LEDGER } from "@/lib/i18n-dict";
import type { DashboardPayload } from "../_shared/types";

type SheetsHealth = {
  ok: boolean;
  enabled: boolean;
  tabs: string[];
  declared: string[];
  missing: string[];
  error?: string;
  checked_at: string;
};

// ─── Mirror coverage ────────────────────────────────────────────────────
//
// Static catalog of every mirror function wired today. When
// sheets-mirror.ts grows a new helper, add a row here so LedgerTab
// surfaces it. Strings stay EN for now — this panel is engineering-
// facing, migrates next turn with the rest of the tab-body pass.

interface MirrorRow {
  fn: string;
  tab: string;
  triggeredBy: string;
}

const MIRRORS: readonly MirrorRow[] = [
  { fn: "mirrorPlayer", tab: "Players", triggeredBy: "employee save, stat delta approve" },
  { fn: "mirrorProject", tab: "Projects", triggeredBy: "project save, team save" },
  { fn: "mirrorTeamAssignments", tab: "Teams", triggeredBy: "formation save" },
  { fn: "mirrorFormation", tab: "Formation", triggeredBy: "formation save" },
  { fn: "mirrorFormationEvent", tab: "FormationEvents", triggeredBy: "assign / unassign / needs.update / save" },
  { fn: "mirrorNinjaSquad", tab: "NinjaSquads", triggeredBy: "ninja quest POST / PATCH" },
  { fn: "mirrorSquadEvent", tab: "SquadEvents", triggeredBy: "ninja toggle / member change / save" },
  { fn: "mirrorSkillCatalog", tab: "SkillCatalog", triggeredBy: "ninja bootstrap, cron" },
  { fn: "mirrorSkillUpdate", tab: "SquadEvents", triggeredBy: "skill attribute change" },
  { fn: "mirrorMatrixScenario", tab: "MatrixScenarios", triggeredBy: "POST /api/matrix/scenarios" },
  { fn: "mirrorResource", tab: "Resources", triggeredBy: "resources register save" },
  { fn: "mirrorVocationChange", tab: "VocationChanges", triggeredBy: "alltrades reskill event" },
  { fn: "appendAttrHistory", tab: "AttrHistory", triggeredBy: "monthly attribute snapshot" },
  { fn: "mirrorAttendance", tab: "Attendance", triggeredBy: "lobby check-in / check-out (v8.2)" },
  { fn: "mirrorInteraction", tab: "Interactions", triggeredBy: "lobby chat event (v8.2)" },
  { fn: "mirrorMemo", tab: "Memos", triggeredBy: "formation / ninja save + manual memo (v8.2)" },
];

// ─── Component ─────────────────────────────────────────────────────────

export function LedgerTab({ dash: _dash }: { dash: DashboardPayload }) {
  void _dash;
  const { loc } = useLocale();
  const [health, setHealth] = useState<SheetsHealth | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/sheets/health", { cache: "no-store" });
      const data = (await res.json()) as SheetsHealth;
      setHealth(data);
    } catch {
      setHealth({
        ok: false,
        enabled: false,
        tabs: [],
        declared: [],
        missing: [],
        error: "health endpoint unreachable",
        checked_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const runBootstrap = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/sync/sheets-bootstrap", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        tabs_created?: string[];
        tabs_already_existed?: string[];
        error?: string;
      };
      if (data.ok) {
        const created = data.tabs_created?.length ?? 0;
        toast.success(
          translate(loc, {
            en: `Bootstrap complete — ${created} tab(s) created`,
            th: `สร้างแท็บเรียบร้อย — ${created} แท็บ`,
          }),
        );
        void fetchHealth();
      } else {
        toast.error(data.error ?? "Bootstrap failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  }, [fetchHealth, loc]);

  const enabled = Boolean(health?.enabled);
  const healthy = Boolean(health?.ok);
  const missing = health?.missing ?? [];
  const declared = health?.declared ?? [];
  const tabsFound = health?.tabs.length ?? 0;

  // ─── Setup checklist rows ───────────────────────────────────────────
  const checklist: Array<{ label: string; done: boolean; hint?: string }> = [
    {
      label: translate(loc, {
        en: "GOOGLE_SHEETS_ID set",
        th: "ตั้งค่า GOOGLE_SHEETS_ID",
      }),
      done: enabled,
      hint: ".env.local",
    },
    {
      label: translate(loc, {
        en: "GOOGLE_SERVICE_ACCOUNT_KEY set",
        th: "ตั้งค่า GOOGLE_SERVICE_ACCOUNT_KEY",
      }),
      done: enabled,
      hint: "service-account JSON",
    },
    {
      label: translate(loc, {
        en: "Service account has Editor access",
        th: "service account มีสิทธิ์แก้ไขชีต",
      }),
      done: enabled && healthy,
      hint: translate(loc, { en: "Share sheet with SA email", th: "แชร์ชีตให้อีเมล SA" }),
    },
    {
      label: translate(loc, {
        en: "Canonical tabs created",
        th: "สร้างแท็บมาตรฐานครบ",
      }),
      done: enabled && declared.length > 0 && missing.length === 0,
      hint: declared.length > 0 ? `${declared.length - missing.length}/${declared.length}` : "—",
    },
    {
      label: translate(loc, {
        en: "/api/sheets/health returns ok",
        th: "/api/sheets/health ตอบ ok",
      }),
      done: healthy,
    },
    {
      label: translate(loc, {
        en: "Bootstrap has been run",
        th: "เรียก bootstrap แล้ว",
      }),
      done: enabled && missing.length === 0 && tabsFound > 0,
    },
  ];

  const doneCount = checklist.filter((c) => c.done).length;

  // ─── Health chip ────────────────────────────────────────────────────
  const healthChip = !enabled
    ? { label: translate(loc, LEDGER.health_disabled), color: "rgba(245,240,232,0.35)" }
    : !health
      ? { label: translate(loc, LEDGER.health_probing), color: "var(--rpg-yellow, #f3c567)" }
      : healthy
        ? { label: translate(loc, LEDGER.health_ok), color: "#5ec28a" }
        : { label: translate(loc, LEDGER.health_error), color: "#d45e4e" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        maxWidth: 980,
        margin: "0 auto",
      }}
    >
      {/* ── Panel 1: Setup checklist ───────────────────────────────── */}
      <MenuWindow title={translate(loc, LEDGER.setup_heading)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-1)",
          }}
        >
          <span>
            {doneCount}/{checklist.length}{" "}
            {translate(loc, { en: "configured", th: "พร้อมใช้" })}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              border: `1px solid ${healthChip.color}`,
              color: healthChip.color,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                background: healthChip.color,
                display: "inline-block",
              }}
            />
            {healthChip.label}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {checklist.map((row) => (
            <div
              key={row.label}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid rgba(245,240,232,0.08)",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  border: `1px solid ${row.done ? "#5ec28a" : "rgba(245,240,232,0.25)"}`,
                  background: row.done ? "#5ec28a" : "transparent",
                  color: row.done ? "#0c0c0c" : "transparent",
                  fontSize: 10,
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {row.done ? "●" : " "}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              >
                {row.label}
              </span>
              {row.hint ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    color: "var(--ink-1)",
                  }}
                >
                  {row.hint}
                </span>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </MenuWindow>

      {/* ── Panel 2: Mirror coverage ───────────────────────────────── */}
      <MenuWindow title={translate(loc, LEDGER.coverage_heading)}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-primary)",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 8px",
                    borderBottom: "1px solid rgba(245,240,232,0.25)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontSize: 10,
                    color: "var(--ink-1)",
                  }}
                >
                  {translate(loc, LEDGER.function_col)}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 8px",
                    borderBottom: "1px solid rgba(245,240,232,0.25)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontSize: 10,
                    color: "var(--ink-1)",
                  }}
                >
                  {translate(loc, LEDGER.tab_col)}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 8px",
                    borderBottom: "1px solid rgba(245,240,232,0.25)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontSize: 10,
                    color: "var(--ink-1)",
                  }}
                >
                  {translate(loc, LEDGER.trigger_col)}
                </th>
              </tr>
            </thead>
            <tbody>
              {MIRRORS.map((m) => {
                const tabExists = declared.includes(m.tab);
                const tabMissing = missing.includes(m.tab);
                return (
                  <tr key={m.fn}>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid rgba(245,240,232,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <code style={{ fontSize: 11 }}>{m.fn}</code>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid rgba(245,240,232,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: tabMissing
                            ? "#d45e4e"
                            : tabExists && healthy
                              ? "#5ec28a"
                              : "var(--ink-1)",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: 6,
                            height: 6,
                            background: tabMissing
                              ? "#d45e4e"
                              : tabExists && healthy
                                ? "#5ec28a"
                                : "rgba(245,240,232,0.35)",
                          }}
                        />
                        {m.tab}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid rgba(245,240,232,0.06)",
                        color: "var(--ink-1)",
                      }}
                    >
                      {m.triggeredBy}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MenuWindow>

      {/* ── Panel 3: Bootstrap control ─────────────────────────────── */}
      <MenuWindow title={translate(loc, LEDGER.bootstrap_heading)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-primary)",
          }}
        >
          <button
            type="button"
            onClick={() => void runBootstrap()}
            disabled={!enabled || busy || missing.length === 0}
            style={{
              padding: "10px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "1px solid var(--text-primary)",
              background:
                !enabled || missing.length === 0 ? "transparent" : "var(--text-primary)",
              color:
                !enabled || missing.length === 0 ? "var(--ink-1)" : "var(--ink-4)",
              cursor:
                !enabled || busy || missing.length === 0 ? "not-allowed" : "pointer",
              opacity: !enabled || missing.length === 0 ? 0.5 : 1,
            }}
          >
            {busy
              ? translate(loc, { en: "Running…", th: "กำลังทำงาน…" })
              : translate(loc, LEDGER.bootstrap_button)}
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "var(--ink-1)", letterSpacing: "0.08em" }}>
              {translate(loc, { en: "Tabs found", th: "พบแท็บ" })}: {tabsFound}
              {declared.length > 0 ? ` / ${declared.length}` : ""}
            </span>
            <span style={{ color: "var(--ink-1)", letterSpacing: "0.08em" }}>
              {translate(loc, { en: "Missing", th: "ขาด" })}: {missing.length}
            </span>
            {health?.checked_at ? (
              <span style={{ color: "var(--ink-1)", letterSpacing: "0.08em" }}>
                {translate(loc, { en: "Last check", th: "ตรวจล่าสุด" })}:{" "}
                {new Date(health.checked_at).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>

        {!enabled ? (
          <p
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--ink-1)",
            }}
          >
            {translate(loc, {
              en: "Sheets is in no-op mode. Add GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY to .env.local, share the sheet with the service-account email (Editor), then reload.",
              th: "โหมดไม่บันทึก ชีต ยังไม่ได้ตั้งค่า เพิ่ม GOOGLE_SHEETS_ID และ GOOGLE_SERVICE_ACCOUNT_KEY ใน .env.local แชร์ชีตให้อีเมล service account (สิทธิ์ Editor) แล้วรีโหลดหน้า",
            })}
          </p>
        ) : missing.length > 0 ? (
          <p
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--ink-1)",
            }}
          >
            {translate(loc, {
              en: `Missing tabs: ${missing.join(", ")}`,
              th: `แท็บที่ขาด: ${missing.join(", ")}`,
            })}
          </p>
        ) : (
          <p
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.6,
              color: "#5ec28a",
            }}
          >
            {translate(loc, {
              en: "All canonical tabs present — pipe is live.",
              th: "มีแท็บครบตามโครงสร้าง ท่อพร้อมใช้งาน",
            })}
          </p>
        )}
      </MenuWindow>

      {/* ── Panel 4: Restore from Sheets ─────────────────────────── */}
      <RestorePanel loc={loc} enabled={enabled} healthy={healthy} missingCount={missing.length} />
    </div>
  );
}

type RestoreScope = "players" | "projects" | "resources";

function RestorePanel({
  loc,
  enabled,
  healthy,
  missingCount,
}: {
  loc: ReturnType<typeof useLocale>["loc"];
  enabled: boolean;
  healthy: boolean;
  missingCount: number;
}) {
  const [confirmingScope, setConfirmingScope] = useState<RestoreScope | null>(null);
  const [busyScope, setBusyScope] = useState<RestoreScope | null>(null);

  const canRestore = enabled && healthy && missingCount === 0;

  const runRestore = useCallback(async (scope: RestoreScope) => {
    setBusyScope(scope);
    try {
      const res = await fetch("/api/sync/sheets-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, confirm: "RESTORE" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        total_inserted?: number;
        total_updated?: number;
        total_skipped?: number;
        total_scanned?: number;
        errors?: string[];
        error?: string;
      };
      if (data.ok) {
        toast.success(
          translate(loc, {
            en: `${scope}: ${data.total_inserted ?? 0} inserted · ${data.total_updated ?? 0} updated · ${data.total_skipped ?? 0} skipped`,
            th: `${scope}: เพิ่ม ${data.total_inserted ?? 0} · อัปเดต ${data.total_updated ?? 0} · ข้าม ${data.total_skipped ?? 0}`,
          }),
        );
      } else {
        const msg = data.error ?? data.errors?.[0] ?? "Restore failed";
        toast.error(msg);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyScope(null);
      setConfirmingScope(null);
    }
  }, [loc]);

  const handleClick = useCallback((scope: RestoreScope) => {
    if (busyScope) return;
    if (confirmingScope === scope) {
      void runRestore(scope);
    } else {
      setConfirmingScope(scope);
      // Auto-clear confirm state after 3s if user doesn't follow through.
      window.setTimeout(() => {
        setConfirmingScope((current) => (current === scope ? null : current));
      }, 3000);
    }
  }, [busyScope, confirmingScope, runRestore]);

  const SCOPES: Array<{ scope: RestoreScope; label: { en: string; th: string } }> = [
    { scope: "players", label: { en: "Restore Players", th: "กู้คืน Players" } },
    { scope: "projects", label: { en: "Restore Projects", th: "กู้คืน Projects" } },
    { scope: "resources", label: { en: "Restore Resources", th: "กู้คืน Resources" } },
  ];

  return (
    <MenuWindow
      title={translate(loc, { en: "Restore from Sheets", th: "กู้คืนจากชีต" })}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: 14,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          lineHeight: 1.6,
          color: "var(--ink-1)",
        }}
      >
        {translate(loc, {
          en: "Reverse direction. Reads the Sheet rows back into Postgres if the database has been wiped or seeded fresh. UPSERTs only — never deletes. Restores projects (budgets, progress, dates, and league points), players (attributes and lock state), and resources. Recomputed columns (HP, MP, token cost) are re-derived on the next mirror update.",
          th: "ทิศทางย้อนกลับ อ่านแถวจากชีตกลับเข้าฐานข้อมูล Postgres ในกรณีฐานข้อมูลถูกล้างหรือเริ่มใหม่ ใช้ UPSERT เท่านั้น ไม่ลบข้อมูล กู้คืนทั้งโครงการ (งบประมาณ ความคืบหน้า วันที่ และแต้มลีก) พนักงาน (ค่าพลังและสถานะล็อค) และทรัพยากร คอลัมน์ที่คำนวณซ้ำ (HP, MP, token cost) จะถูกคำนวณใหม่เมื่อมีการอัปเดตครั้งถัดไป",
        })}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {SCOPES.map(({ scope, label }) => {
          const isConfirming = confirmingScope === scope;
          const isBusy = busyScope === scope;
          const disabled = !canRestore || (busyScope !== null && busyScope !== scope);
          return (
            <button
              key={scope}
              type="button"
              onClick={() => handleClick(scope)}
              disabled={disabled}
              style={{
                padding: "10px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                border: `1px solid ${isConfirming ? "#d45e4e" : "var(--text-primary)"}`,
                background: isConfirming ? "#d45e4e" : "transparent",
                color: isConfirming ? "var(--ink-4)" : disabled ? "var(--ink-1)" : "var(--text-primary)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "background 0.12s, color 0.12s, border-color 0.12s",
              }}
            >
              {isBusy
                ? translate(loc, { en: "Running…", th: "กำลังทำงาน…" })
                : isConfirming
                  ? translate(loc, { en: "Click to confirm", th: "คลิกอีกครั้งเพื่อยืนยัน" })
                  : translate(loc, label)}
            </button>
          );
        })}
      </div>

      {!canRestore ? (
        <p
          style={{
            marginTop: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-1)",
            letterSpacing: "0.04em",
          }}
        >
          {!enabled
            ? translate(loc, {
                en: "Sheets disabled — set GOOGLE_SHEETS_ID + GOOGLE_SERVICE_ACCOUNT_KEY first.",
                th: "ชีตปิดอยู่ — ตั้งค่า GOOGLE_SHEETS_ID และ GOOGLE_SERVICE_ACCOUNT_KEY ก่อน",
              })
            : translate(loc, {
                en: "Bootstrap missing tabs first.",
                th: "เรียก bootstrap แท็บที่ขาดก่อน",
              })}
        </p>
      ) : null}
    </MenuWindow>
  );
}

