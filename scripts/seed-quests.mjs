/**
 * Seed ~12 realistic TKC quests for cycle 2026-Q2.
 * Drawn from the April 17 Digital Product meeting + FY2025 KPI targets.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, "../.env.local"), "utf-8");
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const sql = neon(url);

const CYCLE = "2026-Q2";

// Standard slot kit — mix per quest
const SLOT = {
  captain:    { key: "captain",    label: "Captain",       priority_dims: ["cha", "wis"],       min_score: 70 },
  architect:  { key: "architect",  label: "Architect",     priority_dims: ["int", "wis"],       min_score: 70 },
  dev_lead:   { key: "dev_lead",   label: "Dev Lead",      priority_dims: ["int", "delivery"],  min_score: 70 },
  dev_a:      { key: "dev_a",      label: "Dev",           priority_dims: ["int", "dex"],       min_score: 60 },
  dev_b:      { key: "dev_b",      label: "Dev",           priority_dims: ["int", "dex"],       min_score: 60 },
  qa:         { key: "qa",         label: "QA",            priority_dims: ["con", "wis"],       min_score: 60 },
  ux:         { key: "ux",         label: "UX/UI",         priority_dims: ["cha", "dex"],       min_score: 65 },
  sales_ae:   { key: "sales_ae",   label: "Sales AE",      priority_dims: ["cha", "str"],       min_score: 70 },
  success:    { key: "success",    label: "Customer Success", priority_dims: ["cha", "community"], min_score: 70 },
  ops:        { key: "ops",        label: "Ops",           priority_dims: ["con", "dex"],       min_score: 60 },
  data:       { key: "data",       label: "Data / Analyst",priority_dims: ["int", "wis"],       min_score: 65 },
  security:   { key: "security",   label: "Security",      priority_dims: ["int", "con"],       min_score: 70 },
  pm:         { key: "pm",         label: "PM",            priority_dims: ["cha", "delivery"],  min_score: 70 },
};

const QUESTS = [
  {
    code: "SMART_CITY_SAAS_26Q2",
    title: "Smart City SaaS — Tambon Pilot",
    description: "Pilot SaaS platform for 5 pilot อบต./เทศบาล. Move beyond IaaS into data-driven city ops. Target: 5 signed LOIs by end Q2.",
    dept_code: "ENTERPRISE",
    revenue_m: 45.0,
    target_date: "2026-06-30",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_lead, SLOT.dev_a, SLOT.dev_b, SLOT.ux, SLOT.success, SLOT.pm],
  },
  {
    code: "DC_EXPANSION_5SYS",
    title: "Data Center Expansion 3→5",
    description: "Add Public Cloud + SOC layers to existing 3-system DC. Supports Smart City data-sovereignty play.",
    dept_code: "NET_DEL",
    revenue_m: 80.0,
    target_date: "2026-09-30",
    slots: [SLOT.captain, SLOT.architect, SLOT.security, SLOT.ops, SLOT.qa, SLOT.pm],
  },
  {
    code: "DEVSECOPS_TRANSITION",
    title: "DevOps → DevSecOps",
    description: "Shift Digital Product pipeline from DevOps to DevSecOps. ISO 27001 alignment. Mandatory for public-sector bids.",
    dept_code: "DIGITAL",
    revenue_m: null,
    target_date: "2026-07-31",
    slots: [SLOT.captain, SLOT.security, SLOT.dev_lead, SLOT.dev_a, SLOT.qa],
  },
  {
    code: "E_TAX_SERVICE_LAUNCH",
    title: "e-Tax / e-Receipt Service Provider",
    description: "Become a Revenue Dept certified e-Tax service provider. Tap into mandatory digital-invoice market.",
    dept_code: "DIGITAL",
    revenue_m: 60.0,
    target_date: "2026-12-31",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_lead, SLOT.dev_a, SLOT.security, SLOT.sales_ae, SLOT.pm],
  },
  {
    code: "CUSTOMER_SUCCESS_STANDUP",
    title: "Customer Success Team Stand-up",
    description: "Build CS team from scratch: onboarding → retention → expansion motion. Close the post-sale gap.",
    dept_code: "SALES",
    revenue_m: 25.0,
    target_date: "2026-06-30",
    slots: [SLOT.captain, SLOT.success, SLOT.data, SLOT.ops],
  },
  {
    code: "NINJA_TEAM_FORMATION",
    title: "Ninja Team — Anti-Disruption Squad",
    description: "Pick 20–30 high-potential staff across depts. Prototypes + cross-silo quests with Dr. Non.",
    dept_code: "EXEC",
    revenue_m: null,
    target_date: "2026-05-31",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_lead, SLOT.ux, SLOT.data, SLOT.pm],
  },
  {
    code: "PROMPOST_TRUST_V2",
    title: "PromPost Trust Service v2",
    description: "Next version of Digital Postbox + e-Signature with Thailand Post JV. Add certificate lifecycle UX.",
    dept_code: "DIGITAL",
    revenue_m: 55.0,
    target_date: "2026-09-30",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_lead, SLOT.dev_a, SLOT.ux, SLOT.qa, SLOT.pm],
  },
  {
    code: "THAI_CA_WEBTRUST_RENEW",
    title: "Thai CA WebTrust Renewal",
    description: "Annual WebTrust + ETDA audit. Non-negotiable — CA license depends on it.",
    dept_code: "DIGITAL",
    revenue_m: null,
    target_date: "2026-08-31",
    slots: [SLOT.captain, SLOT.security, SLOT.qa, SLOT.ops],
  },
  {
    code: "DID_6DIGIT_NATIONAL",
    title: "D.I.D. 6-Digit National Rollout",
    description: "Scale Delivery ID from book-fair pilot to national postal + e-commerce integrations.",
    dept_code: "DIGITAL",
    revenue_m: 30.0,
    target_date: "2026-10-31",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_a, SLOT.sales_ae, SLOT.pm],
  },
  {
    code: "NETWORK_Q2_REVENUE_670",
    title: "Network Delivery Q2 Revenue ฿670M",
    description: "Hit FY2025 Network Delivery revenue target. Currently tracking behind. KPI weight 40%.",
    dept_code: "NET_DEL",
    revenue_m: 670.0,
    target_date: "2026-06-30",
    slots: [SLOT.captain, SLOT.sales_ae, SLOT.success, SLOT.ops, SLOT.pm],
  },
  {
    code: "PUB_SAFETY_CCTV_PROV",
    title: "Provincial CCTV Command Center",
    description: "Public Safety Gov bid — multi-province CCTV + AI analytics command center.",
    dept_code: "PUB_SAFETY",
    revenue_m: 180.0,
    target_date: "2026-11-30",
    slots: [SLOT.captain, SLOT.architect, SLOT.dev_lead, SLOT.data, SLOT.ops, SLOT.sales_ae],
  },
  {
    code: "HR_TALENT_OS_BUILD",
    title: "Talent OS — HR Gamification Platform",
    description: "Ship this dashboard itself. Ninja Team prototype + HR&GA adoption. The meta-quest.",
    dept_code: "HR_ADMIN",
    revenue_m: null,
    target_date: "2026-06-30",
    slots: [SLOT.captain, SLOT.dev_lead, SLOT.ux, SLOT.data, SLOT.pm],
  },
];

async function main() {
  for (const q of QUESTS) {
    await sql`
      INSERT INTO quests (code, title, description, cycle, dept_code, revenue_m, target_date, role_slots, status)
      VALUES (${q.code}, ${q.title}, ${q.description}, ${CYCLE}, ${q.dept_code},
              ${q.revenue_m}, ${q.target_date}, ${JSON.stringify(q.slots)}::jsonb, 'active')
      ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        dept_code = EXCLUDED.dept_code,
        revenue_m = EXCLUDED.revenue_m,
        target_date = EXCLUDED.target_date,
        role_slots = EXCLUDED.role_slots,
        updated_at = now()
    `;
    console.log(`  ✓ ${q.code}`);
  }
  console.log(`\n✅ seeded ${QUESTS.length} quests`);
}

main().catch(e => { console.error(e); process.exit(1); });
