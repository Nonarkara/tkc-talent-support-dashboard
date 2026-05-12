/**
 * POST /api/game/record-outcome
 *
 * The "match report" moment.
 * When a project completes, record the actual outcome.
 * Can be:
 *   • Manual: user provides actual scores
 *   • Auto-simulated: runs match-engine to generate realistic results
 *
 * Body (manual):
 * {
 *   project_id: string,
 *   timeline_status: "early" | "on_time" | "late" | "failed",
 *   quality_score: number,
 *   client_satisfaction: number,
 *   budget_variance_pct: number,
 *   notes?: string,
 *   lessons?: string[]
 * }
 *
 * Body (auto):
 * {
 *   project_id: string,
 *   auto_simulate: true
 * }
 */

import { apiJson, apiError } from "@/lib/api";
import { isDbConfigured, query } from "@/lib/db";
import { simulateMatch, type MatchReport } from "@/lib/match-engine";
import { TKC_REAL_PROJECTS } from "@/lib/tkc-org";

interface RecordOutcomeBody {
  project_id: string;
  auto_simulate?: boolean;
  // Manual fields
  timeline_status?: "early" | "on_time" | "late" | "failed";
  quality_score?: number;
  client_satisfaction?: number;
  budget_variance_pct?: number;
  notes?: string;
  lessons?: string[];
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  let body: RecordOutcomeBody;
  try {
    body = (await request.json()) as RecordOutcomeBody;
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { project_id, auto_simulate } = body;
  if (!project_id) {
    return apiError("project_id is required", 400);
  }

  try {
    // 1. Fetch project
    const projectRows = await query<{
      id: string;
      code: string;
      name: string;
      client_name: string | null;
      budget_thb: number | null;
      gross_margin_pct: number | null;
      status: string;
      director_id: string | null;
      end_date: string | null;
    }>(
      `SELECT id, code, name, client_name, budget_thb, gross_margin_pct, status, director_id, end_date
       FROM projects WHERE id = $1`,
      [project_id],
    );
    if (projectRows.length === 0) {
      return apiError("Project not found", 404);
    }
    const dbProject = projectRows[0];

    // 2. Fetch team allocations
    const allocRows = await query<{
      employee_id: string;
      fte: number;
      assignment_label: string;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT employee_id, fte, assignment_label, metadata
       FROM employee_allocations
       WHERE project_id = $1 AND status = 'active'`,
      [project_id],
    );

    if (allocRows.length === 0) {
      return apiError("No active team found for this project", 400);
    }

    // 3. Fetch latest snapshot for predicted scores
    const snapRows = await query<{
      fit_pct: number | null;
      chemistry_score: number | null;
      overall_score: number | null;
      coach_id: string | null;
    }>(
      `SELECT fit_pct, chemistry_score, overall_score, coach_id
       FROM team_snapshots
       WHERE project_id = $1
       ORDER BY snapshot_at DESC
       LIMIT 1`,
      [project_id],
    );
    const snapshot = snapRows[0] ?? null;

    let report: MatchReport;

    if (auto_simulate) {
      // ─── AUTO-SIMULATE ───────────────────────────────────
      const tkcProject = TKC_REAL_PROJECTS.find((p) => p.id === dbProject.code) ?? {
        id: dbProject.code,
        name: dbProject.name,
        client: dbProject.client_name ?? "",
        divisionCode: "TECH",
        deptCode: "PMO",
        priority: "medium",
        progressPct: 100,
        budgetThb: dbProject.budget_thb ? Number(dbProject.budget_thb) : undefined,
        grossMarginPct: dbProject.gross_margin_pct ? Number(dbProject.gross_margin_pct) : undefined,
      };

      // Build minimal team from allocation data for narrative events
      const team = allocRows.map((a) => ({
        id: a.employee_id,
        nickname: a.assignment_label || a.employee_id.slice(0, 6),
        seed: 0,
        role: "staff" as const,
        roleEn: "Staff",
        roleTh: "พนักงาน",
        deptCode: "",
        divisionCode: "",
        tenure: 0,
        level: 5,
        attributes: { str: 10, int: 10, wis: 10, cha: 10, dex: 10, con: 10 },
        rpgClass: "warrior" as const,
        isPresent: true,
        isRemote: false,
        hp: 50,
        maxHp: 100,
        mp: 50,
        maxMp: 100,
        credo: { innovation: 50, integrity: 50, collaboration: 50, customerFirst: 50, excellence: 50 },
        utilization: 80,
        streakDays: 10,
        totalXp: 100,
        status: "healthy" as const,
        ica: { impact: 50, collaboration: 50, advancement: 50, overall: 50 },
        form: 5,
        capacityCost: 50,
        demandCount: 2,
        investmentValue: 100,
        isCaptain: false,
        weeklyPoints: 0,
        seasonPoints: 0,
        positionType: "MID" as const,
        fourC: { cause: 50, compensation: 50, career: 50, community: 50 },
        ocean: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
        leaveDaysUsed: 0,
        leaveDaysTotal: 10,
        leaveDaysRemaining: 10,
        sickDaysUsed: 0,
      })) as unknown as import("@/lib/command-center-data").CommandCharacter[];

      const directorRow = await query<{ nickname: string | null }>(
        "SELECT nickname FROM employees WHERE id = $1",
        [dbProject.director_id],
      );

      // Use snapshot scores as baseline, or generate reasonable defaults
      const predictedScore = {
        fitPct: snapshot?.fit_pct ?? 60,
        chemistryScore: snapshot?.chemistry_score ?? 55,
        overallScore: snapshot?.overall_score ?? 58,
        coverage: { technical: 60, softSkill: 60, outsource: 60, inHouse: 60 },
        insights: [] as string[],
        chemistryAdjusted: snapshot?.chemistry_score ?? 55,
        sentimentScore: 0,
        sentimentAdjustment: 0,
        demandCoverage: { technical: 60, softSkill: 60, outsource: 60, inHouse: 60 },
        personalityFit: 50,
        budgetEfficiency: 50,
        hierarchyBonus: 0,
        sizeBonus: 0,
        rawScore: 58,
      } as unknown as import("@/lib/snap-engine").TeamProjectScore;

      const budgetStatus: "under" | "optimal" | "tight" | "over" = "optimal";
      const estimatedPoints = Math.round(predictedScore.overallScore * 0.8);

      report = simulateMatch({
        project: tkcProject,
        team,
        predictedScore,
        estimatedPoints,
        budgetStatus,
        directorId: dbProject.director_id ?? "",
        directorName: directorRow[0]?.nickname ?? "Unknown",
        cycle: "2026-Q2",
      });
    } else {
      // ─── MANUAL ENTRY ────────────────────────────────────
      if (!body.timeline_status || body.quality_score === undefined || body.client_satisfaction === undefined) {
        return apiError("timeline_status, quality_score, and client_satisfaction are required for manual entry", 400);
      }

      const directorRow = await query<{ nickname: string | null }>(
        "SELECT nickname FROM employees WHERE id = $1",
        [dbProject.director_id],
      );

      report = {
        projectId: project_id,
        projectName: dbProject.name,
        client: dbProject.client_name ?? "",
        directorId: dbProject.director_id ?? "",
        directorName: directorRow[0]?.nickname ?? "Unknown",
        cycle: "2026-Q2",
        predicted: {
          fitPct: snapshot?.fit_pct ?? 50,
          chemistryScore: snapshot?.chemistry_score ?? 50,
          overallScore: snapshot?.overall_score ?? 50,
          estimatedPoints: 0,
          budgetStatus: "optimal",
        },
        actual: {
          timelineStatus: body.timeline_status,
          qualityScore: body.quality_score,
          clientSatisfaction: body.client_satisfaction,
          budgetVariancePct: body.budget_variance_pct ?? 0,
          overallScore: body.quality_score, // simplified
          deliveryPoints: Math.round((body.quality_score / 100) * 100 * (body.client_satisfaction / 3)),
          marginAchieved: dbProject.gross_margin_pct ? Number(dbProject.gross_margin_pct) : 15,
        },
        events: [],
        playerChanges: [],
        insights: body.notes ? [body.notes] : ["Manually recorded outcome."],
        insightsTh: body.notes ? [body.notes] : ["บันทึกผลลัพธ์ด้วยตนเอง"],
        playedAt: new Date(),
        randomSeed: "manual",
      };
    }

    // 5. Save outcome
    await query(
      `INSERT INTO project_outcomes (
        project_id, budget_actual_thb, timeline_status, quality_score,
        client_satisfaction, predicted_fit, predicted_chemistry, predicted_overall,
        team_cost_cp, team_size, notes, lessons, random_seed, simulated,
        delivery_points, margin_achieved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (project_id) DO UPDATE SET
        timeline_status = EXCLUDED.timeline_status,
        quality_score = EXCLUDED.quality_score,
        client_satisfaction = EXCLUDED.client_satisfaction,
        predicted_fit = EXCLUDED.predicted_fit,
        predicted_chemistry = EXCLUDED.predicted_chemistry,
        predicted_overall = EXCLUDED.predicted_overall,
        notes = EXCLUDED.notes,
        lessons = EXCLUDED.lessons,
        random_seed = EXCLUDED.random_seed,
        simulated = EXCLUDED.simulated,
        delivery_points = EXCLUDED.delivery_points,
        margin_achieved = EXCLUDED.margin_achieved`,
      [
        project_id,
        null, // budget_actual_thb — could compute from variance
        report.actual.timelineStatus,
        report.actual.qualityScore,
        report.actual.clientSatisfaction,
        report.predicted.fitPct,
        report.predicted.chemistryScore,
        report.predicted.overallScore,
        null, // team_cost_cp
        allocRows.length,
        report.insights.join("\n"),
        report.insightsTh,
        report.randomSeed,
        auto_simulate ?? false,
        report.actual.deliveryPoints,
        report.actual.marginAchieved,
      ],
    );

    // 6. Mark allocations as completed
    await query(
      `UPDATE employee_allocations
       SET status = 'completed', updated_at = now()
       WHERE project_id = $1 AND status = 'active'`,
      [project_id],
    );

    // 7. Mark project as completed
    await query(
      `UPDATE projects
       SET status = 'completed', progress_pct = 100, updated_at = now()
       WHERE id = $1`,
      [project_id],
    );

    // 8. Log events
    for (const evt of report.events) {
      await query(
        `INSERT INTO game_events (type, project_id, employee_id, director_id, description, description_th, impact)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "random_event",
          project_id,
          evt.involvedPlayerId ?? null,
          dbProject.director_id,
          `${evt.headline}: ${evt.detail}`,
          `${evt.headlineTh}: ${evt.detailTh}`,
          evt.impact,
        ],
      );
    }

    await query(
      `INSERT INTO game_events (type, project_id, director_id, description, description_th, metadata)
       VALUES ('outcome_recorded', $1, $2, $3, $4, $5)`,
      [
        project_id,
        dbProject.director_id,
        `Outcome recorded for "${dbProject.name}". Score: ${report.actual.overallScore}/100.`,
        `บันทึกผลลัพธ์สำหรับ "${dbProject.name}" คะแนน: ${report.actual.overallScore}/100`,
        JSON.stringify({
          predicted: report.predicted.overallScore,
          actual: report.actual.overallScore,
          gap: report.actual.overallScore - report.predicted.overallScore,
          points: report.actual.deliveryPoints,
        }),
      ],
    );

    return apiJson({
      ok: true,
      report: {
        ...report,
        playedAt: report.playedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[api/game/record-outcome] error:", error);
    return apiError("Failed to record outcome", 500);
  }
}
