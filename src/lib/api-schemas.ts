import { z } from "zod";
import { CURRENT_CYCLE } from "@/lib/cycle";

const MAX_TEXT = 500;
const MAX_LONG_TEXT = 4_000;

function optionalTrimmedString(max = MAX_TEXT) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(max).optional(),
  );
}

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toUpperCase());

const nameSchema = z.string().trim().min(1).max(MAX_TEXT);
const roleLevelSchema = z.enum([
  "md",
  "deputy_md",
  "director",
  "manager",
  "senior",
  "staff",
]);
const optionalCodeSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  codeSchema.optional(),
);

const boundedNumber = (min: number, max: number) =>
  z.coerce.number().finite().min(min).max(max);

const supportNoteSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().max(MAX_LONG_TEXT),
);
const supportTargetPillarSchema = z.enum([
  "compensation",
  "purpose",
  "career",
  "community",
  "belonging",
  "transcendence",
  "story",
]);

const jsonRecordSchema = z.record(z.string(), z.unknown());
const stringListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(50)
  .transform((values) => Array.from(new Set(values)));
const projectSlotsSchema = z
  .object({
    technical: boundedNumber(0, 50).optional(),
    sales: boundedNumber(0, 50).optional(),
    marketing: boundedNumber(0, 50).optional(),
    outsourcing: boundedNumber(0, 50).optional(),
    paperwork: boundedNumber(0, 50).optional(),
  })
  .partial();

export const chatPayloadSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "model", "system"]),
        content: z.string().trim().min(1).max(MAX_LONG_TEXT),
      }),
    )
    .max(24)
    .default([]),
});

export const importPayloadSchema = z.object({
  csvText: z.string().min(1).max(2_000_000),
});

