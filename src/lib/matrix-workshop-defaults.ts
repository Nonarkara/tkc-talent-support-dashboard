interface EmployeeFacetSeedInput {
  dept_code?: string | null;
  role_level?: string | null;
}

export const DEFAULT_COMPETENCY_STANDARDS = [
  {
    skill_key: "technical",
    display_name: "Technical Delivery",
    framework_source: "Aisha Core",
    framework_id: "AISHA-TECH-01",
    category: "skill",
    descriptors: {
      "1": "Can support guided tasks.",
      "2": "Can deliver small work items.",
      "3": "Can independently deliver scoped modules.",
      "4": "Can architect and debug across systems.",
      "5": "Sets technical standards for others.",
    },
    weight: 1.3,
    recency_window_days: 540,
    expected_level: 4,
    evidence_policy: "recent_best",
    linked_dimensions: ["technical"],
    active: true,
    external_refs: {},
    sort_order: 10,
  },
  {
    skill_key: "sales",
    display_name: "Sales Leadership",
    framework_source: "Aisha Core",
    framework_id: "AISHA-SALES-01",
    category: "skill",
    descriptors: {
      "1": "Can assist in pitches.",
      "2": "Can present prepared offers.",
      "3": "Can own client conversations.",
      "4": "Can lead pursuit strategy.",
      "5": "Opens new revenue paths.",
    },
    weight: 1.2,
    recency_window_days: 540,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["sales", "marketing"],
    active: true,
    external_refs: {},
    sort_order: 20,
  },
  {
    skill_key: "procurement",
    display_name: "Procurement Control",
    framework_source: "Aisha Core",
    framework_id: "AISHA-PROC-01",
    category: "skill",
    descriptors: {
      "1": "Understands vendor paperwork.",
      "2": "Can compare quotations.",
      "3": "Can run standard sourcing.",
      "4": "Can negotiate and manage vendor risk.",
      "5": "Shapes procurement policy.",
    },
    weight: 1,
    recency_window_days: 720,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["outsourcing", "paperwork"],
    active: true,
    external_refs: {},
    sort_order: 30,
  },
  {
    skill_key: "survey",
    display_name: "Field Survey & Discovery",
    framework_source: "Aisha Core",
    framework_id: "AISHA-SURV-01",
    category: "skill",
    descriptors: {
      "1": "Can collect guided observations.",
      "2": "Can execute simple survey plans.",
      "3": "Can run interviews and field discovery.",
      "4": "Turns findings into action models.",
      "5": "Designs discovery programs across projects.",
    },
    weight: 0.95,
    recency_window_days: 540,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["technical", "outsourcing"],
    active: true,
    external_refs: {},
    sort_order: 40,
  },
  {
    skill_key: "outsourcing_mgmt",
    display_name: "Partner Orchestration",
    framework_source: "Aisha Core",
    framework_id: "AISHA-OUT-01",
    category: "skill",
    descriptors: {
      "1": "Can track vendor tasks.",
      "2": "Can coordinate routine partner work.",
      "3": "Can manage external delivery streams.",
      "4": "Can recover slipping partner commitments.",
      "5": "Builds scalable partner operating models.",
    },
    weight: 1.05,
    recency_window_days: 720,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["outsourcing"],
    active: true,
    external_refs: {},
    sort_order: 50,
  },
  {
    skill_key: "delivery_ops",
    display_name: "Delivery Operations",
    framework_source: "Aisha Core",
    framework_id: "AISHA-DEL-01",
    category: "skill",
    descriptors: {
      "1": "Understands delivery rituals.",
      "2": "Can track status and blockers.",
      "3": "Can coordinate delivery to deadline.",
      "4": "Can run complex cross-team execution.",
      "5": "Designs delivery systems that scale.",
    },
    weight: 1.15,
    recency_window_days: 540,
    expected_level: 4,
    evidence_policy: "recent_best",
    linked_dimensions: ["technical", "outsourcing", "paperwork"],
    active: true,
    external_refs: {},
    sort_order: 60,
  },
  {
    skill_key: "finance_paperwork",
    display_name: "Finance & Controls",
    framework_source: "Aisha Core",
    framework_id: "AISHA-FIN-01",
    category: "skill",
    descriptors: {
      "1": "Can support document preparation.",
      "2": "Can complete standard finance paperwork.",
      "3": "Can run project controls and compliance.",
      "4": "Can forecast and challenge commercial drift.",
      "5": "Shapes commercial governance.",
    },
    weight: 1.1,
    recency_window_days: 720,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["paperwork"],
    active: true,
    external_refs: {},
    sort_order: 70,
  },
  {
    skill_key: "marketing",
    display_name: "Narrative & Positioning",
    framework_source: "Aisha Core",
    framework_id: "AISHA-MKT-01",
    category: "skill",
    descriptors: {
      "1": "Can support content production.",
      "2": "Can adapt core messages.",
      "3": "Can position offers for target buyers.",
      "4": "Can shape go-to-market narrative.",
      "5": "Sets category story for the business.",
    },
    weight: 0.85,
    recency_window_days: 720,
    expected_level: 2,
    evidence_policy: "recent_best",
    linked_dimensions: ["marketing", "sales"],
    active: true,
    external_refs: {},
    sort_order: 80,
  },
  {
    skill_key: "customer_success",
    display_name: "Customer Success",
    framework_source: "Aisha Core",
    framework_id: "AISHA-CS-01",
    category: "skill",
    descriptors: {
      "1": "Can respond to routine client needs.",
      "2": "Can maintain working client trust.",
      "3": "Can steer ongoing value conversations.",
      "4": "Can recover fragile accounts.",
      "5": "Turns accounts into long-term growth.",
    },
    weight: 1.05,
    recency_window_days: 540,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["sales", "marketing"],
    active: true,
    external_refs: {},
    sort_order: 90,
  },
  {
    skill_key: "data_analysis",
    display_name: "Data Analysis",
    framework_source: "Aisha Core",
    framework_id: "AISHA-DATA-01",
    category: "skill",
    descriptors: {
      "1": "Can read basic reports.",
      "2": "Can clean and inspect structured data.",
      "3": "Can produce decision-grade analysis.",
      "4": "Can model patterns and tradeoffs.",
      "5": "Defines analytical standards and interpretation.",
    },
    weight: 1.1,
    recency_window_days: 540,
    expected_level: 3,
    evidence_policy: "recent_best",
    linked_dimensions: ["technical", "paperwork"],
    active: true,
    external_refs: {},
    sort_order: 100,
  },
];

