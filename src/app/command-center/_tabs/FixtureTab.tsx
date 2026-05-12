"use client";

/**
 * FixtureTab — The Fixture List
 *
 * Like Championship Manager's fixture screen:
 *   • Open fixtures: projects waiting for a team
 *   • Active matches: projects currently running
 *   • Pending reviews: completed, awaiting the match report
 *   • Resolved: outcomes recorded, history
 *
 * This is the primary game loop UI. Directors come here to see
 * what's happening, what's waiting for them, and what just finished.
 */

import { useEffect, useState, useCallback } from "react";
import { MenuWindow } from "@/components/MenuWindow";
import type { DashboardPayload } from "../_shared/types";
import { translate, useLocale } from "@/lib/i18n";

interface FixtureProject {
  projectId: string;
  code: string;
  name: string;
  client: string;
  gameStatus: string;
  directorId: string | null;
  directorName: string | null;
  teamSize: number;
  predictedScore: number | null;
  progressPct: number;
  daysUntilStart: number | null;
  daysUntilDeadline: number | null;
  daysOverdue: number | null;
  budgetThb: number | null;
  marginPct: number | null;
  outcomeRecorded: boolean;
}

interface WorldStateResponse {
  ok: boolean;
  world?: {
    computedAt: string;
    cycle: string;
    daysIntoCycle: number;
    counts: {
      open: number;
      active: number;
      pendingReview: number;
      resolved: number;
      total: number;
    };
    pendingReviews: FixtureProject[];
    openFixtures: FixtureProject[];
    activeMatches: FixtureProject[];
    resolvedMatches: FixtureProject[];
    notifications: Array<{
      id: string;
      type: string;
      description: string;
      descriptionTh: string;
      createdAt: string;
    }>;
  };
}

interface MatchReportResponse {
  ok: boolean;
  report?: {
    projectName: string;
    predicted: { overallScore: number };
    actual: { overallScore: number; timelineStatus: string; qualityScore: number; clientSatisfaction: number; deliveryPoints: number };
    events: Array<{ minute: number; icon: string; headline: string; headlineTh: string; detail: string; detailTh: string; impact: number; involvedPlayerName?: string }>;
    insights: string[];
    insightsTh: string[];
    playerChanges: Array<{ nickname: string; changes: { hp?: number; mp?: number; form?: number; xp?: number } }>;
  };
}

