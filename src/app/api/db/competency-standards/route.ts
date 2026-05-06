import { apiError, apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { competencyStandardsPayloadSchema } from "@/lib/api-schemas";
import { isDbConfigured, query } from "@/lib/db";
import { DEFAULT_COMPETENCY_STANDARDS } from "@/lib/matrix-workshop-defaults";

interface StandardRow {
  id: string;
  skill_key: string;
  display_name: string;
  framework_source: string;
  framework_id: string | null;
  category: string | null;
  descriptors: Record<string, string> | null;
  weight: number | null;
  recency_window_days: number | null;
  expected_level: number | null;
  evidence_policy: string | null;
  linked_dimensions: string[] | null;
  active: boolean;
  external_refs: Record<string, unknown> | null;
  sort_order: number | null;
  updated_at: string | null;
}

export async function GET() {
  if (!isDbConfigured()) {
    return apiJson({ error: "Database not configured", standards: DEFAULT_COMPETENCY_STANDARDS }, { status: 503 });
  }

  try {
    const standards = await query<StandardRow>(
      `SELECT
         id, skill_key, display_name, framework_source, framework_id, category,
         descriptors, weight, recency_window_days, expected_level,
         evidence_policy, linked_dimensions, active, external_refs,
         sort_order, updated_at
       FROM competency_standards
       WHERE active = true
       ORDER BY sort_order, display_name`,
    );
    const resolvedStandards = standards.length > 0 ? standards : DEFAULT_COMPETENCY_STANDARDS;
    return apiJson({ standards: resolvedStandards, count: resolvedStandards.length });
  } catch (error) {
    logApiError("api/db/competency-standards GET error", error);
    return apiJson({
      error: "Failed to fetch standards from database; using workshop defaults",
      standards: DEFAULT_COMPETENCY_STANDARDS,
      count: DEFAULT_COMPETENCY_STANDARDS.length,
    });
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) return apiError("Database not configured", 503);

  const parsed = await parseJsonBody(request, competencyStandardsPayloadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    for (const standard of parsed.data.standards) {
      await query(
        `INSERT INTO competency_standards (
           id, skill_key, display_name, framework_source, framework_id, category,
           descriptors, weight, recency_window_days, expected_level, evidence_policy,
           linked_dimensions, active, external_refs, sort_order
         )
         VALUES (
           COALESCE($1::uuid, gen_random_uuid()),
           $2, $3, $4, $5, $6,
           $7::jsonb, $8, $9, $10, $11,
           $12::text[], COALESCE($13, true), $14::jsonb, $15
         )
         ON CONFLICT (skill_key, framework_source) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           framework_id = EXCLUDED.framework_id,
           category = EXCLUDED.category,
           descriptors = EXCLUDED.descriptors,
           weight = EXCLUDED.weight,
           recency_window_days = EXCLUDED.recency_window_days,
           expected_level = EXCLUDED.expected_level,
           evidence_policy = EXCLUDED.evidence_policy,
           linked_dimensions = EXCLUDED.linked_dimensions,
           active = EXCLUDED.active,
           external_refs = EXCLUDED.external_refs,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
        [
          standard.id ?? null,
          standard.skill_key,
          standard.display_name,
          standard.framework_source,
          standard.framework_id ?? null,
          standard.category ?? "skill",
          JSON.stringify(standard.descriptors ?? {}),
          standard.weight ?? 1,
          standard.recency_window_days ?? 540,
          standard.expected_level ?? 3,
          standard.evidence_policy ?? "recent_best",
          standard.linked_dimensions ?? [],
          standard.active ?? true,
          JSON.stringify(standard.external_refs ?? {}),
          standard.sort_order ?? 0,
        ],
      );
    }

    const rows = await query<StandardRow>(
      `SELECT
         id, skill_key, display_name, framework_source, framework_id, category,
         descriptors, weight, recency_window_days, expected_level,
         evidence_policy, linked_dimensions, active, external_refs,
         sort_order, updated_at
       FROM competency_standards
       WHERE active = true
       ORDER BY sort_order, display_name`,
    );

    return apiJson({ ok: true, standards: rows, count: rows.length });
  } catch (error) {
    logApiError("api/db/competency-standards PUT error", error);
    return apiError("Failed to save standards", 500);
  }
}