export function inferProfileFacets(employee: EmployeeFacetSeedInput) {
  const deptCode = employee.dept_code ?? "";
  const roleLevel = employee.role_level ?? "";
  const leadershipRoles = new Set(["manager", "director", "deputy_md", "md"]);
  const commercialDepts = new Set(["SALES", "BIZ_DEV", "ENTERPRISE"]);
  const technicalDepts = new Set(["DIGITAL", "IT", "NET_DEL", "ENTERPRISE"]);
  const financeDepts = new Set(["FINANCE", "ACCT"]);
  const procurementDepts = new Set(["PROCURE", "CORP_ADM"]);

  return {
    languages:
      leadershipRoles.has(roleLevel) || commercialDepts.has(deptCode)
        ? ["Thai", "English"]
        : ["Thai"],
    certifications: technicalDepts.has(deptCode)
      ? ["Cloud Foundations"]
      : financeDepts.has(deptCode)
        ? ["Financial Controls"]
        : procurementDepts.has(deptCode)
          ? ["Vendor Compliance"]
          : [],
    soft_skills: roleLevel === "manager"
      ? ["Coaching", "Coordination"]
      : leadershipRoles.has(roleLevel)
        ? ["Leadership", "Stakeholder Alignment"]
        : ["Collaboration"],
  };
}