export function FixtureTab({ dash }: { dash: DashboardPayload }) {
  const { loc } = useLocale();
  const [world, setWorld] = useState<WorldStateResponse["world"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<FixtureProject | null>(null);
  const [matchReport, setMatchReport] = useState<MatchReportResponse["report"] | null>(null);
  const [recordingProjectId, setRecordingProjectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch("/api/game/world-state");
      const data = (await res.json()) as WorldStateResponse;
      if (data.ok && data.world) {
        setWorld(data.world);
      }
    } catch (err) {
      console.error("[FixtureTab] failed to fetch world state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorld();
    const interval = setInterval(() => void fetchWorld(), 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchWorld, refreshKey]);

  async function handleSimulateOutcome(projectId: string) {
    setRecordingProjectId(projectId);
    try {
      const res = await fetch("/api/game/record-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, auto_simulate: true }),
      });
      const data = (await res.json()) as MatchReportResponse;
      if (data.ok && data.report) {
        setMatchReport(data.report);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("[FixtureTab] simulate failed:", err);
    } finally {
      setRecordingProjectId(null);
    }
  }

  function formatBudget(thb: number | null): string {
    if (!thb) return "—";
    if (thb >= 1_000_000) return `฿${(thb / 1_000_000).toFixed(1)}M`;
    if (thb >= 1_000) return `฿${(thb / 1_000).toFixed(0)}K`;
    return `฿${thb}`;
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      open: { label: translate(loc, { en: "OPEN", th: "เปิดรับ" }), color: "#86D1FF", bg: "rgba(134,209,255,0.12)" },
      drafting: { label: translate(loc, { en: "DRAFTING", th: "กำลังจัดทีม" }), color: "#f3b61f", bg: "rgba(243,182,31,0.12)" },
      pending: { label: translate(loc, { en: "PENDING", th: "รออนุมัติ" }), color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
      active: { label: translate(loc, { en: "ACTIVE", th: "กำลังดำเนินการ" }), color: "#86CD7E", bg: "rgba(134,205,126,0.12)" },
      completed: { label: translate(loc, { en: "DONE", th: "เสร็จสิ้น" }), color: "#d8411f", bg: "rgba(216,65,31,0.12)" },
      resolved: { label: translate(loc, { en: "RESOLVED", th: "บันทึกผลแล้ว" }), color: "#9F7BFF", bg: "rgba(159,123,255,0.12)" },
    };
    const s = map[status] ?? map.open;
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: s.color,
          background: s.bg,
          padding: "2px 6px",
          border: `1px solid ${s.color}`,
        }}
      >
        {s.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="cc-console-message">
        {translate(loc, { en: "Loading fixtures...", th: "กำลังโหลดตารางการแข่งขัน..." })}
      </div>
    );
  }

  if (!world) {
    return (
      <div className="cc-console-message cc-console-message-danger">
        {translate(loc, { en: "Failed to load game state", th: "โหลดสถานะเกมไม่สำเร็จ" })}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        <StatTile
          label={translate(loc, { en: "Open Fixtures", th: "เปิดรับ" })}
          value={world.counts.open}
          color="#86D1FF"
        />
        <StatTile
          label={translate(loc, { en: "Active Matches", th: "กำลังแข่ง" })}
          value={world.counts.active}
          color="#86CD7E"
        />
        <StatTile
          label={translate(loc, { en: "Pending Review", th: "รอรายงาน" })}
          value={world.counts.pendingReview}
          color="#d8411f"
        />
        <StatTile
          label={translate(loc, { en: "Resolved", th: "เสร็จสิ้น" })}
          value={world.counts.resolved}
          color="#9F7BFF"
        />
      </div>

      {/* Notifications */}
      {world.notifications.length > 0 && (
        <MenuWindow title={translate(loc, { en: "While You Were Away", th: "ขณะที่คุณไม่อยู่" })}>
          <div style={{ display: "grid", gap: 6 }}>
            {world.notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  background: "rgba(0,0,0,0.12)",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "var(--ink-1)", fontSize: 10 }}>
                  {new Date(n.createdAt).toLocaleDateString(loc === "th" ? "th-TH" : "en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span style={{ color: "var(--ink-0)" }}>
                  {loc === "th" && n.descriptionTh ? n.descriptionTh : n.description}
                </span>
              </div>
            ))}
          </div>
        </MenuWindow>
      )}

      {/* Open Fixtures */}
      {world.openFixtures.length > 0 && (
        <MenuWindow
          title={translate(loc, { en: "Open Fixtures", th: "โครงการเปิดรับ" })}
        >
          <FixtureList
            projects={world.openFixtures}
            onSelect={setSelectedProject}
            formatBudget={formatBudget}
            statusBadge={statusBadge}
            loc={loc}
          />
        </MenuWindow>
      )}

      {/* Active Matches */}
      {world.activeMatches.length > 0 && (
        <MenuWindow
          title={translate(loc, { en: "Active Matches", th: "กำลังดำเนินการ" })}
        >
          <FixtureList
            projects={world.activeMatches}
            onSelect={setSelectedProject}
            formatBudget={formatBudget}
            statusBadge={statusBadge}
            loc={loc}
            showProgress
          />
        </MenuWindow>
      )}

      {/* Pending Reviews */}
      {world.pendingReviews.length > 0 && (
        <MenuWindow
          title={translate(loc, { en: "Pending Reviews", th: "รอรายงานผล" })}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {world.pendingReviews.map((p) => (
              <div
                key={p.projectId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.08)",
                  borderLeft: "3px solid var(--rpg-red)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {statusBadge(p.gameStatus)}
                    <strong style={{ fontSize: 13, color: "var(--ink-0)" }}>{p.name}</strong>
                    <span style={{ fontSize: 10, color: "var(--ink-1)" }}>{p.client}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-1)", display: "flex", gap: 12 }}>
                    <span>{translate(loc, { en: "Budget", th: "งบประมาณ" })}: {formatBudget(p.budgetThb)}</span>
                    <span>{translate(loc, { en: "Margin", th: "มาร์จิ้น" })}: {p.marginPct}%</span>
                    {p.daysOverdue !== null && (
                      <span style={{ color: "var(--rpg-red)" }}>
                        {p.daysOverdue} {translate(loc, { en: "days overdue", th: "วันเกินกำหนด" })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSimulateOutcome(p.projectId)}
                  disabled={recordingProjectId === p.projectId}
                  style={{
                    border: "none",
                    background: "var(--rpg-red)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "8px 14px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {recordingProjectId === p.projectId
                    ? translate(loc, { en: "Simulating...", th: "กำลังจำลอง..." })
                    : translate(loc, { en: "Record Outcome", th: "บันทึกผล" })}
                </button>
              </div>
            ))}
          </div>
        </MenuWindow>
      )}

      {/* Match Report Modal */}
      {matchReport && (
        <MenuWindow
          title={`${translate(loc, { en: "Match Report", th: "รายงานการแข่งขัน" })} — ${matchReport.projectName}`}
        >
          <MatchReportView report={matchReport} loc={loc} onClose={() => setMatchReport(null)} />
        </MenuWindow>
      )}

      {/* Resolved */}
      {world.resolvedMatches.length > 0 && (
        <MenuWindow
          title={translate(loc, { en: "Resolved", th: "เสร็จสิ้นแล้ว" })}
        >
          <FixtureList
            projects={world.resolvedMatches}
            onSelect={setSelectedProject}
            formatBudget={formatBudget}
            statusBadge={statusBadge}
            loc={loc}
            compact
          />
        </MenuWindow>
      )}
    </div>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.12)",
        padding: "12px 14px",
        borderTop: `3px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-1)" }}>
        {label}
      </span>
      <strong style={{ fontSize: 28, fontFamily: "var(--font-mono)", lineHeight: 1, color }}>{value}</strong>
    </div>
  );
}

function FixtureList({
  projects,
  onSelect,
  formatBudget,
  statusBadge,
  loc,
  showProgress,
  compact,
}: {
  projects: FixtureProject[];
  onSelect: (p: FixtureProject) => void;
  formatBudget: (thb: number | null) => string;
  statusBadge: (status: string) => React.ReactNode;
  loc: "en" | "th";
  showProgress?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: compact ? 4 : 8 }}>
      {projects.map((p) => (
        <div
          key={p.projectId}
          onClick={() => onSelect(p)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(p);
          }}
          style={{
            display: "grid",
            gridTemplateColumns: showProgress ? "1fr 120px auto" : "1fr auto",
            gap: 12,
            alignItems: "center",
            padding: compact ? "6px 10px" : "10px 12px",
            background: "rgba(0,0,0,0.06)",
            cursor: "pointer",
            borderLeft: `3px solid ${getStatusColor(p.gameStatus)}`,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.14)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)";
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 2 : 4, flexWrap: "wrap" }}>
              {statusBadge(p.gameStatus)}
              <strong style={{ fontSize: compact ? 11 : 13, color: "var(--ink-0)" }}>{p.name}</strong>
              <span style={{ fontSize: 10, color: "var(--ink-1)" }}>{p.client}</span>
              {p.directorName && (
                <span style={{ fontSize: 9, color: "var(--ink-1)", background: "rgba(139,111,181,0.12)", padding: "1px 5px" }}>
                  {p.directorName}
                </span>
              )}
            </div>
            {!compact && (
              <div style={{ fontSize: 10, color: "var(--ink-1)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>{translate(loc, { en: "Budget", th: "งบประมาณ" })}: {formatBudget(p.budgetThb)}</span>
                <span>{translate(loc, { en: "Margin", th: "มาร์จิ้น" })}: {p.marginPct}%</span>
                <span>{translate(loc, { en: "Team", th: "ทีม" })}: {p.teamSize}</span>
                {p.predictedScore !== null && (
                  <span>{translate(loc, { en: "Predicted", th: "คาดการณ์" })}: {p.predictedScore}</span>
                )}
                {p.daysUntilDeadline !== null && (
                  <span>{p.daysUntilDeadline} {translate(loc, { en: "days left", th: "วันที่เหลือ" })}</span>
                )}
                {p.daysOverdue !== null && (
                  <span style={{ color: "var(--rpg-red)" }}>
                    {p.daysOverdue} {translate(loc, { en: "days overdue", th: "วันเกินกำหนด" })}
                  </span>
                )}
              </div>
            )}
          </div>

          {showProgress && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div
                style={{
                  height: 6,
                  background: "rgba(0,0,0,0.2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${p.progressPct}%`,
                    background: p.progressPct >= 80 ? "var(--rpg-green)" : p.progressPct >= 40 ? "var(--rpg-yellow)" : "var(--rpg-blue)",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 9, color: "var(--ink-1)", textAlign: "right" }}>{p.progressPct}%</span>
            </div>
          )}

          <span style={{ fontSize: 10, color: "var(--ink-1)", fontFamily: "var(--font-mono)" }}>
            {p.code}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchReportView({
  report,
  loc,
  onClose,
}: {
  report: NonNullable<MatchReportResponse["report"]>;
  loc: "en" | "th";
  onClose: () => void;
}) {
  const gap = report.actual.overallScore - report.predicted.overallScore;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Score comparison */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 16,
          alignItems: "center",
          padding: "16px 20px",
          background: "rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-1)", marginBottom: 4 }}>
            {translate(loc, { en: "Predicted", th: "คาดการณ์" })}
          </div>
          <strong style={{ fontSize: 36, fontFamily: "var(--font-mono)", color: "var(--ink-1)" }}>
            {report.predicted.overallScore}
          </strong>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: gap > 0 ? "var(--rpg-green)" : gap < -10 ? "var(--rpg-red)" : "var(--ink-1)",
            }}
          >
            {gap > 0 ? "+" : ""}{gap}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-1)", marginBottom: 4 }}>
            {translate(loc, { en: "Actual", th: "ผลจริง" })}
          </div>
          <strong style={{ fontSize: 36, fontFamily: "var(--font-mono)", color: "var(--ink-0)" }}>
            {report.actual.overallScore}
          </strong>
        </div>
      </div>

      {/* Match stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <div
          style={{
            background: "rgba(0,0,0,0.12)",
            padding: "12px 14px",
            borderTop: "3px solid #86CD7E",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-1)" }}>
            {translate(loc, { en: "Timeline", th: "ตามกำหนด" })}
          </span>
          <strong style={{ fontSize: 14, color: "#86CD7E", textTransform: "uppercase" }}>
            {report.actual.timelineStatus.replace("_", " ")}
          </strong>
        </div>
        <StatTile label={translate(loc, { en: "Quality", th: "คุณภาพ" })} value={report.actual.qualityScore} color="#86D1FF" />
        <StatTile label={translate(loc, { en: "Client", th: "ลูกค้า" })} value={report.actual.clientSatisfaction} color="#f3b61f" />
        <StatTile label={translate(loc, { en: "Points", th: "คะแนน" })} value={report.actual.deliveryPoints} color="#9F7BFF" />
      </div>

      {/* Events */}
      {report.events.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-0)", marginBottom: 8 }}>
            {translate(loc, { en: "Match Events", th: "เหตุการณ์ในการแข่งขัน" })}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {report.events.map((evt, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "8px 10px",
                  background: "rgba(0,0,0,0.08)",
                  borderLeft: `3px solid ${evt.impact > 0 ? "var(--rpg-green)" : evt.impact < 0 ? "var(--rpg-red)" : "var(--ink-1)"}`,
                }}
              >
                <span style={{ fontSize: 14 }}>{evt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-0)" }}>
                    {loc === "th" ? evt.headlineTh : evt.headline}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-1)", lineHeight: 1.5 }}>
                    {loc === "th" ? evt.detailTh : evt.detail}
                    {evt.involvedPlayerName && (
                      <span style={{ color: "var(--rpg-yellow)" }}> — {evt.involvedPlayerName}</span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: evt.impact > 0 ? "var(--rpg-green)" : "var(--rpg-red)",
                  }}
                >
                  {evt.impact > 0 ? "+" : ""}{evt.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-0)", marginBottom: 8 }}>
          {translate(loc, { en: "Learning", th: "บทเรียน" })}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {(loc === "th" ? report.insightsTh : report.insights).map((insight, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "var(--ink-0)",
                lineHeight: 1.6,
                padding: "8px 10px",
                background: "rgba(139,111,181,0.08)",
                borderLeft: "2px solid var(--rpg-purple)",
              }}
            >
              {insight}
            </div>
          ))}
        </div>
      </div>

      {/* Player changes */}
      {report.playerChanges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-0)", marginBottom: 8 }}>
            {translate(loc, { en: "Player Changes", th: "การเปลี่ยนแปลงของพนักงาน" })}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {report.playerChanges.map((pc, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "rgba(0,0,0,0.06)",
                  fontSize: 11,
                }}
              >
                <strong style={{ color: "var(--ink-0)", minWidth: 80 }}>{pc.nickname}</strong>
                <span style={{ color: "var(--ink-1)" }}>
                  {pc.changes.hp !== undefined && `HP ${pc.changes.hp > 0 ? "+" : ""}${pc.changes.hp} `}
                  {pc.changes.mp !== undefined && `MP ${pc.changes.mp > 0 ? "+" : ""}${pc.changes.mp} `}
                  {pc.changes.form !== undefined && `Form ${pc.changes.form > 0 ? "+" : ""}${pc.changes.form} `}
                  {pc.changes.xp !== undefined && `XP +${pc.changes.xp}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        style={{
          border: "none",
          background: "var(--rpg-blue)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 800,
          padding: "10px 16px",
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          justifySelf: "start",
        }}
      >
        {translate(loc, { en: "Close Report", th: "ปิดรายงาน" })}
      </button>
    </div>
  );
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: "#86D1FF",
    drafting: "#f3b61f",
    pending: "#FB923C",
    active: "#86CD7E",
    completed: "#d8411f",
    resolved: "#9F7BFF",
  };
  return map[status] ?? "#888";
}