export const employeeUpsertPayloadSchema = z.object({
  employees: z
    .array(
      z.object({
        employee_code: codeSchema,
        nickname: nameSchema,
        full_name_th: nameSchema,
        full_name_en: optionalTrimmedString(),
        email: optionalTrimmedString(320),
        dept_code: codeSchema,
        div_code: optionalCodeSchema,
        role_level: roleLevelSchema,
        title_th: optionalTrimmedString(),
        title_en: optionalTrimmedString(),
        level: boundedNumber(1, 20).optional(),
        tenure_years: boundedNumber(0, 60).optional(),
        salary_thb: boundedNumber(0, 10_000_000).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const projectPayloadSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  client_name: optionalTrimmedString(),
  description: optionalTrimmedString(MAX_LONG_TEXT),
  status: z.enum(["planning", "active", "completed", "on_hold"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  budget_thb: boundedNumber(0, 1_000_000_000).optional(),
  monthly_ceiling: boundedNumber(0, 1_000_000_000).optional(),
  gross_margin_pct: boundedNumber(-100, 100).optional(),
  required_skills: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  team_size: boundedNumber(1, 100).optional(),
  progress_pct: boundedNumber(0, 100).optional(),
  project_slots: projectSlotsSchema.optional(),
  start_date: optionalTrimmedString(32),
  end_date: optionalTrimmedString(32),
  dept_code: optionalCodeSchema,
  div_code: optionalCodeSchema,
});

export const employeePatchPayloadSchema = z.object({
  id: z.string().uuid(),
  employee_code: optionalCodeSchema,
  nickname: optionalTrimmedString(),
  full_name_th: optionalTrimmedString(),
  full_name_en: optionalTrimmedString(),
  email: optionalTrimmedString(320),
  dept_code: optionalCodeSchema,
  div_code: optionalCodeSchema,
  role_level: roleLevelSchema.optional(),
  title_th: optionalTrimmedString(),
  title_en: optionalTrimmedString(),
  level: boundedNumber(1, 20).optional(),
  tenure_years: boundedNumber(0, 60).optional(),
  salary_thb: boundedNumber(0, 10_000_000).optional(),
  hr_notes: optionalTrimmedString(MAX_LONG_TEXT),
  skills: z
    .array(z.string().trim().min(1).max(64))
    .max(40)
    .transform((values) => Array.from(new Set(values)))
    .optional(),
  attributes: z
    .object({
      str: boundedNumber(1, 20).optional(),
      int: boundedNumber(1, 20).optional(),
      wis: boundedNumber(1, 20).optional(),
      cha: boundedNumber(1, 20).optional(),
      dex: boundedNumber(1, 20).optional(),
      con: boundedNumber(1, 20).optional(),
      rpg_class: optionalTrimmedString(),
      notes: optionalTrimmedString(MAX_LONG_TEXT),
    })
    .optional(),
  profile: z
    .object({
      languages: stringListSchema.optional(),
      certifications: stringListSchema.optional(),
      soft_skills: stringListSchema.optional(),
      external_refs: jsonRecordSchema.optional(),
    })
    .optional(),
});

export const teamSavePayloadSchema = z.object({
  project_code: codeSchema,
  coach_code: optionalCodeSchema.nullable(),
  coach_id: z.string().uuid().nullable().optional(),
  player_codes: z
    .array(codeSchema)
    .max(32)
    .transform((values) => Array.from(new Set(values))),
  player_ids: z
    .array(z.string().uuid())
    .max(32)
    .transform((values) => Array.from(new Set(values)))
    .optional(),
  formation: z.string().trim().min(1).max(64),
  selector_mode: optionalTrimmedString(64),
  fit_pct: boundedNumber(0, 100).nullable().optional(),
  chemistry_score: boundedNumber(0, 100).nullable().optional(),
  overall_score: boundedNumber(0, 100).nullable().optional(),
  insights: z.array(z.string().trim().min(1).max(MAX_TEXT)).max(20).optional(),
  allocation_pcts: z
    .record(
      z.string().uuid(),
      z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]),
    )
    .optional(),
});

export const projectPriorityWeightsSchema = z.object({
  project_code: codeSchema,
  priority_weights: z.object({
    captain: boundedNumber(0, 10),
    tech: boundedNumber(0, 10),
    sales: boundedNumber(0, 10),
    ops: boundedNumber(0, 10),
    scout: boundedNumber(0, 10),
  }),
});

export const gameValuesPayloadSchema = z.object({
  target_type: z.enum(["employee", "project", "all"]),
  target_id: z.string().uuid().optional(),
  action: z.enum(["seed", "adjust", "lock", "unlock"]),
  source: z.enum(["seed", "manual", "ai", "system"]).optional(),
  force: z.boolean().optional(),
  reason: z.string().trim().min(6).max(1_000),
  values: z
    .object({
      attributes: z
        .object({
          str: boundedNumber(1, 20).optional(),
          int: boundedNumber(1, 20).optional(),
          wis: boundedNumber(1, 20).optional(),
          cha: boundedNumber(1, 20).optional(),
          dex: boundedNumber(1, 20).optional(),
          con: boundedNumber(1, 20).optional(),
        })
        .optional(),
      project: z
        .object({
          complexity_score: boundedNumber(0, 100).optional(),
          urgency_score: boundedNumber(0, 100).optional(),
          strategic_value_score: boundedNumber(0, 100).optional(),
          delivery_risk_score: boundedNumber(0, 100).optional(),
          ai_leverage_score: boundedNumber(0, 100).optional(),
          project_slots: projectSlotsSchema.optional(),
        })
        .optional(),
    })
    .optional(),
});

export const supportActionTypeSchema = z.enum([
  "mentor_assigned",
  "fit_conversation",
  "load_review",
  "class_change_discussion",
  "skill_review",
  "growth_assignment",
  "succession_flag",
  "recognition",
]);

export const supportActionStatusSchema = z.enum([
  "planned",
  "in_progress",
  "done",
  "dropped",
]);

export const supportActionCreatePayloadSchema = z.object({
  employee_id: z.string().uuid(),
  cycle: z.string().trim().min(1).max(32).optional(),
  action_type: supportActionTypeSchema,
  target_pillar: supportTargetPillarSchema.nullable().optional(),
  title: nameSchema,
  note: supportNoteSchema.optional(),
  status: supportActionStatusSchema.optional(),
  owner_employee_id: z.string().uuid().nullable().optional(),
});

export const supportActionUpdatePayloadSchema = z.object({
  id: z.string().uuid(),
  title: nameSchema.optional(),
  note: supportNoteSchema.optional(),
  status: supportActionStatusSchema.optional(),
  target_pillar: supportTargetPillarSchema.nullable().optional(),
  owner_employee_id: z.string().uuid().nullable().optional(),
});

export const fourPillarResponsePayloadSchema = z.object({
  employee_id: z.string().uuid(),
  cycle: z.string().trim().min(1).max(32).default(CURRENT_CYCLE),
  compensation: boundedNumber(0, 100).default(50),
  purpose: boundedNumber(0, 100).default(50),
  career: boundedNumber(0, 100).default(50),
  community: boundedNumber(0, 100).default(50),
  source: z.enum(["self_report", "manager", "system", "ai_derived"]).default("self_report"),
});

export const credoResponsePayloadSchema = z.object({
  employee_id: z.string().uuid(),
  cycle: z.string().trim().min(1).max(32).default(CURRENT_CYCLE),
  belonging: boundedNumber(0, 100).default(50),
  purpose: boundedNumber(0, 100).default(50),
  transcendence: boundedNumber(0, 100).default(50),
  story: boundedNumber(0, 100).default(50),
  pulse_source: z.enum(["survey", "derived", "blended", "manager"]).default("survey"),
});

export const competencyStandardSchema = z.object({
  id: z.string().uuid().optional(),
  skill_key: codeSchema,
  display_name: nameSchema,
  framework_source: nameSchema,
  framework_id: optionalTrimmedString(128).nullable().optional(),
  category: optionalTrimmedString(64).optional(),
  descriptors: z.record(z.string(), z.string().max(MAX_TEXT)).optional(),
  weight: boundedNumber(0.1, 5).optional(),
  recency_window_days: boundedNumber(30, 1825).optional(),
  expected_level: boundedNumber(1, 5).optional(),
  evidence_policy: optionalTrimmedString(64).optional(),
  linked_dimensions: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
  active: z.boolean().optional(),
  external_refs: jsonRecordSchema.optional(),
  sort_order: boundedNumber(0, 999).optional(),
});

export const competencyStandardsPayloadSchema = z.object({
  standards: z.array(competencyStandardSchema).min(1).max(50),
});

export const allocationItemSchema = z.object({
  employee_id: z.string().uuid(),
  fte: z.coerce.number().finite().min(0.05).max(1.5),
  assignment_label: optionalTrimmedString(160),
  slot_key: optionalTrimmedString(64),
  coe_name: optionalTrimmedString(120),
  start_date: optionalTrimmedString(32),
  end_date: optionalTrimmedString(32),
  external_id: optionalTrimmedString(160),
  metadata: jsonRecordSchema.optional(),
});

export const allocationsPayloadSchema = z.object({
  mode: z.enum(["append", "replace"]).optional(),
  scope: z.enum(["project", "quest", "matrix"]).optional(),
  project_code: optionalCodeSchema,
  quest_code: optionalCodeSchema,
  quest_id: z.string().uuid().optional(),
  coe_name: optionalTrimmedString(120),
  planned_or_actual: z.enum(["planned", "actual"]).optional(),
  status: z.enum(["planned", "active", "completed", "paused", "cancelled"]).optional(),
  source: optionalTrimmedString(64),
  allocations: z.array(allocationItemSchema).min(1).max(250),
});

export const allocationPatchPayloadSchema = z.object({
  id: z.string().uuid(),
  fte: z.coerce.number().finite().min(0.05).max(1.5).optional(),
  planned_or_actual: z.enum(["planned", "actual"]).optional(),
  status: z.enum(["planned", "active", "completed", "paused", "cancelled"]).optional(),
  start_date: optionalTrimmedString(32),
  end_date: optionalTrimmedString(32),
  assignment_label: optionalTrimmedString(160),
  metadata: jsonRecordSchema.optional(),
});

// ─── Check-ins (Chronicle ritual) ─────────────────────────────────────────

/** Six attributes in canonical order (matches DB columns + lore ATTRS). */
export const attrKeySchema = z.enum(["str", "int", "wis", "cha", "dex", "con"]);

/** Narrative is soft-capped at 4k to match MAX_LONG_TEXT and check_ins.narrative. */
export const checkInDraftSchema = z.object({
  employee_id: z.string().uuid(),
  narrative: z.string().trim().min(10).max(MAX_LONG_TEXT),
  cycle: z.string().trim().min(1).max(32),
  manager_id: z.string().uuid().nullable().optional(),
});

/** One proposed attribute delta; integer in -3..+3, matches lore band. */
export const attrDeltaSchema = z.object({
  attr: attrKeySchema,
  delta: z.coerce.number().int().min(-3).max(3),
});

export const checkInApproveSchema = z.object({
  check_in_id: z.string().uuid(),
  approved_deltas: z.array(attrDeltaSchema).max(6),
  notes: optionalTrimmedString(MAX_LONG_TEXT),
});

export const lobbyInteractionSchema = z.object({
  initiator_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  interaction_type: z.enum(["chat", "collab", "clash"]).default("chat"),
  note: z.string().optional(),
});
